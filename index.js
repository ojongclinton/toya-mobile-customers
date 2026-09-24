import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform, Appearance, Text, TextInput } from 'react-native';

// Forcer le thème clair sur tous les appareils (Android dark mode)
Appearance.setColorScheme('light');

// Empêcher l'héritage de la couleur texte système (blanc en dark mode)
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.style = [{ color: '#000000' }, Text.defaultProps.style];

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.style = [{ color: '#000000' }, TextInput.defaultProps.style];
TextInput.defaultProps.placeholderTextColor = TextInput.defaultProps.placeholderTextColor ?? '#999999';

// Créer le canal Android AVANT tout — obligatoire Android 8+
// Sans canal, toutes les notifications sont rejetées silencieusement
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7A42F4',
    sound: 'default',
    enableLights: true,
    showBadge: true,
  });
}

// Afficher les notifications même quand l'app est en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handler background/killed — gère notification ET data-only
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 Message reçu en background:', remoteMessage);

  const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Toya';
  const body  = remoteMessage.notification?.body  || remoteMessage.data?.body  || '';

  if (title || body) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: remoteMessage.data || {},
        sound: 'default',
      },
      trigger: null,
    });
  }
});

require('expo-router/entry');
