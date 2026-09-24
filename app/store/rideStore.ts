import { create } from "zustand";
import type { RideInfo } from "../types/ride";

const DEFAULT_RIDE_INFO: RideInfo = {
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

type RideStore = {
  rideid: string;
  alredyreqest: boolean;
  infocoursencour: RideInfo;
  vehicleColor: string;
  vehiclePhoto: string;
  vehicleModel: string;
  vehicleLicensePlate: string;

  setrideid: (id: string) => void;
  setalredyrequest: (v: boolean) => void;
  setinfocoursencours: (info: RideInfo) => void;
  setVehicleColor: (c: string) => void;
  setVehiclePhoto: (p: string) => void;
  setVehicleModel: (m: string) => void;
  setVehicleLicensePlate: (p: string) => void;
  resetRide: () => void;
};

export const useRideStore = create<RideStore>((set) => ({
  rideid: "",
  alredyreqest: false,
  infocoursencour: DEFAULT_RIDE_INFO,
  vehicleColor: "",
  vehiclePhoto: "",
  vehicleModel: "",
  vehicleLicensePlate: "",

  setrideid: (id) => set({ rideid: id }),
  setalredyrequest: (v) => set({ alredyreqest: v }),
  setinfocoursencours: (info) => set({ infocoursencour: info }),
  setVehicleColor: (c) => set({ vehicleColor: c }),
  setVehiclePhoto: (p) => set({ vehiclePhoto: p }),
  setVehicleModel: (m) => set({ vehicleModel: m }),
  setVehicleLicensePlate: (p) => set({ vehicleLicensePlate: p }),
  resetRide: () => set({
    rideid: "",
    alredyreqest: false,
    infocoursencour: DEFAULT_RIDE_INFO,
    vehicleColor: "",
    vehiclePhoto: "",
    vehicleModel: "",
    vehicleLicensePlate: "",
  }),
}));
