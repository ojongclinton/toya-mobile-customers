import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Ref de navigation partagée (attachée au NavigationContainer dans app/_layout.tsx).
export const navigationRef = createNavigationContainerRef();

let _handling401 = false;

// Vide tout le stockage local (token, profil, course en cours…) en conservant
// uniquement la langue d'interface, pour repartir d'une session propre.
async function clearSessionStorage() {
  try {
    const language = await AsyncStorage.getItem("language");
    await AsyncStorage.clear();
    if (language) await AsyncStorage.setItem("language", language);
  } catch {
    // Échec de nettoyage non bloquant : on revient quand même au login.
  }
}

// Session invalide (401) → on vide les données stockées puis on revient au login
// ("index"). Ne se déclenche pas sur les écrans accessibles hors connexion
// (login / inscription / mot de passe oublié) ni en boucle (flag _handling401).
export function resetToLogin() {
  if (!navigationRef.isReady() || _handling401) return;
  const currentRoute = navigationRef.getCurrentRoute() as { name?: string } | undefined;
  const safeRoutes = ["index", "signup", "forgot", "chatcommenceDirect", "chatcontent"];
  if (safeRoutes.includes(currentRoute?.name ?? "")) return;
  _handling401 = true;
  clearSessionStorage();
  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "index" }] }));
  setTimeout(() => { _handling401 = false; }, 8000);
}
