export type TrackingWsMessage = {
  driver_location: { lat: string; lon: string };
};

export type NotificationWsMessage = {
  notification_type:
    | "ride_accepted"
    | "ride_started"
    | "ride_completed"
    | "ride_canceled"
    | "payment_success"
    | "payment_failed"
    | "message_received"
    | (string & {});
  event_id: string;
  message?: string;
  additional_data?: { sender_id?: string };
};

export type RideStatusWsMessage = {
  type:
    | "connection_established"
    | "ride_accepted"
    | "ride_started"
    | "ride_completed"
    | "ride_cancelled"
    | "searching"
    | "no_driver"
    | "pong"
    | (string & {});
  user_id?: string;
  driver_name?: string;
  ride_id?: string;
  reason?: string;
  cancelled_by?: string;
  message?: string;
};
