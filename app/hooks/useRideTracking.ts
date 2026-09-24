import { useRef, useState } from "react";
import { AnimatedRegion } from "react-native-maps";
import MapView from "react-native-maps";

type Coord = { latitude: number; longitude: number };

export function useRideTracking() {
  const activeMapRef = useRef<MapView>(null);
  const lastFitTimeRef = useRef<number>(0);

  const [rideStarted, setRideStarted] = useState(false);
  const rideStartedRef = useRef<boolean>(false);

  const [trajectory, setTrajectory] = useState<Coord[]>([]);
  const trajectoryFullRef = useRef<Coord[]>([]);

  const [routeToDriver, setRouteToDriver] = useState<Coord[]>([]);
  const routeToDriverRef = useRef<Coord[]>([]);

  const activeRideDriverAnimRegionRef = useRef<AnimatedRegion | null>(null);

  const hasNotifiedArrivalRef = useRef<boolean>(false);
  const hasAnimatedTrajectoryRef = useRef<boolean>(false);
  const prevTrajLengthRef = useRef<number>(0);
  const prevRouteLengthRef = useRef<number>(0);

  const [displayedRoute, setDisplayedRoute] = useState<Coord[]>([]);
  const [displayedTrajectory, setDisplayedTrajectory] = useState<Coord[]>([]);
  const routeAnimIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trajAnimIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [driverETA, setDriverETA] = useState<string | null>(null);
  const etaCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const etaRemainingSecsRef = useRef<number>(0);

  const fitActiveMap = (coords: Coord[]) => {
    if (coords.length < 2) return;
    const now = Date.now();
    if (now - lastFitTimeRef.current < 5000) return;
    lastFitTimeRef.current = now;
    activeMapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 180, left: 60 },
      animated: true,
    });
  };

  const animatePolyline = (
    coords: Coord[],
    setDisplayed: React.Dispatch<React.SetStateAction<Coord[]>>,
    intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (coords.length < 2) return;
    const total = coords.length;
    const duration = 1200;
    const steps = Math.min(total, 60);
    const pointsPerStep = Math.ceil(total / steps);
    const intervalMs = Math.round(duration / steps);
    let index = 2;
    setDisplayed(coords.slice(0, 2));
    intervalRef.current = setInterval(() => {
      index += pointsPerStep;
      if (index >= total) {
        setDisplayed(coords);
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      } else {
        setDisplayed(coords.slice(0, index));
      }
    }, intervalMs);
  };

  const startETACountdown = (totalSecs: number) => {
    if (etaCountdownRef.current) clearInterval(etaCountdownRef.current);
    etaRemainingSecsRef.current = totalSecs;
    // Affichage initial immédiat
    const initMins = Math.ceil(totalSecs / 60);
    setDriverETA(initMins <= 1 ? "< 1 min" : `${initMins} min`);
    etaCountdownRef.current = setInterval(() => {
      etaRemainingSecsRef.current = Math.max(0, etaRemainingSecsRef.current - 1);
      const mins = Math.ceil(etaRemainingSecsRef.current / 60);
      const prevMins = Math.ceil((etaRemainingSecsRef.current + 1) / 60);
      // setState uniquement quand la minute affichée change — évite 59 re-renders inutiles par minute
      if (mins !== prevMins) {
        setDriverETA(mins <= 1 ? "< 1 min" : `${mins} min`);
      }
      if (etaRemainingSecsRef.current <= 0) {
        clearInterval(etaCountdownRef.current!);
        etaCountdownRef.current = null;
      }
    }, 1000);
  };

  return {
    activeMapRef, lastFitTimeRef,
    rideStarted, setRideStarted, rideStartedRef,
    trajectory, setTrajectory, trajectoryFullRef,
    routeToDriver, setRouteToDriver, routeToDriverRef,
    activeRideDriverAnimRegionRef,
    hasNotifiedArrivalRef, hasAnimatedTrajectoryRef,
    prevTrajLengthRef, prevRouteLengthRef,
    displayedRoute, setDisplayedRoute,
    displayedTrajectory, setDisplayedTrajectory,
    routeAnimIntervalRef, trajAnimIntervalRef,
    driverETA, setDriverETA,
    etaCountdownRef, etaRemainingSecsRef,
    fitActiveMap, animatePolyline, startETACountdown,
  };
}
