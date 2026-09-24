export type RideDriver = {
  first_name: string;
  lastname: string;
  vehicle_model: string;
  license_plate: string;
  vehicle_color: string;
  vehicle_photo: string | null;
  profile_picture: string | null;
};

export type RideDetails = {
  driver_id: string;
  ride_id: string;
  start_location: string;
  end_location: string;
  destination: string;
  distance: number;
  prestation: string;
  price: number;
};

export type RideInfo = {
  Message: string;
  Driver: RideDriver;
  Ride: RideDetails;
};

export type AvailableDriver = {
  driver_id: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  lat: number;
  lon: number;
  vehicle_model: string;
  license_plate: string;
  vehicle_color: string;
  vehicle_photo: string | null;
  prestation: string;
  distance_km: number;
  _snapOk?: boolean;
};
