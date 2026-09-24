import { renderHook, act } from "@testing-library/react-native";
import { useRideTracking } from "../useRideTracking";

jest.mock("react-native-maps", () => ({
  __esModule: true,
  default: require("react-native").View,
  AnimatedRegion: class {
    latitude = 0; longitude = 0;
    constructor(c: any) { this.latitude = c?.latitude ?? 0; this.longitude = c?.longitude ?? 0; }
    setValue() {} timing() { return { start: jest.fn() }; }
  },
  PROVIDER_GOOGLE: "google",
  Marker: require("react-native").View,
  AnimatedMarker: require("react-native").View,
  Polyline: require("react-native").View,
  Circle: require("react-native").View,
}));

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick"] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const coords2 = [
  { latitude: 3.848, longitude: 11.502 },
  { latitude: 3.858, longitude: 11.512 },
];
const coords5 = [
  { latitude: 3.84, longitude: 11.50 },
  { latitude: 3.85, longitude: 11.51 },
  { latitude: 3.86, longitude: 11.52 },
  { latitude: 3.87, longitude: 11.53 },
  { latitude: 3.88, longitude: 11.54 },
];

// ─── état initial ─────────────────────────────────────────────────────────────

describe("useRideTracking — état initial", () => {
  it("rideStarted = false", async () => {
    const { result } = await renderHook(() => useRideTracking());
    expect(result.current.rideStarted).toBe(false);
  });

  it("trajectory vide", async () => {
    const { result } = await renderHook(() => useRideTracking());
    expect(result.current.trajectory).toEqual([]);
  });

  it("routeToDriver vide", async () => {
    const { result } = await renderHook(() => useRideTracking());
    expect(result.current.routeToDriver).toEqual([]);
  });

  it("driverETA = null", async () => {
    const { result } = await renderHook(() => useRideTracking());
    expect(result.current.driverETA).toBeNull();
  });

  it("displayedRoute vide", async () => {
    const { result } = await renderHook(() => useRideTracking());
    expect(result.current.displayedRoute).toEqual([]);
  });
});

// ─── fitActiveMap ─────────────────────────────────────────────────────────────

describe("useRideTracking — fitActiveMap", () => {
  it("ignore si < 2 coords", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const mockFit = jest.fn();
    (result.current.activeMapRef as any).current = { fitToCoordinates: mockFit };
    await act(() => { result.current.fitActiveMap([coords2[0]]); });
    expect(mockFit).not.toHaveBeenCalled();
  });

  it("appelle fitToCoordinates avec 2+ coords", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const mockFit = jest.fn();
    (result.current.activeMapRef as any).current = { fitToCoordinates: mockFit };
    await act(() => { result.current.fitActiveMap(coords2); });
    expect(mockFit).toHaveBeenCalledTimes(1);
    expect(mockFit).toHaveBeenCalledWith(
      coords2,
      expect.objectContaining({ animated: true })
    );
  });

  it("throttle 5s — deuxième appel ignoré dans la fenêtre", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const mockFit = jest.fn();
    (result.current.activeMapRef as any).current = { fitToCoordinates: mockFit };
    await act(() => { result.current.fitActiveMap(coords2); });
    await act(() => { result.current.fitActiveMap(coords5); });
    expect(mockFit).toHaveBeenCalledTimes(1);
  });

  it("throttle 5s — appel autorisé après 5s", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const mockFit = jest.fn();
    (result.current.activeMapRef as any).current = { fitToCoordinates: mockFit };
    await act(() => { result.current.fitActiveMap(coords2); });
    await act(() => { jest.advanceTimersByTime(5001); });
    await act(() => { result.current.fitActiveMap(coords5); });
    expect(mockFit).toHaveBeenCalledTimes(2);
  });
});

// ─── animatePolyline ──────────────────────────────────────────────────────────

describe("useRideTracking — animatePolyline", () => {
  it("ignore si < 2 coords", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const setter = jest.fn();
    const intervalRef = { current: null };
    await act(() => { result.current.animatePolyline([coords2[0]], setter, intervalRef as any); });
    expect(setter).not.toHaveBeenCalled();
  });

  it("initialise avec les 2 premiers points", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const setter = jest.fn();
    const intervalRef = { current: null };
    await act(() => { result.current.animatePolyline(coords5, setter, intervalRef as any); });
    expect(setter).toHaveBeenCalledWith(coords5.slice(0, 2));
  });

  it("complète avec tous les points après l'animation", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const setter = jest.fn();
    const intervalRef = { current: null };
    await act(() => {
      result.current.animatePolyline(coords5, setter, intervalRef as any);
      jest.advanceTimersByTime(2000);
    });
    const lastCall = setter.mock.calls[setter.mock.calls.length - 1][0];
    expect(lastCall).toEqual(coords5);
  });

  it("nettoie l'interval existant avant de démarrer", async () => {
    const { result } = await renderHook(() => useRideTracking());
    const setter = jest.fn();
    const intervalRef: any = { current: jest.fn() };
    jest.spyOn(global, "clearInterval");
    await act(() => { result.current.animatePolyline(coords5, setter, intervalRef); });
    expect(clearInterval).toHaveBeenCalled();
  });
});

// ─── startETACountdown ────────────────────────────────────────────────────────

describe("useRideTracking — startETACountdown", () => {
  it("affichage immédiat '< 1 min' si totalSecs <= 60", async () => {
    const { result } = await renderHook(() => useRideTracking());
    await act(() => { result.current.startETACountdown(45); });
    expect(result.current.driverETA).toBe("< 1 min");
  });

  it("affichage immédiat '5 min' si totalSecs = 300", async () => {
    const { result } = await renderHook(() => useRideTracking());
    await act(() => { result.current.startETACountdown(300); });
    expect(result.current.driverETA).toBe("5 min");
  });

  it("affichage immédiat '10 min' si totalSecs = 600", async () => {
    const { result } = await renderHook(() => useRideTracking());
    await act(() => { result.current.startETACountdown(600); });
    expect(result.current.driverETA).toBe("10 min");
  });

  it("ETA décrémente d'une minute après 60s", async () => {
    const { result } = await renderHook(() => useRideTracking());
    await act(() => { result.current.startETACountdown(180); });
    expect(result.current.driverETA).toBe("3 min");
    await act(() => { jest.advanceTimersByTime(60000); });
    expect(result.current.driverETA).toBe("2 min");
  });

  it("passe à '< 1 min' quand il reste <= 60s", async () => {
    const { result } = await renderHook(() => useRideTracking());
    await act(() => { result.current.startETACountdown(120); });
    await act(() => { jest.advanceTimersByTime(61000); });
    expect(result.current.driverETA).toBe("< 1 min");
  });

  it("nettoie l'interval précédent si appelé deux fois", async () => {
    const { result } = await renderHook(() => useRideTracking());
    jest.spyOn(global, "clearInterval");
    await act(() => { result.current.startETACountdown(120); });
    await act(() => { result.current.startETACountdown(300); });
    expect(clearInterval).toHaveBeenCalled();
  });
});
