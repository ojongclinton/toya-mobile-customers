import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../constants/api/BASE_URL';

async function requestUserPermission() {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  }

  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      return ok;
    }
    return true;
  }

  return false;
}

export async function getFCMToken() {
  try {
    const hasPermission = await requestUserPermission();

    if (!hasPermission) {
      return null;
    }

    const fcmToken = await messaging().getToken();
    return fcmToken;

  } catch {
    return null;
  }
}

export function onTokenRefresh(callback) {
  return messaging().onTokenRefresh(token => {
    callback(token);
  });
}

/**
 * Enregistre le token FCM courant auprès du backend SI un authToken est présent.
 * Idempotent côté backend (update_or_create) → peut être appelé souvent sans
 * risque (après login, au retour au premier plan, sur refresh de token).
 * Best-effort : ne bloque jamais l'UX ; un prochain déclencheur réessaiera.
 */
export async function syncFcmToken(authTokenParam?: string): Promise<void> {
  try {
    const authToken = authTokenParam ?? (await AsyncStorage.getItem('authToken'));
    if (!authToken) return;          // pas connecté → on attend le login
    const token = await getFCMToken(); // gère déjà la permission
    if (!token) return;              // permission refusée / indispo
    await fetch(BASE_URL + '/firebase/register-device/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: token, device_type: Platform.OS }),
    });
  } catch (e) {
    console.warn('[FCM] syncFcmToken failed:', String(e));
  }
}

/**
 * Statut de la permission notifications, SANS re-demander (pour détecter un refus).
 * Renvoie 'granted' | 'denied' | 'undetermined'.
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    if (Platform.OS === 'ios') {
      const s = await messaging().hasPermission();
      if (s === messaging.AuthorizationStatus.AUTHORIZED || s === messaging.AuthorizationStatus.PROVISIONAL) return 'granted';
      if (s === messaging.AuthorizationStatus.NOT_DETERMINED) return 'undetermined';
      return 'denied';
    }
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const ok = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      return ok ? 'granted' : 'denied';
    }
    return 'granted'; // Android < 13 : pas de permission runtime
  } catch {
    return 'undetermined';
  }
}

/**
 * Re-sollicitation : si la permission notifications est REFUSÉE, propose d'ouvrir
 * les réglages (impossible de re-demander directement après un refus). Throttlé à
 * 1×/jour pour ne pas harceler. Ne fait rien si la permission est accordée ou pas
 * encore demandée (le prompt système s'en charge alors).
 */
export async function promptEnableNotifications(t: (k: string) => string): Promise<void> {
  try {
    const status = await getNotificationPermissionStatus();
    if (status !== 'denied') return;
    const last = await AsyncStorage.getItem('notifPromptLast');
    const now = Date.now();
    if (last && now - Number(last) < 24 * 60 * 60 * 1000) return; // max 1×/jour
    await AsyncStorage.setItem('notifPromptLast', String(now));
    Alert.alert(
      t('enable_notifications_title'),
      t('enable_notifications_message'),
      [
        { text: t('later'), style: 'cancel' },
        { text: t('open_settings'), onPress: () => { Linking.openSettings().catch(() => {}); } },
      ],
    );
  } catch {
    // best-effort
  }
}

export function onMessageReceived(callback) {
  return messaging().onMessage(async remoteMessage => {
    callback(remoteMessage);
  });
}

export async function getInitialNotification() {
  const remoteMessage = await messaging().getInitialNotification();
  if (remoteMessage) {
    return remoteMessage;
  }
  return null;
}

export function onNotificationOpenedApp(callback) {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    callback(remoteMessage);
  });
}
