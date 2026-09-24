import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "./BASE_URL";
import { resetToLogin } from "../navigationService";

const authFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = await AsyncStorage.getItem("authToken");
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  // Session invalide/expirée → vider la session et revenir au login.
  // Garde `token` : un 401 sur un flux non connecté (inscription/forgot) n'a aucun effet.
  if (response.status === 401) {
    const suspended = await AsyncStorage.getItem("accountSuspended");
    if (token && suspended !== "true") resetToLogin();
  }

  return response;
};

export default authFetch;
