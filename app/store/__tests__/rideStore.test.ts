import { useRideStore } from "../rideStore";
import type { RideInfo } from "../../types/ride";

const DEFAULT_INFO: RideInfo = {
  Message: "Ride accepted by driver",
  Driver: {
    first_name: "", lastname: "", vehicle_model: "",
    license_plate: "", vehicle_color: "", vehicle_photo: null,
    profile_picture: null,
  },
  Ride: {
    driver_id: "", ride_id: "", start_location: "", end_location: "",
    destination: "", distance: 0, prestation: "", price: 0,
  },
};

beforeEach(() => {
  useRideStore.getState().resetRide();
});

// ─── état initial ─────────────────────────────────────────────────────────────

describe("rideStore — état initial", () => {
  it("rideid vide", () => {
    expect(useRideStore.getState().rideid).toBe("");
  });

  it("alredyreqest = false", () => {
    expect(useRideStore.getState().alredyreqest).toBe(false);
  });

  it("vehicleColor vide", () => {
    expect(useRideStore.getState().vehicleColor).toBe("");
  });

  it("vehiclePhoto vide", () => {
    expect(useRideStore.getState().vehiclePhoto).toBe("");
  });

  it("vehicleModel vide", () => {
    expect(useRideStore.getState().vehicleModel).toBe("");
  });

  it("vehicleLicensePlate vide", () => {
    expect(useRideStore.getState().vehicleLicensePlate).toBe("");
  });

  it("infocoursencour = DEFAULT_RIDE_INFO", () => {
    expect(useRideStore.getState().infocoursencour).toEqual(DEFAULT_INFO);
  });
});

// ─── setters ─────────────────────────────────────────────────────────────────

describe("rideStore — setters", () => {
  it("setrideid met à jour rideid", () => {
    useRideStore.getState().setrideid("ride-abc-123");
    expect(useRideStore.getState().rideid).toBe("ride-abc-123");
  });

  it("setalredyrequest → true", () => {
    useRideStore.getState().setalredyrequest(true);
    expect(useRideStore.getState().alredyreqest).toBe(true);
  });

  it("setalredyrequest → false après true", () => {
    useRideStore.getState().setalredyrequest(true);
    useRideStore.getState().setalredyrequest(false);
    expect(useRideStore.getState().alredyreqest).toBe(false);
  });

  it("setVehicleColor", () => {
    useRideStore.getState().setVehicleColor("bleu");
    expect(useRideStore.getState().vehicleColor).toBe("bleu");
  });

  it("setVehiclePhoto", () => {
    useRideStore.getState().setVehiclePhoto("https://example.com/car.jpg");
    expect(useRideStore.getState().vehiclePhoto).toBe("https://example.com/car.jpg");
  });

  it("setVehicleModel", () => {
    useRideStore.getState().setVehicleModel("Toyota Corolla");
    expect(useRideStore.getState().vehicleModel).toBe("Toyota Corolla");
  });

  it("setVehicleLicensePlate", () => {
    useRideStore.getState().setVehicleLicensePlate("LT-1234-A");
    expect(useRideStore.getState().vehicleLicensePlate).toBe("LT-1234-A");
  });

  it("setinfocoursencours met à jour le message", () => {
    const info: RideInfo = { ...DEFAULT_INFO, Message: "Course acceptée" };
    useRideStore.getState().setinfocoursencours(info);
    expect(useRideStore.getState().infocoursencour.Message).toBe("Course acceptée");
  });

  it("setinfocoursencours met à jour les infos chauffeur", () => {
    const info: RideInfo = {
      ...DEFAULT_INFO,
      Driver: { ...DEFAULT_INFO.Driver, first_name: "Jean", lastname: "Dupont" },
    };
    useRideStore.getState().setinfocoursencours(info);
    expect(useRideStore.getState().infocoursencour.Driver.first_name).toBe("Jean");
  });
});

// ─── resetRide ───────────────────────────────────────────────────────────────

describe("rideStore — resetRide", () => {
  it("remet rideid à vide", () => {
    useRideStore.getState().setrideid("xyz-999");
    useRideStore.getState().resetRide();
    expect(useRideStore.getState().rideid).toBe("");
  });

  it("remet alredyreqest à false", () => {
    useRideStore.getState().setalredyrequest(true);
    useRideStore.getState().resetRide();
    expect(useRideStore.getState().alredyreqest).toBe(false);
  });

  it("remet vehicleColor à vide", () => {
    useRideStore.getState().setVehicleColor("rouge");
    useRideStore.getState().resetRide();
    expect(useRideStore.getState().vehicleColor).toBe("");
  });

  it("remet infocoursencour à DEFAULT", () => {
    useRideStore.getState().setinfocoursencours({ ...DEFAULT_INFO, Message: "Modifié" });
    useRideStore.getState().resetRide();
    expect(useRideStore.getState().infocoursencour).toEqual(DEFAULT_INFO);
  });

  it("reset total — tous les champs", () => {
    useRideStore.getState().setrideid("x");
    useRideStore.getState().setalredyrequest(true);
    useRideStore.getState().setVehicleColor("noir");
    useRideStore.getState().setVehicleModel("BMW");
    useRideStore.getState().setVehicleLicensePlate("AA-000-BB");
    useRideStore.getState().resetRide();
    const s = useRideStore.getState();
    expect(s.rideid).toBe("");
    expect(s.alredyreqest).toBe(false);
    expect(s.vehicleColor).toBe("");
    expect(s.vehicleModel).toBe("");
    expect(s.vehicleLicensePlate).toBe("");
  });
});
