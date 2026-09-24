export const haversineDistanceM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const calculateBearing = (fromLat: number, fromLon: number, toLat: number, toLon: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLon = toRad(toLon - fromLon);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

export const projectPoint = (lat: number, lon: number, bearingDeg: number, distanceM: number): { lat: number; lon: number } => {
  const R = 6371000;
  const d = distanceM / R;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
  const lon2 = lon1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
};

export const interpolateRoad = (road: { lat: number; lon: number }[], maxSegmentM = 15): { lat: number; lon: number }[] => {
  if (road.length < 2) return road;
  const result: { lat: number; lon: number }[] = [road[0]];
  for (let i = 1; i < road.length; i++) {
    const prev = road[i - 1];
    const curr = road[i];
    const d = haversineDistanceM(prev.lat, prev.lon, curr.lat, curr.lon);
    if (d > maxSegmentM) {
      const steps = Math.ceil(d / maxSegmentM);
      for (let j = 1; j <= steps; j++) {
        const f = j / steps;
        result.push({ lat: prev.lat + (curr.lat - prev.lat) * f, lon: prev.lon + (curr.lon - prev.lon) * f });
      }
    } else {
      result.push(curr);
    }
  }
  return result;
};
