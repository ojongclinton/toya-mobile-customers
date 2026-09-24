import { useRef, useState, useEffect } from "react";
import { Animated, Platform } from "react-native";
import { AnimatedRegion } from "react-native-maps";
import polyline from "@mapbox/polyline";
import authFetch from "../../constants/api/authFetch";
import type { AvailableDriver } from "../types/ride";
import { haversineDistanceM, calculateBearing, projectPoint, interpolateRoad } from "../utils/geo";

type Coord2D = { lat: number; lon: number };

type Props = {
  isMountedRef: React.MutableRefObject<boolean>;
  lastGPSPositionRef: React.MutableRefObject<Coord2D | null>;
  setAvailableDrivers: React.Dispatch<React.SetStateAction<AvailableDriver[]>>;
  googleApiKey: string;
};

export function useDriverAnimation({ isMountedRef, lastGPSPositionRef, setAvailableDrivers, googleApiKey }: Props) {
  const [trackDriverViews, setTrackDriverViews] = useState(true);

  const animatedRegionsRef = useRef<Map<string, AnimatedRegion>>(new Map());
  const headingAnimValuesRef = useRef<Map<string, Animated.Value>>(new Map());
  const driverAnimationIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const lastSnappedPositionsRef = useRef<Map<string, Coord2D>>(new Map());
  const lastHeadingRef = useRef<Map<string, number>>(new Map());
  const lastDistKmRef = useRef<Map<string, number>>(new Map());
  const driverRoadCacheRef = useRef<Map<string, Coord2D[]>>(new Map());
  const driverRoadOffsetRef = useRef<Map<string, number>>(new Map());   // D — avancement sur la route cachée
  const driverLastRoadRef = useRef<Map<string, Coord2D[]>>(new Map());  // D — route en cours (détecte un changement → reset offset)
  const driverRoadTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());
  const driverAnimatingRef = useRef<Set<string>>(new Set());
  const driverOpacityRef = useRef<Map<string, Animated.Value>>(new Map());
  const postAnimationCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadedOutDriversRef = useRef<Set<string>>(new Set());
  const driverAnimationDoneRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      animatedRegionsRef.current.clear();
      headingAnimValuesRef.current.clear();
      driverAnimationIntervalsRef.current.forEach((interval) => clearInterval(interval));
      driverAnimationIntervalsRef.current.clear();
      driverRoadTimersRef.current.forEach(t => t.forEach(clearTimeout));
      driverRoadTimersRef.current.clear();
      if (postAnimationCheckRef.current) clearTimeout(postAnimationCheckRef.current);
    };
  }, []);

  const fetchWithTimeout = (url: string, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
      .then(res => { clearTimeout(timeoutId); return res; })
      .catch(err => { clearTimeout(timeoutId); throw err; });
  };

  // D — distance restante (m) sur une route à partir de l'index courant.
  const roadRemainingDistM = (road: Coord2D[], fromIdx: number): number => {
    let s = 0;
    for (let i = Math.max(1, fromIdx + 1); i < road.length; i++) {
      s += haversineDistanceM(road[i - 1].lat, road[i - 1].lon, road[i].lat, road[i].lon);
    }
    return s;
  };

  const fetchRoadSegmentForDriver = async (lat: number, lon: number, bearing: number): Promise<Coord2D[] | null> => {
    const dest = projectPoint(lat, lon, bearing, 11000);

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lon}&destination=${dest.lat},${dest.lon}&mode=driving&key=${googleApiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "X-Android-Package": "com.toya.clientapp",
          "X-Android-Cert": "32912FFD43734CF103FECA672752EB7B969FF128",
          "X-Ios-Bundle-Identifier": "com.toya.clientapp",
          "X-Ios-Cert": "32912FFD43734CF103FECA672752EB7B969FF128",
        },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.routes?.[0]?.overview_polyline?.points) {
          const coords = polyline.decode(data.routes[0].overview_polyline.points) as [number, number][];
          return coords.map(([lt, ln]) => ({ lat: lt, lon: ln }));
        }
      }
    } catch (_) {}

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${dest.lon},${dest.lat}?overview=full&geometries=polyline`;
      const res = await fetchWithTimeout(url, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
          const coords = polyline.decode(data.routes[0].geometry) as [number, number][];
          return coords.map(([lt, ln]) => ({ lat: lt, lon: ln }));
        }
      }
    } catch (_) {}

    return null;
  };

  const MAX_SNAP_M = 50;
  const SNAP_MOVE_THRESHOLD_M = 20;
  const snapAllDriversToNearestRoads = async (drivers: AvailableDriver[]): Promise<AvailableDriver[]> => {
    if (drivers.length === 0) return drivers;

    // Ne re-snapper que les chauffeurs qui ont bougé de plus de 20m depuis le dernier snap
    const driversToSnap = drivers.filter(d => {
      const last = lastSnappedPositionsRef.current.get(d.driver_id);
      if (!last) return true;
      return haversineDistanceM(last.lat, last.lon, d.lat, d.lon) > SNAP_MOVE_THRESHOLD_M;
    });

    if (driversToSnap.length === 0) {
      return drivers.map(d => {
        const last = lastSnappedPositionsRef.current.get(d.driver_id);
        return last ? { ...d, lat: last.lat, lon: last.lon, _snapOk: true } : { ...d, _snapOk: false };
      });
    }

    try {
      const points = driversToSnap.map(d => `${d.lat},${d.lon}`).join("|");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const googleResponse = await fetch(
        `https://roads.googleapis.com/v1/nearestRoads?points=${points}&key=${googleApiKey}`,
        {
          signal: controller.signal,
          headers: {
            "X-Android-Package": "com.toya.clientapp",
            "X-Android-Cert": "32912FFD43734CF103FECA672752EB7B969FF128",
            "X-Ios-Bundle-Identifier": "com.toya.clientapp",
            "X-Ios-Cert": "32912FFD43734CF103FECA672752EB7B969FF128",
          },
        }
      );
      clearTimeout(timeoutId);
      const googleData = await googleResponse.json();

      if (googleData.snappedPoints && googleData.snappedPoints.length > 0) {
        // Construire un map des résultats snap (originalIndex → position snappée)
        const snapResultMap = new Map<number, { lat: number; lon: number }>();
        googleData.snappedPoints.forEach((snapped: any) => {
          const idx = snapped.originalIndex;
          if (idx === undefined || idx >= driversToSnap.length) return;
          const original = driversToSnap[idx];
          const distM = haversineDistanceM(original.lat, original.lon, snapped.location.latitude, snapped.location.longitude);
          if (distM <= MAX_SNAP_M) {
            snapResultMap.set(idx, { lat: snapped.location.latitude, lon: snapped.location.longitude });
          }
        });

        return drivers.map(d => {
          const snapIdx = driversToSnap.findIndex(s => s.driver_id === d.driver_id);
          if (snapIdx !== -1 && snapResultMap.has(snapIdx)) {
            const pos = snapResultMap.get(snapIdx)!;
            lastSnappedPositionsRef.current.set(d.driver_id, pos);
            return { ...d, lat: pos.lat, lon: pos.lon, _snapOk: true };
          }
          // Chauffeur non re-snappé (n'a pas bougé) → réutiliser position cachée
          const last = lastSnappedPositionsRef.current.get(d.driver_id);
          return last ? { ...d, lat: last.lat, lon: last.lon, _snapOk: true } : { ...d, _snapOk: false };
        });
      }
    } catch (_) {}

    // OSRM fallback: snap uniquement les chauffeurs qui ont bougé
    const osrmResults = await Promise.all(
      driversToSnap.map(async (d) => {
        try {
          const url = `https://router.project-osrm.org/nearest/v1/driving/${d.lon},${d.lat}`;
          const res = await fetchWithTimeout(url, 3000);
          if (!res.ok) return { id: d.driver_id, result: null };
          const data = await res.json();
          const wp = data?.waypoints?.[0];
          if (!wp) return { id: d.driver_id, result: null };
          const distM = haversineDistanceM(d.lat, d.lon, wp.location[1], wp.location[0]);
          if (distM <= MAX_SNAP_M) return { id: d.driver_id, result: { lat: wp.location[1], lon: wp.location[0] } };
        } catch (_) {}
        return { id: d.driver_id, result: null };
      })
    );
    const osrmMap = new Map(osrmResults.filter(r => r.result).map(r => [r.id, r.result!]));

    return drivers.map(d => {
      if (osrmMap.has(d.driver_id)) {
        const pos = osrmMap.get(d.driver_id)!;
        lastSnappedPositionsRef.current.set(d.driver_id, pos);
        return { ...d, lat: pos.lat, lon: pos.lon, _snapOk: true };
      }
      const last = lastSnappedPositionsRef.current.get(d.driver_id);
      return last ? { ...d, lat: last.lat, lon: last.lon, _snapOk: true } : { ...d, _snapOk: false };
    });
  };

  const animateDriverAlongRoad = (driverId: string, road: Coord2D[]) => {
    const animRegion = animatedRegionsRef.current.get(driverId);
    if (!animRegion || road.length < 2) return;
    if (driverAnimatingRef.current.has(driverId)) return;

    (driverRoadTimersRef.current.get(driverId) ?? []).forEach(clearTimeout);
    driverRoadTimersRef.current.set(driverId, []);

    const TARGET_DIST = 333;
    const TOTAL_MS = 60_000;

    // D — reprendre là où la voiture en est sur la route déjà achetée (offset), au lieu
    // de repartir du début à chaque cycle. Une route différente (autre objet) réinitialise.
    if (driverLastRoadRef.current.get(driverId) !== road) {
      driverLastRoadRef.current.set(driverId, road);
      driverRoadOffsetRef.current.set(driverId, 0);
    }
    const startIdx = Math.min(driverRoadOffsetRef.current.get(driverId) ?? 0, road.length - 2);

    let cumDist = 0;
    const waypoints: Coord2D[] = [];
    let i = startIdx + 1;
    for (; i < road.length; i++) {
      const d = haversineDistanceM(road[i-1].lat, road[i-1].lon, road[i].lat, road[i].lon);
      const remaining = TARGET_DIST - cumDist;
      if (d <= remaining) {
        waypoints.push(road[i]);
        cumDist += d;
        if (cumDist >= TARGET_DIST) { i++; break; }
      } else {
        const f = remaining / d;
        waypoints.push({ lat: road[i-1].lat + (road[i].lat - road[i-1].lat) * f, lon: road[i-1].lon + (road[i].lon - road[i-1].lon) * f });
        break;
      }
    }
    // Mémoriser l'avancement sur la route pour le prochain cycle.
    driverRoadOffsetRef.current.set(driverId, Math.min(i, road.length));
    if (waypoints.length === 0) return;

    const stepMs = TOTAL_MS / waypoints.length;
    driverAnimatingRef.current.add(driverId);
    const headingVal = headingAnimValuesRef.current.get(driverId);
    const prevPoints = [road[startIdx], ...waypoints.slice(0, -1)];

    const runStep = (index: number) => {
      if (!isMountedRef.current || index >= waypoints.length) {
        driverAnimatingRef.current.delete(driverId);
        driverAnimationDoneRef.current.add(driverId);
        if (postAnimationCheckRef.current) clearTimeout(postAnimationCheckRef.current);
        postAnimationCheckRef.current = setTimeout(() => {
          if (isMountedRef.current) checkDriversAfterAnimation();
        }, 60_000);
        return;
      }
      const from = prevPoints[index];
      const pt = waypoints[index];
      const segBearing = calculateBearing(from.lat, from.lon, pt.lat, pt.lon);
      headingVal?.setValue(segBearing);
      lastHeadingRef.current.set(driverId, segBearing);
      animRegion.timing({
        latitude: pt.lat, longitude: pt.lon,
        latitudeDelta: 0, longitudeDelta: 0,
        duration: stepMs,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) runStep(index + 1);
        else driverAnimatingRef.current.delete(driverId);
      });
    };

    runStep(0);
  };

  const animateDriverToPosition = (driverId: string, fromLat: number, fromLon: number, toLat: number, toLon: number) => {
    const distanceMeters = haversineDistanceM(fromLat, fromLon, toLat, toLon);
    const bearing = distanceMeters >= 3
      ? calculateBearing(fromLat, fromLon, toLat, toLon)
      : (lastHeadingRef.current.get(driverId) ?? 0);

    if (distanceMeters >= 3) lastHeadingRef.current.set(driverId, bearing);

    const headingVal = headingAnimValuesRef.current.get(driverId);
    if (headingVal && distanceMeters >= 3) headingVal.setValue(bearing);

    let animRegion = animatedRegionsRef.current.get(driverId);
    if (!animRegion) {
      animRegion = new AnimatedRegion({ latitude: fromLat, longitude: fromLon, latitudeDelta: 0, longitudeDelta: 0 });
      animatedRegionsRef.current.set(driverId, animRegion);
    }
    if (distanceMeters < 3) return;

    const projected = projectPoint(toLat, toLon, bearing, distanceMeters);
    animRegion.timing({
      latitude: projected.lat, longitude: projected.lon,
      latitudeDelta: 0, longitudeDelta: 0,
      duration: 9800,
      useNativeDriver: false,
    }).start();
  };

  const fadeOutDriver = (driverId: string) => {
    fadedOutDriversRef.current.add(driverId);
    const opacityVal = driverOpacityRef.current.get(driverId);
    const doRemove = () => {
      if (!isMountedRef.current) return;
      setAvailableDrivers(prev => prev.filter(d => d.driver_id !== driverId));
      driverOpacityRef.current.delete(driverId);
      animatedRegionsRef.current.delete(driverId);
      headingAnimValuesRef.current.delete(driverId);
      driverRoadCacheRef.current.delete(driverId);
      driverRoadOffsetRef.current.delete(driverId);
      driverLastRoadRef.current.delete(driverId);
      lastSnappedPositionsRef.current.delete(driverId);
      lastHeadingRef.current.delete(driverId);
      driverAnimatingRef.current.delete(driverId);
    };
    if (!opacityVal) { doRemove(); return; }
    Animated.timing(opacityVal, { toValue: 0, duration: 1500, useNativeDriver: false }).start(doRemove);
  };

  const clearAllDriverAnimations = () => {
    driverAnimationIntervalsRef.current.forEach((interval) => clearInterval(interval));
    driverAnimationIntervalsRef.current.clear();
    lastSnappedPositionsRef.current.clear();
    lastHeadingRef.current.clear();
    lastDistKmRef.current.clear();
    driverRoadCacheRef.current.clear();
    driverRoadOffsetRef.current.clear();
    driverLastRoadRef.current.clear();
    driverRoadTimersRef.current.forEach(t => t.forEach(clearTimeout));
    driverRoadTimersRef.current.clear();
    driverAnimatingRef.current.clear();
    driverAnimationDoneRef.current.clear();
    driverOpacityRef.current.clear();
    fadedOutDriversRef.current.clear();
    if (postAnimationCheckRef.current) { clearTimeout(postAnimationCheckRef.current); postAnimationCheckRef.current = null; }
    animatedRegionsRef.current.clear();
    headingAnimValuesRef.current.clear();
    setAvailableDrivers([]);
  };

  const checkDriversAfterAnimation = async () => {
    try {
      const gpsPos = lastGPSPositionRef.current;
      if (!gpsPos) return;
      const response = await authFetch(`/navigation/available-drivers?lat=${gpsPos.lat}&lon=${gpsPos.lon}&radius=20`);
      if (!response.ok) return;
      const data = await response.json();
      const apiDrivers: AvailableDriver[] = Array.isArray(data.Data) ? data.Data : [];
      const apiIds = new Set(apiDrivers.map(d => d.driver_id));

      const currentIds = [...animatedRegionsRef.current.keys()];
      currentIds.forEach(id => { if (!apiIds.has(id)) fadeOutDriver(id); });
      if (apiDrivers.length === 0) return;

      const snappedDrivers = await snapAllDriversToNearestRoads(apiDrivers);
      let hasNewPositions = false;

      snappedDrivers.forEach((snapped, idx) => {
        if (!snapped._snapOk) return;
        const lastPos = lastSnappedPositionsRef.current.get(snapped.driver_id);
        const distM = lastPos ? haversineDistanceM(lastPos.lat, lastPos.lon, snapped.lat, snapped.lon) : 999;
        const isFaded = fadedOutDriversRef.current.has(snapped.driver_id);

        if (distM > 15) {
          hasNewPositions = true;
          if (isFaded) {
            fadedOutDriversRef.current.delete(snapped.driver_id);
            const opVal = new Animated.Value(0);
            driverOpacityRef.current.set(snapped.driver_id, opVal);
            const animRegion = new AnimatedRegion({ latitude: snapped.lat, longitude: snapped.lon, latitudeDelta: 0, longitudeDelta: 0 });
            animatedRegionsRef.current.set(snapped.driver_id, animRegion);
            headingAnimValuesRef.current.set(snapped.driver_id, new Animated.Value(0));
            setTrackDriverViews(true);
            setAvailableDrivers(prev => prev.some(d => d.driver_id === snapped.driver_id) ? prev : [...prev, snapped]);
            setTimeout(() => setTrackDriverViews(false), 800);
            Animated.timing(opVal, { toValue: 1, duration: 800, useNativeDriver: false }).start();
            // Réapparition à une nouvelle position → route fraîche obligatoire.
            driverRoadCacheRef.current.delete(snapped.driver_id);
            driverRoadOffsetRef.current.delete(snapped.driver_id);
            driverLastRoadRef.current.delete(snapped.driver_id);
          }
          // (Voiture déjà visible : pas de téléportation — elle continue de glisser sur
          //  sa route Google ; le déplacement réel ne sert que de tick d'avancement.)
          lastSnappedPositionsRef.current.set(snapped.driver_id, { lat: snapped.lat, lon: snapped.lon });
          driverAnimatingRef.current.delete(snapped.driver_id);
          driverAnimationDoneRef.current.delete(snapped.driver_id);
          const bearing = lastPos ? calculateBearing(lastPos.lat, lastPos.lon, snapped.lat, snapped.lon) : (lastHeadingRef.current.get(snapped.driver_id) ?? 0);

          // D — réutiliser la route déjà achetée tant qu'il reste ≥ ~2 cycles (≈666 m) :
          // aucun appel Google. On ne rachète qu'à épuisement, depuis la fin de la route
          // actuelle (continuité on-street), sinon depuis la position courante.
          const cachedRoad = driverRoadCacheRef.current.get(snapped.driver_id);
          const usedOffset = driverRoadOffsetRef.current.get(snapped.driver_id) ?? 0;
          const enoughLeft = !!cachedRoad && roadRemainingDistM(cachedRoad, usedOffset) >= 2 * 333;

          if (cachedRoad && enoughLeft) {
            setTimeout(() => {
              if (isMountedRef.current) animateDriverAlongRoad(snapped.driver_id, cachedRoad);
            }, idx * 800);
          } else {
            const origin = cachedRoad && cachedRoad.length
              ? cachedRoad[cachedRoad.length - 1]
              : { lat: snapped.lat, lon: snapped.lon };
            setTimeout(() => {
              fetchRoadSegmentForDriver(origin.lat, origin.lon, bearing).then(road => {
                if (road && road.length >= 2) {
                  const smooth = interpolateRoad(road);
                  driverRoadCacheRef.current.set(snapped.driver_id, smooth);
                  animateDriverAlongRoad(snapped.driver_id, smooth);
                }
              });
            }, idx * 800);
          }
        }
      });

      if (!hasNewPositions) {
        const staticIds = [...animatedRegionsRef.current.keys()].filter(id =>
          !driverAnimatingRef.current.has(id) && apiIds.has(id) && !fadedOutDriversRef.current.has(id)
        );
        if (staticIds.length > 0) {
          const count = Math.min(staticIds.length, Math.floor(Math.random() * 3) + 1);
          const shuffled = staticIds.sort(() => Math.random() - 0.5);
          shuffled.slice(0, count).forEach(id => fadeOutDriver(id));
        }
      }
    } catch (_) {}
  };

  return {
    trackDriverViews, setTrackDriverViews,
    animatedRegionsRef, headingAnimValuesRef, driverOpacityRef,
    lastSnappedPositionsRef, lastHeadingRef, lastDistKmRef,
    driverRoadCacheRef, fadedOutDriversRef, driverAnimationDoneRef,
    driverAnimatingRef, driverRoadTimersRef, driverAnimationIntervalsRef,
    animateDriverAlongRoad, animateDriverToPosition,
    snapAllDriversToNearestRoads, fetchRoadSegmentForDriver,
    fadeOutDriver, clearAllDriverAnimations,
    checkDriversAfterAnimation,
  };
}
