import { Tabs } from "expo-router";
import React, { useState, useEffect, useRef } from 'react';
import { Platform, StatusBar, View, Animated, Image, useWindowDimensions, Dimensions, Alert, AppState } from 'react-native';
import { NavigationIndependentTree, DefaultTheme, CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import * as SplashScreen from "expo-splash-screen";
import * as Location from "expo-location";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { NavigationContainer } from "@react-navigation/native";
import i18n from "./translation";
import { PaperProvider } from "react-native-paper";
import { useFonts } from "expo-font";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const AppTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#ffffff' } };
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context";
import { navigationRef } from "@/constants/navigationService";

SplashScreen.preventAutoHideAsync();

import Index from "./index";
import Signup from "./signup";
import Profil from "./profil";
import Chat from "./chat";
import Home from "./home";
import Wallet from "./wallet";
import Historical from "./historical";
import DriverProfile from "./profiles/driver_profile";
import UserProfile from "./profiles/user_profile";
import Parrainage from "./parrainage";
import Promotion from "./codepromotion";
import Chatcontent from "./chatcontent";
import NotificationsScreen from "./Notifications";
import Forgot from "./forgot";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../constants/api/BASE_URL";

import {
  getFCMToken,
  onTokenRefresh,
  onMessageReceived,
  getInitialNotification,
  onNotificationOpenedApp,
  syncFcmToken,
} from './services/notifications';
import * as Notifications from 'expo-notifications';
import { LogBox } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import ErrorBoundary from './components/ErrorBoundary';

// ✅ Ignorer les warnings de dépréciation Firebase (temporaire)
LogBox.ignoreLogs([
  'This method is deprecated',
  'Please use `getApp()` instead',
  'migrating-to-v22',
  'expo-notifications: Custom sound',
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Hauteur typique d'une barre de navigation Android quand insets.bottom est
// sous-évalué par l'OEM (barre 3 boutons ≈ 48dp, gestuelle ≈ 24dp). On prend la
// valeur 3 boutons pour garantir qu'aucun élément ne reste sous la nav bar.
const ANDROID_NAV_FALLBACK = 48;

// Inset bas "sûr" et robuste face aux OEM (Transsion/HiOS, etc.) qui dessinent en
// edge-to-edge mais reportent parfois insets.bottom = 0.
//  - Si le système réserve déjà l'espace des barres (NON edge-to-edge), screen.height
//    > window.height → on n'ajoute rien (insets.bottom ≈ 0, aucun trou créé).
//  - Si on est edge-to-edge (screen ≈ window) et que insets.bottom est sous-évalué,
//    on applique un plancher de secours pour ne jamais chevaucher la nav bar.
function useSafeBottomInset(): number {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  if (Platform.OS !== "android") return insets.bottom;
  const screenHeight = Dimensions.get("screen").height;
  const systemReservesBars = screenHeight - windowHeight > 8; // tolérance arrondis
  const isEdgeToEdge = !systemReservesBars;
  if (isEdgeToEdge && insets.bottom < ANDROID_NAV_FALLBACK) {
    return Math.max(insets.bottom, ANDROID_NAV_FALLBACK);
  }
  return insets.bottom;
}

function MainTabs() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  // ✅ Inset bas robuste : gère l'edge-to-edge (Android 15 / targetSdk 35) ET les OEM
  // qui sous-évaluent insets.bottom (Transsion/HiOS) sans créer de trou ailleurs.
  const bottomInset = useSafeBottomInset();

  const baseHeight = isTablet ? 100 : 80;
  const totalHeight = baseHeight + bottomInset;
  const iconSize = isTablet ? 36 : 28;
  const labelSize = isTablet ? 16 : 14;
  const labelMarginBottom = isTablet ? 14 : 10;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: Colors.light.tint,
        headerShown: false,
        tabBarStyle: {
          height: totalHeight,
          paddingTop: isTablet ? 12 : 7,
          paddingBottom: bottomInset + (isTablet ? 16 : 10),
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          borderLeftWidth: 0.2,
          borderRightWidth: 0.2,
          position: "absolute",
          overflow: "hidden",
        },
      })}
      initialRouteName="home"
    >
      <Tab.Screen
        name="profile_menu"
        component={ProfileTab}
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "account-circle" : "account-circle-outline"}
              color={color}
              size={iconSize}
            />
          ),
          tabBarLabelStyle: { fontSize: labelSize, marginBottom: labelMarginBottom },
        }}
      />
      <Tab.Screen
        name="chat"
        component={ChatAll}
        options={{
          title: t("chat"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "comment" : "comment-outline"}
              color={color}
              size={iconSize}
            />
          ),
          tabBarLabelStyle: { fontSize: labelSize, marginBottom: labelMarginBottom },
        }}
      />
      <Tab.Screen
        name="home"
        component={Home}
        options={{
          title: t("ride"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "car" : "car-outline"} color={color} size={iconSize} />
          ),
          tabBarLabelStyle: { fontSize: labelSize, marginBottom: labelMarginBottom },
        }}
      />
      <Tab.Screen
        name="promotionmenu"
        component={PromotionTab}
        options={{
          title: "Promotion",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "tag" : "tag-outline"} color={color} size={iconSize} />
          ),
          tabBarLabelStyle: { fontSize: labelSize, marginBottom: labelMarginBottom },
        }}
      />
      <Tab.Screen
        name="historical"
        component={Historical}
        options={{
          title: t("history"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "clock" : "clock-outline"}
              color={color}
              size={iconSize}
            />
          ),
          tabBarLabelStyle: { fontSize: labelSize, marginBottom: labelMarginBottom },
        }}
      />
    </Tab.Navigator>
  );
}

function ChatAll() {
  return (
    <Stack.Navigator initialRouteName="chatcommence">
      <Stack.Screen name="chatcommence" component={Chat} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileTab() {
  return (
    <Stack.Navigator initialRouteName="profile">
      <Stack.Screen
        name="profile"
        component={Profil}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function PromotionTab() {
  return (
    <Stack.Navigator initialRouteName="wallet">
      <Stack.Screen
        name="wallet"
        component={Wallet}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{
        headerBackTitle: "",
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { color: '#000' },
        headerTintColor: '#000',
      }} initialRouteName="index">
      <Stack.Screen name="index" component={Index} options={{ headerShown: false }} />
      <Stack.Screen name="signup" component={Signup} options={{ headerShown: false }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false, title: "" }} />
      <Stack.Screen name="forgot" component={Forgot} options={{ headerShown: false }} />
      <Stack.Screen name="chatcommenceDirect" component={Chat} options={{ headerShown: false }} />
      <Stack.Screen name="chatcontent" component={Chatcontent} options={{ headerShown: false }} />
      <Stack.Screen name="driver_profile" component={DriverProfile} options={{ headerShown: false }} />
      <Stack.Screen name="user_profile" component={UserProfile} options={{ headerShown: false }} />
      <Stack.Screen name="codeparrainage" component={Parrainage} options={{ headerShown: false }} />
      <Stack.Screen name="codepromotion" component={Promotion} options={{ headerShown: false }} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ✅ Composant principal avec splash screen
export default function App() {
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);
  const [splashVisible, setSplashVisible] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1));

  const hideSplash = () => {
    Animated.timing(splashOpacity.current, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => setSplashVisible(false));
  };

  const handleNavigationReady = async () => {
    try {
      await SplashScreen.hideAsync();

      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage) i18n.changeLanguage(savedLanguage);

      // Demande la permission de géolocalisation pendant le splash
      try {
        const { status } = await Promise.race([
          Location.requestForegroundPermissionsAsync(),
          new Promise<{ status: string }>((resolve) =>
            setTimeout(() => resolve({ status: 'undetermined' }), 5000)
          ),
        ]);
        if (status === 'granted') {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then(loc => AsyncStorage.setItem('lastKnownPosition', JSON.stringify({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }))).catch(() => {});
        }
      } catch (_) {}

      const token = await AsyncStorage.getItem("authToken");

      await new Promise(resolve => setTimeout(resolve, 2500));

      if (token && navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "MainTabs" }] })
        );
      }
    } catch (e) {
      // fallback reste sur index
    } finally {
      hideSplash();
    }
  };

  const [fcmToken, setFcmToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: force-hide splash after 12s in case handleNavigationReady hangs
    const safetyTimeout = setTimeout(() => hideSplash(), 12000);

    initializeFCM();

    // Écouter les nouveaux messages
    const unsubscribeMessage = onMessageReceived(remoteMessage => {
      Alert.alert(
        '📩 Nouvelle notification',
        remoteMessage.notification?.body || 'Message reçu'
      );
    });

    // Écouter les clics sur notifications
    const unsubscribeNotificationOpened = onNotificationOpenedApp(() => {});

    // Écouter le rafraîchissement du token (rare) → ré-enregistrement
    const unsubscribeTokenRefresh = onTokenRefresh(async (newToken) => {
      setFcmToken(newToken);
      await syncFcmToken();
    });

    // Rattrapage : à chaque retour au premier plan, on (re)synchronise le token.
    // Couvre les sessions où l'utilisateur s'est connecté après le démarrage,
    // ainsi que les changements de permission notifications.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncFcmToken();
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribeMessage();
      unsubscribeNotificationOpened();
      unsubscribeTokenRefresh();
      appStateSub.remove();
    };
  }, []);

  const initializeFCM = async () => {
    // Configuration du canal Android
    if (Platform.OS === 'android') {
      try {
        await messaging().setDefaultChannel({
          id: 'default',
          name: 'Notifications',
          importance: 4,
          vibration: true,
        });
      } catch {
        // silently ignore
      }
    }

    try {
      await getInitialNotification();
    } catch {
      // silently ignore
    }

    // Enregistrer le token FCM si l'utilisateur est déjà connecté
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        const token = await getFCMToken();
        if (token) {
          await updateFCMTokenOnBackend(token, authToken);
        }
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  const updateFCMTokenOnBackend = async (fcmToken, authToken) => {
    try {
      await fetch(BASE_URL + "/firebase/register-device/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fcm_token: fcmToken,
          device_type: Platform.OS,
        }),
      });
    } catch {
      // silently ignore
    }
  };

  return (
    <ErrorBoundary>
    <PaperProvider>
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <NavigationIndependentTree>
        <NavigationContainer ref={navigationRef} theme={AppTheme} onReady={handleNavigationReady}>
          <AppNavigator />
        </NavigationContainer>
      </NavigationIndependentTree>
      {splashVisible && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 999,
            backgroundColor: "#0d0521",
            justifyContent: "center",
            alignItems: "center",
            opacity: splashOpacity.current,
          }}
        >
          <Image
            source={require("../assets/images/logo.png")}
            style={{ flex: 1, width: "100%", height: "100%", resizeMode: "cover" }}
          />
        </Animated.View>
      )}
    </SafeAreaProvider>
    </PaperProvider>
    </ErrorBoundary>
  );
}
