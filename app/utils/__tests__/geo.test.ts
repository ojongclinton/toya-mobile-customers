import {
  haversineDistanceM,
  calculateBearing,
  projectPoint,
  interpolateRoad,
} from "../geo";

// ─── haversineDistanceM ───────────────────────────────────────────────────────

describe("haversineDistanceM", () => {
  it("même point → 0", () => {
    expect(haversineDistanceM(3.848, 11.502, 3.848, 11.502)).toBe(0);
  });

  it("distance entre deux points Yaoundé (~1400m)", () => {
    const d = haversineDistanceM(3.848, 11.502, 3.858, 11.512);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(2000);
  });

  it("symétrie : A→B = B→A", () => {
    const d1 = haversineDistanceM(3.848, 11.502, 4.0, 11.6);
    const d2 = haversineDistanceM(4.0, 11.6, 3.848, 11.502);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it("résultat toujours positif", () => {
    expect(haversineDistanceM(0, 0, 1, 1)).toBeGreaterThan(0);
  });

  it("1 degré de latitude ≈ 111 km", () => {
    const d = haversineDistanceM(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

// ─── calculateBearing ─────────────────────────────────────────────────────────

describe("calculateBearing", () => {
  it("plein Nord → ~0°", () => {
    expect(calculateBearing(0, 0, 1, 0)).toBeCloseTo(0, 0);
  });

  it("plein Est → ~90°", () => {
    expect(calculateBearing(0, 0, 0, 1)).toBeCloseTo(90, 0);
  });

  it("plein Sud → ~180°", () => {
    expect(calculateBearing(1, 0, 0, 0)).toBeCloseTo(180, 0);
  });

  it("plein Ouest → ~270°", () => {
    expect(calculateBearing(0, 1, 0, 0)).toBeCloseTo(270, 0);
  });

  it("résultat dans [0, 360)", () => {
    const b = calculateBearing(3, 11, 4, 12);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });

  it("Nord-Est → entre 0 et 90", () => {
    const b = calculateBearing(0, 0, 1, 1);
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThan(90);
  });
});

// ─── projectPoint ─────────────────────────────────────────────────────────────

describe("projectPoint", () => {
  it("distance 0 → même point", () => {
    const r = projectPoint(3.848, 11.502, 90, 0);
    expect(r.lat).toBeCloseTo(3.848, 4);
    expect(r.lon).toBeCloseTo(11.502, 4);
  });

  it("retourne un objet {lat, lon}", () => {
    const r = projectPoint(3, 11, 90, 500);
    expect(r).toHaveProperty("lat");
    expect(r).toHaveProperty("lon");
  });

  it("aller-retour 1000m → revient au départ", () => {
    const p1 = projectPoint(3.848, 11.502, 45, 1000);
    const p2 = projectPoint(p1.lat, p1.lon, 225, 1000);
    expect(p2.lat).toBeCloseTo(3.848, 3);
    expect(p2.lon).toBeCloseTo(11.502, 3);
  });

  it("cap Est → longitude augmente", () => {
    const r = projectPoint(3.848, 11.502, 90, 1000);
    expect(r.lon).toBeGreaterThan(11.502);
    expect(r.lat).toBeCloseTo(3.848, 2);
  });

  it("cap Nord → latitude augmente", () => {
    const r = projectPoint(3.848, 11.502, 0, 1000);
    expect(r.lat).toBeGreaterThan(3.848);
    expect(r.lon).toBeCloseTo(11.502, 2);
  });
});

// ─── interpolateRoad ──────────────────────────────────────────────────────────

describe("interpolateRoad", () => {
  it("tableau vide → tableau vide", () => {
    expect(interpolateRoad([])).toEqual([]);
  });

  it("1 point → 1 point inchangé", () => {
    expect(interpolateRoad([{ lat: 3, lon: 11 }])).toEqual([{ lat: 3, lon: 11 }]);
  });

  it("segment < 15m → pas d'interpolation (2 points)", () => {
    const road = [
      { lat: 3.848, lon: 11.502 },
      { lat: 3.8480001, lon: 11.5020001 }, // ~0.01m
    ];
    expect(interpolateRoad(road)).toHaveLength(2);
  });

  it("segment long (~1km) → points interpolés", () => {
    const road = [
      { lat: 3.848, lon: 11.502 },
      { lat: 3.857, lon: 11.502 }, // ~1 km
    ];
    expect(interpolateRoad(road, 15).length).toBeGreaterThan(10);
  });

  it("premier point toujours conservé", () => {
    const road = [
      { lat: 3.848, lon: 11.502 },
      { lat: 3.9, lon: 11.6 },
    ];
    expect(interpolateRoad(road)[0]).toEqual({ lat: 3.848, lon: 11.502 });
  });

  it("maxSegmentM plus petit → plus de points", () => {
    const road = [
      { lat: 3.848, lon: 11.502 },
      { lat: 3.858, lon: 11.502 },
    ];
    expect(interpolateRoad(road, 10).length).toBeGreaterThan(
      interpolateRoad(road, 100).length
    );
  });

  it("points interpolés entre début et fin", () => {
    const road = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.01 }, // ~1.1km
    ];
    const result = interpolateRoad(road, 100);
    result.forEach((p) => {
      expect(p.lat).toBeGreaterThanOrEqual(0);
      expect(p.lon).toBeGreaterThanOrEqual(0);
      expect(p.lon).toBeLessThanOrEqual(0.01);
    });
  });
});
