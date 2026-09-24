import React, { useEffect, useRef, useState } from "react";
import polyline from "@mapbox/polyline";
import { Animated, Keyboard, Platform, AppState, useWindowDimensions } from "react-native";
import { useDriverAnimation } from "./hooks/useDriverAnimation";
import { useRideTracking } from "./hooks/useRideTracking";
import type { AvailableDriver, RideInfo } from "./types/ride";
import { haversineDistanceM, calculateBearing, interpolateRoad } from "./utils/geo";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Linking,
  Vibration,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  AnimatedRegion,
  Circle,
  Marker,
  Polyline,
  UrlTile,
  PROVIDER_GOOGLE,
} from "react-native-maps";
// AnimatedRegion conservé pour le chauffeur en course active (activeRideDriverAnimRegionRef)

// Composants animés : coordonnées + rotation gérées nativement, zéro re-render React
const AnimatedMarker = Animated.createAnimatedComponent(Marker);
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { GooglePlacesAutocomplete, GooglePlacesAutocompleteRef } from "react-native-google-places-autocomplete";
import BASE_URL, { WS_BASE_URL, GOOGLE_MAPS_API_KEY_ANDROID, GOOGLE_MAPS_API_KEY_IOS, GOOGLE_PLACES_WEB_API_KEY } from "../constants/api/BASE_URL";
import authFetch from "../constants/api/authFetch";
import { Colors } from "@/constants/Colors";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Picker } from "@react-native-picker/picker";
import { Icon } from "react-native-paper";
import * as Notifications from 'expo-notifications';
import { getFCMToken, promptEnableNotifications } from './services/notifications';
import { useRideStore } from "./store/rideStore";
import type { TrackingWsMessage, NotificationWsMessage, RideStatusWsMessage } from "./types/ws";
import PromoCodeModal from "./components/home/PromoCodeModal";
import ErrorModal from "./components/home/ErrorModal";
import ServicePickerModal from "./components/home/ServicePickerModal";
import SearchingDriverModal from "./components/home/SearchingDriverModal";
import DriverInfoModal from "./components/home/DriverInfoModal";
import ReviewModal from "./components/home/ReviewModal";
import SOSModal from "./components/home/SOSModal";
import WeatherWidget from "./components/home/WeatherWidget";
import { useWeather } from "./hooks/useWeather";

// ✅ Configuration des notifications locales
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const VEHICLE_COLOR_MAP: Record<string, { hex: string; label: string }> = {
  white:  { hex: "#FFFFFF", label: "Blanc" },
  black:  { hex: "#1A1A1A", label: "Noir" },
  gray:   { hex: "#808080", label: "Gris" },
  silver: { hex: "#C0C0C0", label: "Argent" },
  blue:   { hex: "#1E90FF", label: "Bleu" },
  red:    { hex: "#E53935", label: "Rouge" },
  green:  { hex: "#43A047", label: "Vert" },
  yellow: { hex: "#FDD835", label: "Jaune" },
  brown:  { hex: "#795548", label: "Marron" },
  orange: { hex: "#FB8C00", label: "Orange" },
  purple: { hex: "#8A2BE2", label: "Violet" },
  other:  { hex: "#9E9E9E", label: "Autre" },
};
const getVehicleColorHex   = (c: string) => VEHICLE_COLOR_MAP[c]?.hex   ?? "#CCCCCC";
const getVehicleColorLabel = (c: string) => VEHICLE_COLOR_MAP[c]?.label ?? c;

// ✅ Marqueur chauffeur disponible : tracksViewChanges reste vrai jusqu'au chargement
// de l'icône voiture, sinon l'instantané natif est pris avant le décodage de l'image
// (installation fraîche / cache froid) → seul le badge couleur s'affichait.
function AvailableDriverMarker({
  animRegion,
  headingValue,
  opacityValue,
  vehicleColor,
}: {
  animRegion: any;
  headingValue: any;
  opacityValue: any;
  vehicleColor: string;
}) {
  const [tracks, setTracks] = useState(true);
  return (
    <AnimatedMarker
      coordinate={animRegion}
      anchor={{ x: 0.5, y: 0.5 }}
      opacity={opacityValue}
      rotation={headingValue}
      flat={true}
      tracksViewChanges={tracks}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={require("../assets/images/car.png")}
          style={{ width: 40, height: 40, resizeMode: "contain" }}
          onLoad={() => setTimeout(() => setTracks(false), 250)}
        />
        {/* Badge couleur véhicule */}
        <View style={[styles.vehicleColorBadge, { backgroundColor: getVehicleColorHex(vehicleColor) }]} />
      </View>
    </AnimatedMarker>
  );
}

// Marqueur du chauffeur pendant une course active. Même garde que
// AvailableDriverMarker : on garde tracksViewChanges=true jusqu'au chargement
// de l'image, sinon le snapshot natif (Android/Google Maps) est pris avant que
// car.png soit dessiné → marqueur invisible.
function ActiveRideDriverMarker({
  animRegion,
  headingAnim,
  driverETA,
}: {
  animRegion: any;
  headingAnim: Animated.Value;
  driverETA: string | null;
}) {
  // ── Orientation : la rotation NATIVE du marqueur (prop `rotation`) ne
  // s'applique pas de façon fiable sur Android/Google Maps. On fait donc
  // tourner l'IMAGE via `transform: rotate`, piloté par un listener sur headingAnim.
  // F3 — ROBUSTESSE BAS DE GAMME : on NE garde plus tracksViewChanges=true en
  // permanence (re-snapshot natif à chaque frame → CPU saturé, marqueur figé sur
  // Tecno/Redmi). On (1) throttle le cap (>2°) et (2) ne réactive tracksViewChanges
  // que BRIÈVEMENT après un vrai changement (pulse), puis on le repasse à false.
  // Le marqueur continue de BOUGER via la coordonnée animée (natif, sans snapshot).
  const [deg, setDeg] = useState(0);
  const [tracks, setTracks] = useState(true);
  const lastDegRef = useRef(0);
  const offTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const pulseTracks = (delay: number) => {
      setTracks(true);
      if (offTimerRef.current) clearTimeout(offTimerRef.current);
      offTimerRef.current = setTimeout(() => setTracks(false), delay);
    };
    pulseTracks(800); // capture initiale de l'image (sinon marqueur invisible)
    const id = headingAnim.addListener(({ value }) => {
      if (Math.abs(value - lastDegRef.current) < 2) return; // throttle : cap stable → rien
      lastDegRef.current = value;
      setDeg(value);
      pulseTracks(350); // re-capture l'image tournée, puis stop
    });
    return () => {
      headingAnim.removeListener(id);
      if (offTimerRef.current) clearTimeout(offTimerRef.current);
    };
  }, [headingAnim]);
  return (
    <>
      <AnimatedMarker
        coordinate={animRegion}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={tracks}
      >
        <Image
          source={require("../assets/images/car.png")}
          style={{ width: 32, height: 32, resizeMode: "contain", transform: [{ rotate: `${deg + 180}deg` }] }}
        />
      </AnimatedMarker>

      {/* Badge ETA : marqueur séparé NON tourné, même coordonnée animée, flotte au-dessus de la voiture */}
      {driverETA != null && (
        <ActiveRideETABadge animRegion={animRegion} driverETA={driverETA} />
      )}
    </>
  );
}

// Badge ETA flottant au-dessus de la voiture (marqueur indépendant pour ne pas
// subir la rotation native de la voiture). tracksViewChanges repasse à true à
// chaque changement de texte pour rafraîchir le snapshot.
function ActiveRideETABadge({
  animRegion,
  driverETA,
}: {
  animRegion: any;
  driverETA: string | null;
}) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(t);
  }, [driverETA]);
  return (
    <AnimatedMarker
      coordinate={animRegion}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
    >
      <View style={{ alignItems: "center", overflow: "visible" }}>
        <View style={{
          backgroundColor: Colors.light.tint,
          borderRadius: 8,
          paddingHorizontal: 6,
          paddingVertical: 2,
          elevation: 3,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: "white" }} numberOfLines={1}>{driverETA}</Text>
        </View>
        {/* Espaceur transparent : pousse le badge au-dessus du point (voiture centrée) */}
        <View style={{ height: 30 }} />
      </View>
    </AnimatedMarker>
  );
}


export default function Home({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // ✅ Fonction pour envoyer une notification locale
  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
      // console.log("📲 Notification locale envoyée:", title);
    } catch (error) {
      // console.error("❌ Erreur notification locale:", error);
    }
  };

  // ✅ Demander la permission pour les notifications
  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        // console.log('❌ Permission de notification refusée');
      } else {
        // console.log('✅ Permission de notification accordée');
      }
    } catch (error) {
      // console.error('❌ Erreur permission notification:', error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const fcmToken = await getFCMToken();
        const authToken = await AsyncStorage.getItem('authToken');
        if (fcmToken && authToken) {
          await fetch(BASE_URL + '/firebase/register-device/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ fcm_token: fcmToken, device_type: Platform.OS }),
          });
        }
        // Pas de token = permission refusée → invite à l'activer (throttlé 1×/jour).
        if (!fcmToken) {
          promptEnableNotifications(t);
        }
      } catch {
        // silently ignore
      }
    })();
  }, []);

  const [showSOSModal, setShowSOSModal] = useState(false);
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string>("");
  const [gpsReady, setGpsReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [activeMapPadding, setActiveMapPadding] = useState<{top:number,right:number,bottom:number,left:number} | undefined>(undefined);
  const driversOpacity = useRef(new Animated.Value(0)).current;
  const loaderPulse = useRef(new Animated.Value(1)).current;
  const loaderOpacity = useRef(new Animated.Value(1)).current;
  const [rating, setRating] = useState(0);
  const { t } = useTranslation();
  const labels = [t("rating_poor"), t("rating_sufficient"), t("rating_satisfying"), t("rating_good"), t("rating_excellent")];
  const [message, setMessage] = useState("");
  const [eventid, setEventid] = useState("");
  const GOOGLE_API_KEY = Platform.OS === "ios" ? GOOGLE_MAPS_API_KEY_IOS : GOOGLE_MAPS_API_KEY_ANDROID;


  const genPlacesToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const departPlacesTokenRef = useRef<string>(genPlacesToken());
  const arrivePlacesTokenRef = useRef<string>(genPlacesToken());

  // ── Hooks extraits ──────────────────────────────────────────────────
  const isMountedRef = useRef<boolean>(true);
  const lastGPSPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([]);

  const {
    trackDriverViews, setTrackDriverViews,
    animatedRegionsRef, headingAnimValuesRef, driverOpacityRef,
    lastSnappedPositionsRef, lastHeadingRef, lastDistKmRef,
    driverRoadCacheRef, fadedOutDriversRef, driverAnimationDoneRef,
    driverAnimatingRef, driverRoadTimersRef, driverAnimationIntervalsRef,
    animateDriverAlongRoad, animateDriverToPosition,
    snapAllDriversToNearestRoads, fetchRoadSegmentForDriver,
    fadeOutDriver, clearAllDriverAnimations,
    checkDriversAfterAnimation,
  } = useDriverAnimation({ isMountedRef, lastGPSPositionRef, setAvailableDrivers, googleApiKey: GOOGLE_API_KEY });

  const {
    activeMapRef, lastFitTimeRef,
    rideStarted, setRideStarted, rideStartedRef,
    trajectory, setTrajectory, trajectoryFullRef,
    routeToDriver, setRouteToDriver, routeToDriverRef,
    activeRideDriverAnimRegionRef,
    hasNotifiedArrivalRef, hasAnimatedTrajectoryRef,
    prevTrajLengthRef, prevRouteLengthRef,
    displayedRoute, setDisplayedRoute,
    displayedTrajectory, setDisplayedTrajectory,
    routeAnimIntervalRef, trajAnimIntervalRef,
    driverETA, setDriverETA,
    etaCountdownRef, etaRemainingSecsRef,
    fitActiveMap, animatePolyline, startETACountdown,
  } = useRideTracking();
  // ───────────────────────────────────────────────────────────────────

  const departInputRef = useRef(null);
  const REQUEST_URL_CONFIG = {
    useOnPlatform: "all",
    url: "https://maps.googleapis.com/maps/api",
    headers: {
      "X-Ios-Bundle-Identifier": "com.toya.clientapp",
      "X-Ios-Cert": "32912FFD43734CF103FECA672752EB7B969FF128",
      "X-Android-Package": "com.toya.clientapp",
      "X-Android-Cert": "32912FFD43734CF103FECA672752EB7B969FF128",
    },
  };

  type LocationSelection = {
    description: any;
    place_id: any;
    lat: any;
    lng: any;
  };

  const [suggestion, setSuggestions] = useState<
    { description: string; place_id: string; lat: number | null; lng: number | null; }[]
  >([]);
  const [suggestionarrive, setSuggestionsarrive] = useState<
    { description: string; place_id: string; lat: number | null; lng: number | null; }[]
  >([]);
  const [departKey, setDepartKey] = useState(0);
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputarrive, setInputarrive] = useState("");
  const [isSuggestionModalVisible, setIsSuggestionModalVisible] = useState(false);
  const [activeInput, setActiveInput] = useState<"depart" | "arrive" | null>(null);

  type Location = {
    latitude: number;
    longitude: number;
  };

  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [hasDriverLocation, setHasDriverLocation] = useState(false);
  // Miroir en ref : la closure ws.onmessage est créée une seule fois et capturerait
  // sinon une valeur figée de hasDriverLocation (toujours false) → recréation de
  // l'AnimatedRegion à chaque message au lieu de l'animer. On lit la ref dans la closure.
  const hasDriverLocationRef = useRef(false);
  const [selectedComfort, setSelectedComfort] = useState("economy");

  type Service = {
    Duration: any;
    Price: any;
  };

  const [economy, seteconomy] = useState<Service | null>(null);
  const [confort, setconfort] = useState<Service | null>(null);
  const [prestige, setprestige] = useState<Service | null>(null);
  const [prixeconomy, setprixeconomy] = useState([]);
  const [prixconfort, setprixconfort] = useState([]);
  const [prixprestige, setprixprestige] = useState([]);
  const [normalprixeconomy, setnormalprixeconomy] = useState<number | null>(null);
  const [normalprixconfort, setnormalprixconfort] = useState<number | null>(null);
  const [normalprixprestige, setnormalprixprestige] = useState<number | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: string; code: string; percentage: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [visible, setvisible] = useState(false);
  const [searchCountdown, setSearchCountdown] = useState(30);
  const [noDriverFound, setNoDriverFound] = useState(false);
  const searchCountdownRef = useRef<NodeJS.Timeout | null>(null);
  // Filet de sécurité invisible (~100 s) : déclenche l'échec si le WS no_driver
  // n'arrive jamais. Découplé du décompte VISIBLE (30 s) pour ne pas afficher 1:40.
  const searchSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifaccepted, setnotifaccepted] = useState([]);
  const [modalinfochauffeur, setModalinfochauffeur] = useState(false);
  const [modalinfoVisible, setmodalinfoVisible] = useState(false);
  const [topview, settopview] = useState(true);
  const [code, setcode] = useState("");
  const [modepaiement, setmodepaiement] = useState("orange_money");
  const [passengerCount, setPassengerCount] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isrequest, setrequest] = useState(false);
  // F2 — itinéraire prévu (départ→destination) affiché dès l'estimation
  const [plannedRoute, setPlannedRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const plannedAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (plannedAnimRef.current) clearInterval(plannedAnimRef.current); }, []);
  // Hauteur réelle occupée par le bottom sheet d'estimation (mesurée via onLayout)
  // → sert à cadrer le tracé bien au-dessus de lui.
  const sheetOccupiedRef = useRef(0);
  // Promesse du tracé calculé en parallèle de l'estimation (révélé quand le sheet apparaît)
  const plannedRoutePromiseRef = useRef<Promise<{ latitude: number; longitude: number }[]> | null>(null);
  const [iseditable, setIseditable] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPromoUsed, setModalPromoUsed] = useState(false);
  const [iseditablearrive, setIseditablearrive] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isarrive, setIsarrive] = useState(false);
  const [departselectionner, setdeppartselectionner] = useState<LocationSelection | null>(null);
  const [arriveselectionner, setarriverselectionner] = useState<LocationSelection | null>(null);
  const [modalnotechauffeur, setmodalnotechauffeur] = useState(false);
  const [messageerreur, setmessageerreur] = useState("");
  const [modalerreur, setModalerreur] = useState(false);
  const arriveInputRef = useRef<GooglePlacesAutocompleteRef>(null);
  const mapRef = useRef<MapView>(null);

  // ── Refs WebSocket globales — permet fermeture explicite avant reconnexion ──
  const wsTrackingRef    = useRef<WebSocket | null>(null);
  const wsNotifRef       = useRef<WebSocket | null>(null);
  const wsRideStatusRef  = useRef<WebSocket | null>(null);
  const pingIntervalRef         = useRef<NodeJS.Timeout | null>(null);
  const wsNotifPingIntervalRef  = useRef<NodeJS.Timeout | null>(null);
  const wsTrackingPingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsNotifReconnectRef     = useRef<NodeJS.Timeout | null>(null);
  const wsRideStatusReconnectRef = useRef<NodeJS.Timeout | null>(null);
  const wsNotifRetryCount       = useRef<number>(0);
  const wsRideStatusRetryCount  = useRef<number>(0);
  const currentTrackingRideIdRef = useRef<string | null>(null);
  // Empêche des connexions WS_TRACKING simultanées pour le même rideId
  const wsTrackingConnectingRef = useRef<boolean>(false);
  // Flag anti-doublon : empêche getAccepted d'être appelé deux fois si les deux WS
  // (notifications + ride-status) reçoivent "ride_accepted" quasi-simultanément
  const rideAcceptedProcessingRef = useRef<boolean>(false);
  // Empêche le double traitement ride_completed (WS_NOTIF + WS_RIDE_STATUS simultanés)
  const rideCompletedProcessingRef = useRef<boolean>(false);
  // Miroir ref de alredyreqest — permet de lire la valeur courante dans useFocusEffect([], [])
  const alredyreqestRef = useRef<boolean>(false);

  // ── Course active : heure + couleur route ──────────────────────────
  const [routeColor, setRouteColor] = useState("#00C853");
  const [driverHeading, setDriverHeading] = useState(0);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
  const prevDriverLocationRef = useRef<{latitude:number,longitude:number} | null>(null);
  // Ref sur le point de départ choisi — toujours à jour dans les callbacks WS (évite closure stale)
  const departCoordRef = useRef<{lat: number, lon: number} | null>(null);
  // Flag : nouvelle route chargée depuis fetchRouteToDriver (force l'animation dessin)
  const isNewRouteRef = useRef<boolean>(false);
  // Route prête mais voiture pas encore snappée — animation en attente du premier snap OK
  const pendingRouteAnimRef = useRef<boolean>(false);
  const activeRideHeadingAnimRef = useRef<Animated.Value>(new Animated.Value(0));
  // Valeur de cap "déroulée" (peut sortir de 0–360) pour toujours animer la rotation
  // par le plus court chemin et éviter que la voiture tourne à l'envers près de 0°/360°.
  const activeRideHeadingValueRef = useRef<number>(0);
  const activeRideAnimTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const lastWsSnapRef = useRef<{ lat: number; lon: number } | null>(null);
  // Coords de la destination — toujours à jour dans les callbacks WS
  const arriveCoordRef = useRef<{lat: number, lon: number} | null>(null);
  // Throttle pour ne pas appeler l'API Directions à chaque message WS
  const lastRouteFetchRef = useRef<number>(0);
  // Throttle suivi caméra — recadrage voiture + destination toutes les 5s
  const lastCameraFollowRef = useRef<number>(0);
  // Throttle re-routing automatique — max 1 recalcul toutes les 15s
  const lastRerouteRef = useRef<number>(0);
  const [distance, setdistance] = useState(0);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // ✅ NOUVEAU : Vraie position GPS de l'utilisateur
  const [userRealLocation, setUserRealLocation] = useState<{lat: number, lon: number} | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // Météo : clé Maps Android (Weather API activée dessus)
  const weather = useWeather(userRealLocation?.lat, userRealLocation?.lon, GOOGLE_MAPS_API_KEY_ANDROID);

  const availableDriversIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    rideid, setrideid,
    alredyreqest, setalredyrequest,
    infocoursencour, setinfocoursencours,
    vehicleColor, setVehicleColor,
    vehiclePhoto, setVehiclePhoto,
    vehicleModel, setVehicleModel,
    vehicleLicensePlate, setVehicleLicensePlate,
  } = useRideStore();

  // ✅ Nettoyage complet au démontage du composant
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Fermer tous les WebSockets
      wsTrackingRef.current?.close();
      wsNotifRef.current?.close();
      wsRideStatusRef.current?.close();
      wsTrackingRef.current   = null;
      wsNotifRef.current      = null;
      wsRideStatusRef.current = null;
      // Arrêter le ping
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      // Annuler les timers de reconnexion
      if (wsNotifReconnectRef.current) { clearTimeout(wsNotifReconnectRef.current); wsNotifReconnectRef.current = null; }
      if (wsRideStatusReconnectRef.current) { clearTimeout(wsRideStatusReconnectRef.current); wsRideStatusReconnectRef.current = null; }
      // Animation cleanup géré par useDriverAnimation
    };
  }, []);


  // Répartit les véhicules trop proches en cercle pour éviter la superposition
  const spreadOverlappingDrivers = (drivers: AvailableDriver[]): AvailableDriver[] => {
    const THRESHOLD = 0.00012; // ~13m — en dessous on considère comme superposés
    const SPREAD    = 0.00010; // ~11m de rayon pour la répartition
    const processed = new Set<number>();
    const result = drivers.map(d => ({ ...d }));

    for (let i = 0; i < result.length; i++) {
      if (processed.has(i)) continue;
      const group = [i];
      for (let j = i + 1; j < result.length; j++) {
        if (processed.has(j)) continue;
        if (
          Math.abs(result[i].lat - result[j].lat) < THRESHOLD &&
          Math.abs(result[i].lon - result[j].lon) < THRESHOLD
        ) {
          group.push(j);
        }
      }
      if (group.length > 1) {
        const centerLat = result[i].lat;
        const centerLon = result[i].lon;
        const cosLat = Math.cos((centerLat * Math.PI) / 180);
        group.forEach((idx, pos) => {
          const angle = (2 * Math.PI * pos) / group.length;
          result[idx].lat = centerLat + SPREAD * Math.cos(angle);
          result[idx].lon = centerLon + (SPREAD / cosLat) * Math.sin(angle);
        });
        group.forEach(idx => processed.add(idx));
      } else {
        processed.add(i);
      }
    }
    return result;
  };

  // Récupère les chauffeurs disponibles autour de la position GPS.
  // Si lat/lon sont fournis (premier appel), on les utilise directement.
  // Sinon on lit lastGPSPositionRef (appels périodiques de l'interval).
  const getAvailableDrivers = async (overrideLat?: number, overrideLon?: number) => {
    try {
      const pos = overrideLat != null
        ? { lat: overrideLat, lon: overrideLon! }
        : lastGPSPositionRef.current;
      if (!pos) return;

      const response = await authFetch(`/navigation/available-drivers?lat=${pos.lat}&lon=${pos.lon}&radius=20`);
      if (!response.ok) return;

      const data = await response.json();
      if (!Array.isArray(data.Data) || data.Data.length === 0) return;

      // ── ÉTAPE 1 : Snap sur les routes ────────────────────────────────
      const rawSnapped = await snapAllDriversToNearestRoads(data.Data);
      const snappedDrivers = spreadOverlappingDrivers(rawSnapped);

      // ── ÉTAPE 2 : AnimatedRegions + opacité fade-in ──────────────────
      snappedDrivers.forEach((snapped) => {
        if (fadedOutDriversRef.current.has(snapped.driver_id)) return;
        if (!snapped._snapOk && !animatedRegionsRef.current.has(snapped.driver_id)) return;
        const original = data.Data.find((d: AvailableDriver) => d.driver_id === snapped.driver_id);
        if (!original) return;
        const snapDistM = haversineDistanceM(original.lat, original.lon, snapped.lat, snapped.lon);
        const snapSucceeded = snapDistM > 2;
        const target = snapSucceeded ? { lat: snapped.lat, lon: snapped.lon } : { lat: original.lat, lon: original.lon };

        let animRegion = animatedRegionsRef.current.get(snapped.driver_id);
        if (!animRegion) {
          animRegion = new AnimatedRegion({ latitude: target.lat, longitude: target.lon, latitudeDelta: 0, longitudeDelta: 0 });
          animatedRegionsRef.current.set(snapped.driver_id, animRegion);
          headingAnimValuesRef.current.set(snapped.driver_id, new Animated.Value(0));
        } else if (
          !driverAnimatingRef.current.has(snapped.driver_id) &&
          !driverRoadCacheRef.current.has(snapped.driver_id)
        ) {
          // Anti-flash : ne repositionner que les voitures PAS encore prises en charge par
          // le glissement. Dès qu'une voiture glisse (route en cache ou animation en cours),
          // sa position est pilotée par l'animation — la téléporter ici la ramènerait
          // brièvement à son ancienne position (flash) avant que l'animation ne la rattrape.
          animRegion.setValue({ latitude: target.lat, longitude: target.lon, latitudeDelta: 0, longitudeDelta: 0 });
        }
        if (!driverOpacityRef.current.has(snapped.driver_id)) {
          const opVal = new Animated.Value(0);
          driverOpacityRef.current.set(snapped.driver_id, opVal);
          Animated.timing(opVal, { toValue: 1, duration: 800, useNativeDriver: false }).start();
        }
        if (snapSucceeded) lastSnappedPositionsRef.current.set(snapped.driver_id, target);
        lastDistKmRef.current.set(snapped.driver_id, original.distance_km);
      });

      // Supprimer les AnimatedRegions des chauffeurs absents de la réponse API
      animatedRegionsRef.current.forEach((_, id) => {
        if (!data.Data.some((d: AvailableDriver) => d.driver_id === id)) {
          animatedRegionsRef.current.delete(id);
        }
      });

      // Mettre à jour la liste affichée (nouveaux drivers uniquement)
      setAvailableDrivers(prev => {
        const existingIds = new Set(prev.map(d => d.driver_id));
        const newDrivers = snappedDrivers.filter((d) => !existingIds.has(d.driver_id) && d._snapOk);
        const stillActive = prev.filter((d) => snappedDrivers.some((nd) => nd.driver_id === d.driver_id));
        return [...stillActive, ...newDrivers];
      });



      // ── ÉTAPE 3 : Route + animation ──────────────────────────────────
      snappedDrivers.forEach((snapped, idx) => {
        if (!snapped._snapOk) return;
        if (driverAnimationDoneRef.current.has(snapped.driver_id)) return;
        if (fadedOutDriversRef.current.has(snapped.driver_id)) return;
        const original = data.Data.find((d: AvailableDriver) => d.driver_id === snapped.driver_id);
        if (!original) return;
        const snapDistM = haversineDistanceM(original.lat, original.lon, snapped.lat, snapped.lon);
        const target = snapDistM > 2 ? { lat: snapped.lat, lon: snapped.lon } : { lat: original.lat, lon: original.lon };
        const userPos = lastGPSPositionRef.current;
        const bearing = lastHeadingRef.current.get(snapped.driver_id)
          ?? (userPos ? calculateBearing(target.lat, target.lon, userPos.lat, userPos.lon) : 0);

        // Appliquer immédiatement un cap approximatif pour éviter le 0° (Nord) par défaut
        // pendant le fetch de la route. animateDriverAlongRoad corrigera avec le vrai cap.
        if (!lastHeadingRef.current.has(snapped.driver_id)) {
          const headingVal = headingAnimValuesRef.current.get(snapped.driver_id);
          if (headingVal) {
            headingVal.setValue(bearing);
            lastHeadingRef.current.set(snapped.driver_id, bearing);
          }
        }

        const cached = driverRoadCacheRef.current.get(snapped.driver_id);
        if (cached && cached.length >= 2) {
          animateDriverAlongRoad(snapped.driver_id, cached);
        } else {
          setTimeout(() => {
            fetchRoadSegmentForDriver(target.lat, target.lon, bearing).then(road => {
              if (road && road.length >= 2) {
                const smoothRoad = interpolateRoad(road);
                driverRoadCacheRef.current.set(snapped.driver_id, smoothRoad);
                animateDriverAlongRoad(snapped.driver_id, smoothRoad);
              }
            });
          }, idx * 800);
        }
      });
    } catch (_) {}
  };

  // Démarre le rafraîchissement périodique (25s).
  // Si lat/lon sont fournis, effectue un appel immédiat avec ces coords.
  const startAvailableDriversRefreshWithLocation = (lat: number, lon: number) => {
    if (availableDriversIntervalRef.current) clearInterval(availableDriversIntervalRef.current);
    getAvailableDrivers(lat, lon);
    // Opti coûts Google : 10s→25s. Rendu inchangé (mêmes voitures snappées par Google,
    // rafraîchies un peu moins souvent — invisible) ; ÷2.5 sur les appels Roads/Directions.
    availableDriversIntervalRef.current = setInterval(() => getAvailableDrivers(), 25000);
  };

  // Reprend le rafraîchissement sans coords (ex: après fin de course ou annulation).
  // lastGPSPositionRef est toujours à jour, getAvailableDrivers() le lit.
  const startAvailableDriversRefresh = () => {
    if (availableDriversIntervalRef.current) clearInterval(availableDriversIntervalRef.current);
    // Fetch immédiat : sinon les marqueurs chauffeurs n'apparaissent qu'au bout
    // de 10 s (ex. après annulation où la liste a été vidée).
    getAvailableDrivers();
    // Opti coûts Google : 10s→25s. Rendu inchangé (mêmes voitures snappées par Google,
    // rafraîchies un peu moins souvent — invisible) ; ÷2.5 sur les appels Roads/Directions.
    availableDriversIntervalRef.current = setInterval(() => getAvailableDrivers(), 25000);
  };

  // ✅ Arrêter le rafraîchissement et toutes les animations
  const stopAvailableDriversRefresh = () => {
    if (availableDriversIntervalRef.current) {
      clearInterval(availableDriversIntervalRef.current);
      availableDriversIntervalRef.current = null;
    }
    clearAllDriverAnimations();
  };

  // ✅ NOUVEAU : Couleur du marqueur selon vehicle_color
  const getVehicleMarkerColor = (vehicle_color: string) => {
    return vehicle_color === "purple" ? "#8A2BE2" : "#FFFFFF";
  };

  const checkUnreadNotifications = async () => {
    try {
      const response = await authFetch("/notifications/all");
      if (!response.ok) throw new Error(`Erreur: ${response.status}`);
      const data = await response.json();
      if (data.Data && Array.isArray(data.Data)) {
        const hasUnread = data.Data.some((notif: any) => !notif.is_read);
        setHasUnreadNotifications(hasUnread);
      }
    } catch (error) {
      // console.error("Erreur lors de la vérification des notifications:", error);
    }
  };

  // Essaie plusieurs serveurs OSRM en cascade — retourne les coords décodées ou null
  const fetchOSRMRoute = async (
    fromLon: number, fromLat: number,
    toLon: number,   toLat: number
  ): Promise<{ latitude: number; longitude: number }[] | null> => {
    const hosts = [
      "https://router.project-osrm.org",
      "https://routing.openstreetmap.de/routed-car",
    ];
    for (const host of hosts) {
      try {
        const url = `${host}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=polyline&steps=true`;
        const res = await fetch(url);
        const raw = await res.text();
        if (!res.ok || raw.trimStart().startsWith("<")) {
          // console.warn(`⚠️ OSRM ${host} HTTP ${res.status}`);
          continue;
        }
        const data = JSON.parse(raw);
        if (data.code !== "Ok" || !data.routes?.length) continue;
        const steps: any[] = data.routes[0].legs?.[0]?.steps ?? [];
        const coords: { latitude: number; longitude: number }[] = [];
        if (steps.length > 0) {
          for (const step of steps) {
            for (const [lat, lng] of polyline.decode(step.geometry))
              coords.push({ latitude: lat, longitude: lng });
          }
        } else {
          for (const [lat, lng] of polyline.decode(data.routes[0].geometry))
            coords.push({ latitude: lat, longitude: lng });
        }
        if (coords.length < 2) continue;
        const wp = data.waypoints;
        if (wp?.[0]?.location) coords[0] = { latitude: wp[0].location[1], longitude: wp[0].location[0] };
        if (wp?.[1]?.location) coords[coords.length - 1] = { latitude: wp[1].location[1], longitude: wp[1].location[0] };
        // console.log(`✅ OSRM ${host}: ${coords.length} points`);
        return coords;
      } catch (e) {
        // console.warn(`⚠️ OSRM ${host} erreur:`, e);
      }
    }
    return null;
  };

  const getTracky = async (rides_id: String) => {
    await authFetch(`/rides/client/track/${rides_id}`)
      .then(async (response) => {
        const text = await response.text();
        try { return JSON.parse(text); } catch { return null; }
      })
      .then(async (data) => {
        if (!data) { return; }

        // ── Détection de phase via le statut serveur ──────────────────────────
        const serverRideStatus: string = data?.ride_status ?? "";
        if (serverRideStatus === "in_progress" && !rideStartedRef.current) {
          rideStartedRef.current = true;
          hasAnimatedTrajectoryRef.current = false;
          setRideStarted(true);
          setDriverETA(null);
          lastRouteFetchRef.current = 0;
          if (!alredyreqest) {
            setalredyrequest(true);
            setModalinfochauffeur(true);
            setvisible(false);
            stopSearchCountdown();
            stopAvailableDriversRefresh();
            getAccepted(rides_id);
          }
        }

        // Tentatives de lecture du tracé selon plusieurs structures possibles du backend
        const route =
          data?.main_route?.itinerary?.[0] ??
          data?.main_route?.legs?.[0] ??
          (data?.main_route?.overview_polyline ? data.main_route : null) ??
          (data?.main_route?.steps ? data.main_route : null);

        if (!route) {
          const depart = departCoordRef.current;
          const arrive = arriveCoordRef.current;
          if (!depart || !arrive) return;
          let coords = await fetchOSRMRoute(depart.lon, depart.lat, arrive.lon, arrive.lat);
          if (!coords) {
            coords = [
              { latitude: depart.lat, longitude: depart.lon },
              { latitude: arrive.lat, longitude: arrive.lon },
            ];
          }
          if (!isMountedRef.current) return;
          const denseOsrm = densifyRoute(coords);
          setTrajectory(denseOsrm);
          trajectoryFullRef.current = denseOsrm;
          if (rideStartedRef.current) {
            setDisplayedTrajectory([...denseOsrm]);
          }
          getlocalisationDriver(rides_id);
          return;
        }

        const steps: any[] = route?.legs?.[0]?.steps ?? [];
        const coords: { latitude: number; longitude: number }[] = [];
        if (steps.length > 0) {
          for (const step of steps) {
            const pts = polyline.decode(step.polyline.points);
            for (const [lat, lng] of pts) coords.push({ latitude: lat, longitude: lng });
          }
        } else {
          const encoded = route?.overview_polyline?.points;
          if (!encoded) return;
          const decoded = polyline.decode(encoded);
          if (!decoded || decoded.length < 2) return;
          for (const [lat, lng] of decoded) coords.push({ latitude: lat, longitude: lng });
        }
        if (coords.length < 2) return;
        const denseCoords = densifyRoute(coords);
        if (!isMountedRef.current) return;
        setTrajectory(denseCoords);
        trajectoryFullRef.current = denseCoords;
        if (rideStartedRef.current) {
          setDisplayedTrajectory([...denseCoords]);
        }
        getlocalisationDriver(rides_id);
      })
      .catch(() => {});
  };

  // ── Densifie une polyline à max 25 m entre points pour un snap précis ──
  const densifyRoute = (coords: {latitude: number; longitude: number}[]): {latitude: number; longitude: number}[] => {
    if (coords.length < 2) return coords;
    const raw = interpolateRoad(coords.map(c => ({ lat: c.latitude, lon: c.longitude })), 25);
    return raw.map(p => ({ latitude: p.lat, longitude: p.lon }));
  };

  // ── Snap un point sur le segment de polyline le plus proche ──────────
  // Retourne {lat, lon, bearing} du point projeté + cap du segment.
  // Utile pour coller l'icône chauffeur sur la route et obtenir son orientation exacte.
  const snapToPolyline = (
    lat: number, lon: number,
    route: {latitude: number, longitude: number}[]
  ): {lat: number, lon: number, bearing: number, segmentIndex: number} | null => {
    if (route.length < 2) return null;
    let minDist = Infinity;
    let best = { lat, lon, bearing: 0, segmentIndex: 0 };
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i + 1];
      const dx = b.longitude - a.longitude, dy = b.latitude - a.latitude;
      const lenSq = dx * dx + dy * dy;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1,
        ((lon - a.longitude) * dx + (lat - a.latitude) * dy) / lenSq
      ));
      const cLat = a.latitude  + t * dy;
      const cLon = a.longitude + t * dx;
      const dist = haversineDistanceM(lat, lon, cLat, cLon);
      if (dist < minDist) {
        minDist = dist;
        best = { lat: cLat, lon: cLon, bearing: calculateBearing(a.latitude, a.longitude, b.latitude, b.longitude), segmentIndex: i };
      }
    }
    return minDist <= 120 ? best : null;
  };

  // ── Course active : récupère le tracé trafic + ETA entre le chauffeur et l'utilisateur ──
  const fetchRouteToDriver = async (driverLat: number, driverLon: number, userLat: number, userLon: number): Promise<boolean> => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${driverLat},${driverLon}` +
        `&destination=${userLat},${userLon}` +
        `&departure_time=now&traffic_model=best_guess` +
        `&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url, {
        headers: Platform.OS === "android"
          ? { "X-Android-Package": "com.toya.clientapp", "X-Android-Cert": "32912FFD43734CF103FECA672752EB7B969FF128" }
          : { "X-Ios-Bundle-Identifier": "com.toya.clientapp" },
      });
      const data = await response.json();
      // console.log("🗺️ fetchRouteToDriver status:", data.status, "| routes:", data.routes?.length ?? 0);
      if (data.status !== "OK" || !data.routes?.length) {
        // Fallback OSRM si Google échoue (quota dépassé, clé invalide…)
        let osrmCoords = await fetchOSRMRoute(driverLon, driverLat, userLon, userLat);
        if (!osrmCoords) {
          // Dernier recours : ligne droite chauffeur → utilisateur
          osrmCoords = [
            { latitude: driverLat, longitude: driverLon },
            { latitude: userLat,   longitude: userLon   },
          ];
        }
        const denseOsrm = densifyRoute(osrmCoords);
        isNewRouteRef.current = true;
        if (rideStartedRef.current) {
          trajectoryFullRef.current = denseOsrm;
          setTrajectory(denseOsrm);
          setDisplayedTrajectory(denseOsrm);
        } else {
          setRouteToDriver(denseOsrm);
          setRouteColor("#00C853");
        }
        return true;
      }

      const leg = data.routes[0].legs[0];
      const durationSecs: number = leg.duration?.value ?? 0;
      const durationTrafficSecs: number = leg.duration_in_traffic?.value ?? durationSecs;
      const etaMin = Math.ceil(durationTrafficSecs / 60);

      // Couleur selon le ratio trafic
      const ratio = durationSecs > 0 ? durationTrafficSecs / durationSecs : 1;
      const color = ratio < 1.2 ? "#00C853" : ratio < 1.5 ? "#FF6D00" : "#D50000";

      // Décodage via les steps pour coller exactement à la route (plus précis que overview_polyline)
      const steps: any[] = leg.steps ?? [];
      const coords: { latitude: number; longitude: number }[] = [];
      for (const step of steps) {
        const pts = polyline.decode(step.polyline.points);
        for (const [lat, lng] of pts) {
          coords.push({ latitude: lat, longitude: lng });
        }
      }
      if (coords.length === 0) {
        const fallback = polyline.decode(data.routes[0].overview_polyline.points);
        for (const [lat, lng] of fallback) coords.push({ latitude: lat, longitude: lng });
      }

      const denseCoords = densifyRoute(coords);
      isNewRouteRef.current = true;
      setDriverETA(etaMin <= 1 ? "< 1 min" : `${etaMin} min`);
      startETACountdown(durationTrafficSecs);
      if (rideStartedRef.current) {
        trajectoryFullRef.current = denseCoords;
        setTrajectory(denseCoords);
        setDisplayedTrajectory(denseCoords);
      } else {
        setRouteToDriver(denseCoords);
        setRouteColor(color);
      }
      return true;
    } catch (err) {
      // console.warn("⚠️ fetchRouteToDriver erreur:", err);
      return false;
    }
  };


  const getlocalisationDriver = async (rides_id: any) => {
    // Idempotence — déjà connecté au même ride
    if (
      wsTrackingRef.current &&
      wsTrackingRef.current.readyState === WebSocket.OPEN &&
      currentTrackingRideIdRef.current === rides_id
    ) {
      return;
    }
    // Idempotence — connexion déjà en cours pour le même ride
    if (wsTrackingConnectingRef.current && currentTrackingRideIdRef.current === rides_id) {
      return;
    }
    currentTrackingRideIdRef.current = rides_id;
    wsTrackingConnectingRef.current = true;
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) { wsTrackingConnectingRef.current = false; return; }

      // Fermer le WS précédent s'il existe
      if (wsTrackingRef.current) {
        wsTrackingRef.current.close();
        wsTrackingRef.current = null;
      }

      const url = `${WS_BASE_URL}/ws/ride-tracking/${rides_id}/?token=${token}`;
      const ws = new WebSocket(url);
      wsTrackingRef.current = ws;

      ws.onopen = () => {
        wsTrackingConnectingRef.current = false;
        if (wsTrackingPingIntervalRef.current) clearInterval(wsTrackingPingIntervalRef.current);
        wsTrackingPingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsedData = JSON.parse(event.data) as TrackingWsMessage;
          if (parsedData?.driver_location) {
            const { lat, lon } = parsedData.driver_location;
            const rawLat = parseFloat(lat);
            const rawLon = parseFloat(lon);
            // Garde : des coordonnées NaN injectées dans AnimatedRegion/Marker peuvent
            // faire planter le module natif react-native-maps (non rattrapable en JS).
            if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return;

            // ── 1. Snap sur la polyline du tracé ──
            const route = rideStartedRef.current ? trajectoryFullRef.current : routeToDriverRef.current;
            const isFallback = route.length <= 2;
            const snappedOnRoute = isFallback
              ? { lat: rawLat, lon: rawLon, bearing: route.length === 2 ? calculateBearing(route[0].latitude, route[0].longitude, route[1].latitude, route[1].longitude) : 0, segmentIndex: 0 }
              : snapToPolyline(rawLat, rawLon, route);
            // Si le snap échoue (driver hors route), on utilise la position GPS brute pour que
            // la voiture reste toujours visible — on marque isRawFallback pour ne pas toucher au trim
            const isRawFallback = snappedOnRoute === null;
            const snapped = snappedOnRoute ?? { lat: rawLat, lon: rawLon, bearing: 0, segmentIndex: -1 };

            if (snapped) {
              const now = Date.now();

              // ── 2. Mise à jour heading — rotation fluide vers le cap du segment de route ──
              // On "déroule" l'angle : on cherche l'équivalent du cap cible (± k·360)
              // le plus proche de la valeur courante, pour toujours tourner par le plus
              // court chemin (sinon la voiture fait un tour complet près de 0°/360°).
              const rotateTo = (bearing: number) => {
                const prev = activeRideHeadingValueRef.current;
                const delta = ((((bearing - prev) % 360) + 540) % 360) - 180; // [-180,180]
                const target = prev + delta;
                activeRideHeadingValueRef.current = target;
                Animated.timing(activeRideHeadingAnimRef.current, {
                  toValue: target,
                  duration: 600,
                  useNativeDriver: false,
                }).start();
              };
              if (!isFallback && !isRawFallback && snapped.bearing != null) {
                rotateTo(snapped.bearing);
              } else if (lastWsSnapRef.current) {
                const distM = haversineDistanceM(lastWsSnapRef.current.lat, lastWsSnapRef.current.lon, snapped.lat, snapped.lon);
                if (distM >= 3) {
                  rotateTo(calculateBearing(lastWsSnapRef.current.lat, lastWsSnapRef.current.lon, snapped.lat, snapped.lon));
                }
              }
              lastWsSnapRef.current = { lat: snapped.lat, lon: snapped.lon };

              // ── 3. Animation position (même approche que voitures disponibles) ──
              if (!hasDriverLocationRef.current) {
                activeRideDriverAnimRegionRef.current = new AnimatedRegion({
                  latitude: snapped.lat, longitude: snapped.lon, latitudeDelta: 0, longitudeDelta: 0,
                });
                hasDriverLocationRef.current = true;
                setHasDriverLocation(true);
              } else {
                activeRideDriverAnimRegionRef.current?.timing({
                  latitude: snapped.lat, longitude: snapped.lon,
                  latitudeDelta: 0, longitudeDelta: 0,
                  duration: 4000, useNativeDriver: false,
                }).start();
              }
            }

            // ── Effacement progressif : retirer la partie déjà parcourue de routeToDriver ──
            if (!isRawFallback && snapped && routeToDriverRef.current.length > snapped.segmentIndex + 1) {
              const remaining = [
                { latitude: snapped.lat, longitude: snapped.lon },
                ...routeToDriverRef.current.slice(snapped.segmentIndex + 1),
              ];
              routeToDriverRef.current = remaining;
              if (snapped.segmentIndex >= 1) setRouteToDriver(remaining);
            }

            // ── 4. Notification d'arrivée au pickup (avant démarrage course) ──────
            const pickupCoord = departCoordRef.current ?? lastGPSPositionRef.current;
            if (!rideStartedRef.current && pickupCoord && !hasNotifiedArrivalRef.current) {
              const distToPickup = haversineDistanceM(rawLat, rawLon, pickupCoord.lat, pickupCoord.lon);
              if (distToPickup <= 100) {
                hasNotifiedArrivalRef.current = true;
                sendLocalNotification(
                  " Votre chauffeur est arrivé !",
                  "Votre chauffeur vous attend au point de prise en charge."
                );
              }
            }

            // ── 5. Tracé trafic + ETA — throttle 60s, cible selon phase de course ──
            const now = Date.now();
            const timeSinceLastFetch = now - lastRouteFetchRef.current;
            if (timeSinceLastFetch > 60000) {
              lastRouteFetchRef.current = now; // optimiste : empêche les fetchs concurrents pendant l'appel
              const targetCoord = rideStartedRef.current ? (arriveCoordRef.current) : pickupCoord;
              if (targetCoord) {
                fetchRouteToDriver(rawLat, rawLon, targetCoord.lat, targetCoord.lon).then((ok) => {
                  // Échec réseau (aucun tracé dessiné) → on déverrouille le throttle pour
                  // réessayer dès le prochain message WS au lieu d'attendre 60 s.
                  if (!ok) lastRouteFetchRef.current = 0;
                });
              } else {
                // Cible pas encore connue → ne pas garder le verrou 60 s, réessayer plus tôt.
                lastRouteFetchRef.current = 0;
              }
            }

            // ── 6. Suivi caméra — recadrage voiture + cible toutes les 5s ──
            if (snapped && now - lastCameraFollowRef.current > 5000) {
              lastCameraFollowRef.current = now;
              const camTarget = rideStartedRef.current
                ? arriveCoordRef.current
                : (departCoordRef.current ?? lastGPSPositionRef.current);
              if (camTarget) {
                activeMapRef.current?.fitToCoordinates(
                  [
                    { latitude: snapped.lat, longitude: snapped.lon },
                    { latitude: camTarget.lat, longitude: camTarget.lon },
                  ],
                  { edgePadding: { top: 120, right: 60, bottom: 220, left: 60 }, animated: true }
                );
              }
            }

            // ── 7. Re-routing automatique si déviation > 120m du tracé ──
            if (!snapped && !isFallback && hasDriverLocationRef.current && now - lastRerouteRef.current > 15000) {
              lastRerouteRef.current = now;

              if (rideStartedRef.current) {
                // Phase 2 — recalcul OSRM vers la destination
                const destination = arriveCoordRef.current;
                if (destination) {
                  activeRideDriverAnimRegionRef.current?.timing({
                    latitude: rawLat, longitude: rawLon,
                    latitudeDelta: 0, longitudeDelta: 0,
                    duration: 800, useNativeDriver: false,
                  }).start();
                  lastWsSnapRef.current = { lat: rawLat, lon: rawLon };

                  fetchOSRMRoute(rawLon, rawLat, destination.lon, destination.lat).then(newCoords => {
                    if (!newCoords || !isMountedRef.current) return;
                    const denseNew = densifyRoute(newCoords);
                    trajectoryFullRef.current = denseNew;
                    setTrajectory(denseNew);
                    setDisplayedTrajectory(denseNew);
                    prevTrajLengthRef.current = denseNew.length;
                  });
                }
              } else {
                // Phase 1 — forcer un recalcul Google Directions au prochain message WS
                lastRouteFetchRef.current = 0;
              }
            }
          }
        } catch {
          // silently ignore
        }
      };

      ws.onerror = () => { wsTrackingConnectingRef.current = false; };
      ws.onclose = (event) => {
        wsTrackingConnectingRef.current = false;
        if (wsTrackingPingIntervalRef.current) { clearInterval(wsTrackingPingIntervalRef.current); wsTrackingPingIntervalRef.current = null; }
        if (isMountedRef.current && currentTrackingRideIdRef.current === rides_id) {
          setTimeout(() => {
            if (isMountedRef.current && currentTrackingRideIdRef.current === rides_id) {
              getlocalisationDriver(rides_id);
            }
          }, 3000);
        }
      };
    } catch {
      wsTrackingConnectingRef.current = false;
    }
  };

  const handleSelectSuggestion = (sugges: any) => {
    setIsSuggestionModalVisible(false);
    if (activeInput === "depart") {
      setdeppartselectionner(sugges);
      setInputValue(sugges.description);
    } else if (activeInput === "arrive") {
      setarriverselectionner(sugges);
      setInputarrive(sugges.description);
      setModalVisible(true);
    }
    setActiveInput(null);
  };

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Mise à jour de l'heure toutes les 30 secondes (affichée sur la carte course active)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Maintenir la ref du point de départ synchronisée avec l'état (évite closure stale dans WS)
  useEffect(() => {
    if (departselectionner) {
      departCoordRef.current = {
        lat: parseFloat(departselectionner.lat),
        lon: parseFloat(departselectionner.lng),
      };
    }
  }, [departselectionner]);

  // Synchroniser la polyline vers une ref + animation tracé + recentrer
  useEffect(() => {
    routeToDriverRef.current = routeToDriver;
    if (routeToDriver.length < 2) return;
    if (isNewRouteRef.current) {
      isNewRouteRef.current = false;
      if (hasDriverLocation) {
        animatePolyline(routeToDriver, setDisplayedRoute, routeAnimIntervalRef);
      } else {
        pendingRouteAnimRef.current = true;
      }
    } else if (hasDriverLocation && !pendingRouteAnimRef.current) {
      setDisplayedRoute(routeToDriver);
    }
    prevRouteLengthRef.current = routeToDriver.length;
    if (!rideStarted) fitActiveMap(routeToDriver);
  }, [routeToDriver]);

  // Dès que la voiture est snappée pour la première fois → déclencher l'animation de tracé en attente
  useEffect(() => {
    if (!hasDriverLocation) return;
    if (pendingRouteAnimRef.current && routeToDriverRef.current.length >= 2) {
      pendingRouteAnimRef.current = false;
      animatePolyline(routeToDriverRef.current, setDisplayedRoute, routeAnimIntervalRef);
      fitActiveMap(routeToDriverRef.current);
    }
  }, [hasDriverLocation]);

  // Animation trajectoire + recentrage quand la course démarre
  // Dépend aussi de trajectory pour gérer la reprise d'app (trajectory arrive après rideStarted)
  useEffect(() => {
    if (rideStarted && trajectory.length >= 2 && !hasAnimatedTrajectoryRef.current) {
      hasAnimatedTrajectoryRef.current = true;
      lastFitTimeRef.current = 0;
      animatePolyline(trajectory, setDisplayedTrajectory, trajAnimIntervalRef);
      fitActiveMap(trajectory);
    } else if (rideStarted && trajectory.length < 2) {
    }
  }, [rideStarted, trajectory]);

  // Trimming progressif de la trajectoire → mise à jour directe (uniquement si course démarrée)
  useEffect(() => {
    if (trajectory.length < 2) return;
    if (!rideStarted) return;
    if (trajectory.length > prevTrajLengthRef.current + 10) {
      // Premier chargement géré par le rideStarted effect (animation)
    } else {
      setDisplayedTrajectory(trajectory);
    }
    prevTrajLengthRef.current = trajectory.length;
  }, [rideStarted, trajectory]);


  // Synchroniser les coords destination
  useEffect(() => {
    if (arriveselectionner) {
      arriveCoordRef.current = {
        lat: parseFloat(arriveselectionner.lat),
        lon: parseFloat(arriveselectionner.lng),
      };
    }
  }, [arriveselectionner]);

  // Zoom automatique vers la position utilisateur quand la carte de course active s'ouvre
  useEffect(() => {
    if (!alredyreqest) return;
    const pos = lastGPSPositionRef.current;
    if (!pos) return;
    const t = setTimeout(() => {
      activeMapRef.current?.animateToRegion({
        latitude: pos.lat,
        longitude: pos.lon,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 600);
    }, 350);
    return () => clearTimeout(t);
  }, [alredyreqest]);

  // Label "Arrivée à HH:MM" calculé depuis driverETA — utilisé sur les marqueurs de la carte active
  const activeRideArrivalLabel = React.useMemo(() => {
    if (!driverETA) return `Arrivée à ${currentTime}`;
    const match = driverETA.match(/(\d+)/);
    if (!match) return `Arrivée à ${currentTime}`;
    const arrival = new Date();
    arrival.setMinutes(arrival.getMinutes() + parseInt(match[1]));
    const h = String(arrival.getHours()).padStart(2, "0");
    const m = String(arrival.getMinutes()).padStart(2, "0");
    return `Arrivée à ${h}:${m}`;
  }, [driverETA, currentTime]);

  // Nettoyer le countdown et réinitialiser tous les refs course active quand la course se termine
  useEffect(() => {
    if (!alredyreqest) {
      if (etaCountdownRef.current) { clearInterval(etaCountdownRef.current); etaCountdownRef.current = null; }
      activeRideAnimTimeoutsRef.current.forEach(clearTimeout);
      activeRideAnimTimeoutsRef.current = [];
      rideAcceptedProcessingRef.current = false;
      activeRideDriverAnimRegionRef.current = null;
      hasDriverLocationRef.current = false;
      setHasDriverLocation(false);
      activeRideHeadingValueRef.current = 0;
      activeRideHeadingAnimRef.current.setValue(0);
      hasNotifiedArrivalRef.current = false;
      hasAnimatedTrajectoryRef.current = false;
      isNewRouteRef.current = false;
      pendingRouteAnimRef.current = false;
      lastWsSnapRef.current = null;
      rideStartedRef.current = false;
      setRideStarted(false);
      lastRouteFetchRef.current = 0;
      lastCameraFollowRef.current = 0;
      lastRerouteRef.current = 0;
      prevDriverLocationRef.current = null;
      routeToDriverRef.current = [];
      // ✅ Les polylines ne dépendent plus de hasDriverLocation pour s'afficher : on doit
      // donc vider explicitement les tracés affichés, sinon un tracé de la course
      // précédente resterait visible au démarrage de la suivante.
      trajectoryFullRef.current = [];
      prevRouteLengthRef.current = 0;
      prevTrajLengthRef.current = 0;
      if (routeAnimIntervalRef.current) { clearInterval(routeAnimIntervalRef.current); routeAnimIntervalRef.current = null; }
      if (trajAnimIntervalRef.current) { clearInterval(trajAnimIntervalRef.current); trajAnimIntervalRef.current = null; }
      setRouteToDriver([]);
      setTrajectory([]);
      setDisplayedRoute([]);
      setDisplayedTrajectory([]);
    }
  }, [alredyreqest]);

  // ✅ Cameroun vue d'ensemble par défaut, remplacée dès que la vraie position GPS est reçue
  const camerounRegion = {
    latitude: 5.3690,    // Centre géographique du Cameroun
    longitude: 12.3448,
    latitudeDelta: 8.0,  // Zoom large pour voir tout le Cameroun
    longitudeDelta: 6.0,
  };

  // ✅ FIX TREMBLEMENT : Ref pour savoir si on a déjà centré la carte
  // Une fois centré, on ne touche plus à la région via GPS pour éviter le tremblement
  const hasBeenCenteredRef = useRef(false);
  // F1 — recentrage auto robuste : suit la position tant que l'utilisateur n'a pas
  // bougé la carte (gère le 1er fix grossier → fix précis sur appareils bas de gamme).
  const lastCenteredPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const userMovedMapRef = useRef(false);
  // Animation pulse du loader GPS
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(loaderPulse, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(loaderPulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 📍 Géocodage inverse robuste (libellé du lieu de départ)
  // (A) Un seul format de libellé pour tous les chemins (cache, GPS, bouton)
  // (B) Repli réseau Google Geocoding si le géocodeur natif renvoie vide/partiel
  // (C) Matérialise le départ (start_location toujours rempli)
  // ─────────────────────────────────────────────────────────────

  // Détecte un Plus Code Google / Open Location Code (ex. "WH33+C3W"),
  // illisible pour l'utilisateur. Une adresse classique ne contient jamais de "+".
  const isPlusCode = (s: string): boolean =>
    /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,3}$/i.test(s.trim());

  // Retire tout segment / mot Plus Code d'un libellé d'adresse (séparé par virgules).
  const stripPlusCode = (label: string): string =>
    label
      .split(",")
      .map((seg) =>
        seg
          .split(" ")
          .filter((w) => w && !isPlusCode(w))
          .join(" ")
          .trim()
      )
      .filter(Boolean)
      .join(", ");

  // (A) Construit un libellé d'adresse lisible et cohérent
  const buildLocationLabel = (a: any): string =>
    [a?.street, a?.name, a?.district, a?.subregion, a?.city]
      .filter(Boolean)
      // retire les Plus Codes Google (ex. "WH33+C3W") illisibles pour l'utilisateur
      .filter((seg) => !isPlusCode(String(seg)))
      // dédoublonne les segments répétés (ex. name === street)
      .filter((seg, i, arr) => arr.indexOf(seg) === i)
      .join(", ");

  // (B) Géocodage inverse : natif d'abord, repli Google Geocoding API ensuite.
  // Renvoie null si tout échoue (l'appelant pose alors un repli coordonnées).
  const resolveLocationLabel = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    // 1) Géocodeur natif (rapide, parfois hors-ligne) — dépendant de l'appareil
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      const nativeLabel = result?.[0] ? buildLocationLabel(result[0]) : "";
      if (nativeLabel) return nativeLabel;
    } catch (_) {}

    // 2) Repli réseau : Google Geocoding API (clé web déjà utilisée pour Places)
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=fr&result_type=street_address|route|neighborhood|locality&key=${GOOGLE_PLACES_WEB_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json?.status === "OK" && json.results?.length) {
        const cleaned = stripPlusCode(json.results[0].formatted_address || "");
        return cleaned || null;
      }
    } catch (_) {}

    return null;
  };

  // (C) Applique la position détectée comme départ par défaut :
  // libellé robuste (placeholder) + départ matérialisé pour start_location.
  const applyDetectedDeparture = async (latitude: number, longitude: number) => {
    const label = await resolveLocationLabel(latitude, longitude);
    const finalLabel = label || `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
    setCurrentLocationLabel(finalLabel);
    // Ne pas écraser un départ choisi manuellement par l'utilisateur (place_id non vide)
    setdeppartselectionner((prev: any) => {
      if (prev && prev.place_id) return prev;
      return { description: finalLabel, place_id: "", lat: latitude, lng: longitude };
    });
  };

  useEffect(() => {
    let isFirstPosition = true;

    // F1 — Filet anti-blocage (appareils bas de gamme / iPhone XR) : si aucun fix
    // GPS n'arrive (BestForNavigation lent à froid, permission "approximative",
    // intérieur, permission refusée…), on débloque l'affichage après 8 s avec la
    // région par défaut au lieu d'un loader infini. Le GPS se cale ensuite.
    const gpsReadyTimer = setTimeout(() => {
      loaderOpacity.setValue(0);
      setGpsReady(true);
    }, 8000);

    (async () => {
      getstat().catch(() => {});

      // ✅ Position pré-chargée depuis le splash → affichage immédiat de la map
      try {
        const cached = await AsyncStorage.getItem("lastKnownPosition");
        if (cached) {
          const { latitude, longitude } = JSON.parse(cached);
          lastGPSPositionRef.current = { lat: latitude, lon: longitude };
          setUserRealLocation({ lat: latitude, lon: longitude });
          loaderOpacity.setValue(0);
          setGpsReady(true);
          hasBeenCenteredRef.current = true;
          isFirstPosition = false;
          startAvailableDriversRefreshWithLocation(latitude, longitude);
          applyDetectedDeparture(latitude, longitude);
          await AsyncStorage.removeItem("lastKnownPosition");
        }
      } catch (_) {}

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // console.log("❌ Permission GPS refusée - Douala conservée");
        return;
      }

      // F1 — Fix instantané depuis le cache système : évite que le loader reste
      // bloqué le temps du premier fix BestForNavigation (lent sur appareils bas
      // de gamme). La position précise arrivera ensuite via watchPositionAsync.
      if (isFirstPosition) {
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last && isFirstPosition) {
            const { latitude, longitude } = last.coords;
            lastGPSPositionRef.current = { lat: latitude, lon: longitude };
            setUserRealLocation({ lat: latitude, lon: longitude });
            loaderOpacity.setValue(0);
            setGpsReady(true);
            hasBeenCenteredRef.current = true;
            isFirstPosition = false;
            startAvailableDriversRefreshWithLocation(latitude, longitude);
            applyDetectedDeparture(latitude, longitude);
          }
        } catch (_) {}
      }

      // ✅ watchPositionAsync : écoute continue, évite les positions en cache
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          // F1 — High (et non BestForNavigation) : premier fix bien plus rapide à
          // acquérir sur puces bas de gamme, précision largement suffisante pour
          // afficher la position client et envoyer le point de prise en charge.
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,      // ✅ Mise à jour toutes les 3 secondes (plus réactif)
          distanceInterval: 5,     // ✅ Mise à jour si déplacement > 5 mètres
        },
        (location) => {
          const { latitude, longitude, accuracy } = location.coords;
          // console.log(`📍 GPS reçu: ${latitude}, ${longitude} (précision: ${accuracy}m)`);

          // ✅ Toujours mettre à jour la position GPS dans la ref (sans re-render)
          lastGPSPositionRef.current = { lat: latitude, lon: longitude };

          // ✅ Mettre à jour le state userRealLocation pour l'API
          setUserRealLocation({ lat: latitude, lon: longitude });

          // ── Effacement progressif de la trajectoire (course démarrée) ──
          if (rideStartedRef.current && trajectoryFullRef.current.length >= 2) {
            const snappedTraj = snapToPolyline(latitude, longitude, trajectoryFullRef.current);
            if (snappedTraj) {
              const remaining = [
                { latitude: snappedTraj.lat, longitude: snappedTraj.lon },
                ...trajectoryFullRef.current.slice(snappedTraj.segmentIndex + 1),
              ];
              trajectoryFullRef.current = remaining;
              setTrajectory(remaining);
              setDisplayedTrajectory(remaining);
            } else {
              setDisplayedTrajectory([...trajectoryFullRef.current]);
            }
          }

          if (isFirstPosition) {
            // ✅ PREMIÈRE POSITION : Animation fluide Cameroun → ville → position exacte
            isFirstPosition = false;
            hasBeenCenteredRef.current = true;

            // ✅ Fade-out du loader GPS
            Animated.timing(loaderOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => setGpsReady(true));

            // ✅ Reverse geocode robuste pour le champ départ (+ départ matérialisé)
            applyDetectedDeparture(latitude, longitude);

            // ✅ Déclencher immédiatement la recherche de chauffeurs
            startAvailableDriversRefreshWithLocation(latitude, longitude);

            const finalRegion = {
              latitude,
              longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.012,
            };

            const intermediateRegion = {
              latitude,
              longitude,
              latitudeDelta: 1.5,
              longitudeDelta: 1.2,
            };

            // Animation vers la position gérée par useEffect([mapReady])

          }
          // ✅ PAS de setRegion() sur les mises à jour suivantes
          // Cela évite le TREMBLEMENT de la carte
          // La carte reste à la position que l'utilisateur a définie
        }
      );
    })();

    // ✅ Nettoyage au démontage
    return () => {
      clearTimeout(gpsReadyTimer);
      if (availableDriversIntervalRef.current) clearInterval(availableDriversIntervalRef.current);
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
        // console.log("🛑 Surveillance GPS arrêtée");
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    Animated.timing(driversOpacity, {
      toValue: 1,
      duration: 900,
      delay: 400,
      useNativeDriver: false,
    }).start();
  }, [mapReady]);

  // F1 — Recentrage automatique ROBUSTE (appareils bas de gamme).
  // Le 1er fix est souvent grossier (last-known/cache) ; le fix précis arrive plus
  // tard et plus loin. On RE-centre tant que la position change notablement (>120 m)
  // ET que l'utilisateur n'a pas pris la main sur la carte (userMovedMapRef) → la
  // carte finit toujours sur la vraie position, sans figer l'utilisateur ni trembler
  // sur le jitter GPS (<120 m ignoré).
  useEffect(() => {
    if (!mapReady || userMovedMapRef.current) return;
    const pos =
      lastGPSPositionRef.current ??
      (userRealLocation ? { lat: userRealLocation.lat, lon: userRealLocation.lon } : null);
    if (!pos) return;
    const prev = lastCenteredPosRef.current;
    if (prev && haversineDistanceM(prev.lat, prev.lon, pos.lat, pos.lon) < 120) return;
    lastCenteredPosRef.current = pos;
    setTimeout(() => {
      if (userMovedMapRef.current) return;
      mapRef.current?.animateToRegion(
        { latitude: pos.lat, longitude: pos.lon, latitudeDelta: 0.015, longitudeDelta: 0.012 },
        700
      );
    }, 250);
  }, [mapReady, userRealLocation]);

  const closearrive = (sugges: any) => {
    setarriverselectionner(sugges);
    setInputarrive(sugges.description);
    setIsarrive(false);
    setIseditablearrive(true);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const closeModalnon = async () => {
    if (isEstimating) return;
    setIsEstimating(true);
    setcode("");
    settopview(false);
    // estimateRide affiche ses propres modales d'erreur → on avale ici pour
    // éviter tout rejet de promesse non catché.
    try { await estimateRide(false); } catch {} finally { setIsEstimating(false); }
  };

  const closeModalvalide = async () => {
    if (isEstimating) return;
    setIsEstimating(true);
    settopview(false);
    try { await estimateRide(true); } catch {} finally { setIsEstimating(false); }
  };

  const restoreActiveRide = async () => {
    try {
      const response = await authFetch("/rides/client/current-ride");
      if (!response.ok) return; // Pas de course active → silence

      const json = await response.json();
      const data = json.Data;
      if (!data || !data.ride_id) return;

      const { status, pickup, destination, ride_details, driver, ride_id } = data;

      // Pré-remplir les coords pour toute course active (même "pending")
      // Indispensable pour que getTracky et fetchRouteToDriver fonctionnent
      // quand le ride_accepted arrive après cette restauration
      if (pickup && destination) {
        departCoordRef.current = { lat: pickup.latitude, lon: pickup.longitude };
        arriveCoordRef.current = { lat: destination.latitude, lon: destination.longitude };
        setdeppartselectionner({ description: pickup.location, place_id: "", lat: pickup.latitude, lng: pickup.longitude });
        setarriverselectionner({ description: destination.location, place_id: "", lat: destination.latitude, lng: destination.longitude });
      }

      // ── Pour "pending" : vérifier le vrai statut via l'endpoint de tracking ──
      // Le WS ride_started peut être manqué si l'app était en arrière-plan.
      // getTracky retourne ride_status et détecte automatiquement "in_progress".
      if (status === "pending") {
        getTracky(ride_id);
        return;
      }

      if (status !== "accepted_by_driver" && status !== "in_progress") return;

      // Garde : ces statuts impliquent un chauffeur assigné et des détails de course.
      // Si le backend renvoie une charge incomplète, on abandonne proprement la
      // restauration plutôt que de lever une exception plus bas.
      if (!driver || !ride_details) return;

      // ── Coordonnées ──────────────────────────────────────────────────
      const pickupCoord  = { lat: pickup.latitude,      lon: pickup.longitude };
      const arriveCoord  = { lat: destination.latitude, lon: destination.longitude };
      departCoordRef.current = pickupCoord;
      arriveCoordRef.current = arriveCoord;

      setdeppartselectionner({
        description: pickup.location,
        place_id: "",
        lat: pickup.latitude,
        lng: pickup.longitude,
      });
      setarriverselectionner({
        description: destination.location,
        place_id: "",
        lat: destination.latitude,
        lng: destination.longitude,
      });

      // ── IDs ───────────────────────────────────────────────────────────
      setrideid(ride_id);
      setEventid(ride_id);

      // ── Infos véhicule ────────────────────────────────────────────────
      const vehicle = driver.vehicle || {};
      setVehicleColor(vehicle.color || "");
      setVehiclePhoto(vehicle.photo || "");
      setVehicleModel(vehicle.model || "");
      setVehicleLicensePlate(vehicle.license_plate || "");

      // ── Remap vers la structure infocoursencours ──────────────────────
      const nameParts = (driver.full_name || "").split(" ");
      setinfocoursencours({
        Message: "Ride accepted by driver",
        Driver: {
          first_name: nameParts[0] || "",
          lastname: nameParts.slice(1).join(" ") || "",
          vehicle_model: vehicle.model || "",
          vehicle_brand: vehicle.brand || "",
          license_plate: vehicle.license_plate || "",
          vehicle_color: vehicle.color || "",
          vehicle_photo: vehicle.photo || null,
          profile_picture: driver.profile_picture || null,
          phone_number: driver.phone_number || "",
          grade: driver.grade || "",
          rating: driver.rating ?? null,
        },
        Ride: {
          driver_id: driver.driver_id || "",
          ride_id: ride_id,
          start_location: pickup.location,
          end_location: destination.location,
          destination: destination.location,
          distance: ride_details.distance,
          prestation: ride_details.prestation,
          price: ride_details.final_price,
          mode_of_payments: ride_details.mode_of_payments || "",
        },
      });

      // ── Sauvegarder rideInfo pour la page chat ────────────────────────
      const rideInfoForChat = {
        Driver: {
          first_name: nameParts[0] || "",
          lastname: nameParts.slice(1).join(" ") || "",
          profile_picture: driver.profile_picture || null,
        },
        Ride: {
          driver_id: driver.driver_id || "",
          ride_id: ride_id,
        },
      };
      await AsyncStorage.setItem("rideInfo", JSON.stringify(rideInfoForChat));

      // ── Restaurer l'état de la course ─────────────────────────────────
      setalredyrequest(true);
      setModalinfochauffeur(true);
      setvisible(false);
      stopSearchCountdown();
      stopAvailableDriversRefresh();

      // Force le recalcul du tracé dès le premier message WS (évite le blocage du throttle 60s)
      lastRouteFetchRef.current = 0;
      routeToDriverRef.current = [];
      hasAnimatedTrajectoryRef.current = false;
      getTracky(ride_id);
      // Reconnexion directe au WS de tracking : getTracky peut retourner tôt
      // (endpoint /track en échec ou tracé mal formé) et ne jamais l'appeler,
      // ce qui laisserait la carte sans position chauffeur (pas d'icône).
      // getlocalisationDriver est idempotent → pas de double connexion.
      getlocalisationDriver(ride_id);

      if (status === "in_progress") {
        rideStartedRef.current = true;
        setRideStarted(true);
        if (trajectoryFullRef.current.length >= 2) {
          setDisplayedTrajectory([...trajectoryFullRef.current]);
        }
      }
    } catch (error) {
      // console.log("ℹ️ Pas de course active à restaurer:", error);
    }
  };

  // Maintient alredyreqestRef synchronisé avec le state Zustand
  useEffect(() => {
    alredyreqestRef.current = alredyreqest;
  }, [alredyreqest]);

  useFocusEffect(
    React.useCallback(() => {
      getInfo();
      connectRideStatusWebSocket();
      requestNotificationPermissions();
      checkUnreadNotifications();
      restoreActiveRide();

      // Retour sur l'écran via navigation : relancer si position GPS connue
      const gpsPos = lastGPSPositionRef.current;
      if (gpsPos && !alredyreqestRef.current) {
        startAvailableDriversRefreshWithLocation(gpsPos.lat, gpsPos.lon);
      }

      // Retour au premier plan (app mise en arrière-plan puis rouverte)
      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          restoreActiveRide();
          // Reconnecter les WebSockets potentiellement morts après suspension iOS
          const notifDead = !wsNotifRef.current || wsNotifRef.current.readyState === WebSocket.CLOSED;
          if (notifDead) getInfo();
          const rideDead = !wsRideStatusRef.current || wsRideStatusRef.current.readyState === WebSocket.CLOSED;
          if (rideDead) connectRideStatusWebSocket();
          stopAvailableDriversRefresh();
          const pos = lastGPSPositionRef.current;
          if (pos && !alredyreqestRef.current) {
            startAvailableDriversRefreshWithLocation(pos.lat, pos.lon);
          }
        } else if (nextState === "background") {
          stopAvailableDriversRefresh();
        }
      });

      return () => {
        appStateSub.remove();
        stopAvailableDriversRefresh();
      };
    }, [])
  );

  const handleFocus = () => {
    if (!isClicked) setIsClicked(true);
  };

  const getmylocation = async () => {
    setIsCustomInput(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { alert("Permission de localisation refusée !"); return; }
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    // (A+B) libellé cohérent + repli réseau si le géocodeur natif échoue
    const label = await resolveLocationLabel(latitude, longitude);
    const formattedAddress = label || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    setInputValue("");
    setDepartKey((prevKey) => prevKey + 1);
    setTimeout(() => {
      setInputValue(formattedAddress);
      setdeppartselectionner({ description: formattedAddress, place_id: "", lat: latitude, lng: longitude });
      setDepartKey((prevKey) => prevKey + 1);
      if (arriveInputRef.current) setTimeout(() => arriveInputRef.current?.focus(), 50);
    }, 50);
  };

  const handleinfochauffeur = () => setmodalinfoVisible(true);

  // Décompte VISIBLE de 30 s (court, pas anxiogène). Quand il atteint 0, on
  // CONTINUE de chercher (la cascade backend peut durer ~90 s) — l'échec n'est PAS
  // déclenché ici. L'échec vient du WS `no_driver`, ou du filet invisible à ~100 s.
  const startSearchCountdown = () => {
    setSearchCountdown(30);
    setNoDriverFound(false);
    if (searchCountdownRef.current) clearInterval(searchCountdownRef.current);
    searchCountdownRef.current = setInterval(() => {
      setSearchCountdown(prev => {
        if (prev <= 1) {
          clearInterval(searchCountdownRef.current!);
          searchCountdownRef.current = null;
          return 0; // décompte terminé → on continue de chercher (pas d'échec ici)
        }
        return prev - 1;
      });
    }, 1000);
    // Filet de sécurité invisible : échec à ~100 s si le WS no_driver n'arrive pas.
    if (searchSafetyRef.current) clearTimeout(searchSafetyRef.current);
    searchSafetyRef.current = setTimeout(() => { setNoDriverFound(true); }, 100000);
  };

  const stopSearchCountdown = () => {
    if (searchCountdownRef.current) {
      clearInterval(searchCountdownRef.current);
      searchCountdownRef.current = null;
    }
    if (searchSafetyRef.current) {
      clearTimeout(searchSafetyRef.current);
      searchSafetyRef.current = null;
    }
    setNoDriverFound(false);
  };

  // Affiche l'échec "aucun chauffeur" (piloté par le WS backend `no_driver`).
  const triggerNoDriver = () => {
    if (searchCountdownRef.current) {
      clearInterval(searchCountdownRef.current);
      searchCountdownRef.current = null;
    }
    if (searchSafetyRef.current) {
      clearTimeout(searchSafetyRef.current);
      searchSafetyRef.current = null;
    }
    setNoDriverFound(true);
  };

  const afficheconfort = async () => {
    if (isOrdering) return;
    setIsOrdering(true);
    try {
      await requestRide();
      setrequest(false);
      setvisible(true);
      startSearchCountdown();
      stopAvailableDriversRefresh();
    } catch (_) {
      // requestRide gère ses propres erreurs (modals déjà affichés)
    } finally {
      setIsOrdering(false);
    }
  };

  const onClose = () => {
    setvisible(false);
    stopSearchCountdown();
    cancelcourse();
    // ✅ NOUVEAU : Reprendre le rafraîchissement des chauffeurs
    startAvailableDriversRefresh();
    // Recentrer sur la position de l'utilisateur à l'annulation. La carte d'accueil
    // se remonte après cancelcourse → on réautorise le suivi auto + force un
    // recentrage (lastCenteredPosRef = null), + animation directe (délai pour le mount).
    userMovedMapRef.current = false;
    lastCenteredPosRef.current = null;
    const pos =
      lastGPSPositionRef.current ??
      (userRealLocation ? { lat: userRealLocation.lat, lon: userRealLocation.lon } : null);
    if (pos) {
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          { latitude: pos.lat, longitude: pos.lon, latitudeDelta: 0.015, longitudeDelta: 0.012 },
          600
        );
      }, 500);
    }
  };

  const continuerSansPromo = async () => {
    setModalPromoUsed(false);
    setcode("");
    try { await estimateRide(false); } catch (_) {}
  };

  const relancerRecherche = async () => {
    // Annuler la course précédente côté backend AVANT d'en relancer une nouvelle —
    // sinon le backend répond "you already have a ride". On reste en mode recherche.
    const prevRide = rideid;
    if (prevRide) {
      try { await authFetch(`/rides/client/cancel/${prevRide}`, { method: "POST" }); } catch (_) {}
    }
    setNoDriverFound(false);
    startSearchCountdown();
    requestRide().catch(() => {});
  };

  const cancelcourse = async () => {
    // Nettoyage complet course + carte (identique à la réception d'un
    // "ride_cancelled" par WebSocket) pour revenir proprement à l'état initial.
    const resetAfterCancel = () => {
      // Couper le tracking AVANT de fermer le WS : son onclose ne se reconnecte
      // que si currentTrackingRideIdRef pointe encore sur la course.
      currentTrackingRideIdRef.current = null;
      wsTrackingRef.current?.close();
      wsTrackingRef.current = null;
      // setalredyrequest(false) déclenche l'effet qui vide routes/marqueur/trajectoire.
      setalredyrequest(false);
      setIseditable(true);
      setIsClicked(false);
      settopview(true);
      setDriverETA(null);
      setVehicleColor("");
      setVehiclePhoto("");
      setVehicleModel("");
      setVehicleLicensePlate("");
      // Réafficher immédiatement les chauffeurs disponibles sur la carte par défaut.
      startAvailableDriversRefresh();
    };
    if (!rideid) {
      resetAfterCancel();
      return;
    }
    try {
      await authFetch(`/rides/client/cancel/${rideid}`, { method: "POST" });
    } catch (_) {
      // Annulation best-effort : on nettoie l'UI quoi qu'il arrive
    } finally {
      resetAfterCancel();
    }
  };

  // F5 — Valide une coordonnée avant envoi backend : nombre fini, dans la plage
  // mondiale, et pas l'île nulle (0,0). Évite qu'un NaN (ex. détails Places pourris
  // sur appareil bas de gamme) parte au backend et revienne en rejet "badchoice".
  const isValidLatLon = (lat: any, lon: any): boolean => {
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
    if (la < -90 || la > 90 || lo < -180 || lo > 180) return false;
    if (la === 0 && lo === 0) return false;
    return true;
  };

  // F2 — Calcule l'itinéraire prévu (Google Directions, repli OSRM/ligne droite) et
  // renvoie les coords densifiées. Lancé EN PARALLÈLE de l'estimation des prix pour
  // ne pas ajouter d'aller-retour réseau séquentiel (le tracé est prêt à l'affichage).
  const computePlannedRoute = async (
    depLat: number, depLon: number, arrLat: number, arrLon: number
  ): Promise<{ latitude: number; longitude: number }[]> => {
    if (![depLat, depLon, arrLat, arrLon].every((v) => Number.isFinite(v))) return [];
    let dense: { latitude: number; longitude: number }[] | null = null;

    try {
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${depLat},${depLon}` +
        `&destination=${arrLat},${arrLon}` +
        `&mode=driving&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url, {
        headers: Platform.OS === "android"
          ? { "X-Android-Package": "com.toya.clientapp", "X-Android-Cert": "32912FFD43734CF103FECA672752EB7B969FF128" }
          : { "X-Ios-Bundle-Identifier": "com.toya.clientapp" },
      });
      const data = await res.json();
      if (data.status === "OK" && data.routes?.length) {
        const steps: any[] = data.routes[0].legs?.[0]?.steps ?? [];
        const coords: { latitude: number; longitude: number }[] = [];
        for (const step of steps) {
          for (const [lat, lng] of polyline.decode(step.polyline.points)) {
            coords.push({ latitude: lat, longitude: lng });
          }
        }
        if (coords.length < 2 && data.routes[0].overview_polyline?.points) {
          for (const [lat, lng] of polyline.decode(data.routes[0].overview_polyline.points)) {
            coords.push({ latitude: lat, longitude: lng });
          }
        }
        if (coords.length >= 2) dense = densifyRoute(coords);
      }
    } catch (_) {}

    if (!dense) {
      let coords = await fetchOSRMRoute(depLon, depLat, arrLon, arrLat);
      if (!coords || coords.length < 2) {
        coords = [
          { latitude: depLat, longitude: depLon },
          { latitude: arrLat, longitude: arrLon },
        ];
      }
      dense = densifyRoute(coords);
    }

    return dense ?? [];
  };

  // F2 — Affiche le tracé : recadrage caméra + révélation progressive, à partir de
  // coords DÉJÀ calculées (aucune attente réseau). Déclenché quand le bottom sheet a
  // fini son apparition → le tracé se dessine pile à ce moment-là.
  const revealPlannedRoute = (dense: { latitude: number; longitude: number }[]) => {
    if (!isMountedRef.current || !dense || dense.length < 2) return;
    mapRef.current?.fitToCoordinates(dense, {
      edgePadding: { top: 120, right: 50, bottom: Math.max(Math.round(screenHeight * 0.45), Math.round(sheetOccupiedRef.current) + 28), left: 50 },
      animated: true,
    });
    if (plannedAnimRef.current) { clearInterval(plannedAnimRef.current); plannedAnimRef.current = null; }
    setPlannedRoute([]);
    const total = dense.length;
    const FRAMES = 16;
    const STEP_MS = 45;
    const perStep = Math.max(1, Math.ceil(total / FRAMES));
    let idx = 0;
    plannedAnimRef.current = setInterval(() => {
      idx += perStep;
      if (!isMountedRef.current || idx >= total) {
        setPlannedRoute(dense);
        if (plannedAnimRef.current) { clearInterval(plannedAnimRef.current); plannedAnimRef.current = null; }
      } else {
        setPlannedRoute(dense.slice(0, idx));
      }
    }, STEP_MS);
  };

  const estimateRide = async (valorno: boolean) => {
    // F5 — destination : valider NaN + plage (pas seulement null).
    if (!isValidLatLon(arriveselectionner?.lat, arriveselectionner?.lng)) {
      Alert.alert(t("destination_required"));
      return;
    }
    // Coordonnées de départ : départ choisi → dernière position GPS → position temps réel
    const startLat = departselectionner?.lat ?? lastGPSPositionRef.current?.lat ?? userRealLocation?.lat;
    const startLon = departselectionner?.lng ?? lastGPSPositionRef.current?.lon ?? userRealLocation?.lon;
    // F5 — Garantir des coordonnées de départ valides (null/NaN/plage) avant l'estimation.
    if (!isValidLatLon(startLat, startLon)) {
      Alert.alert(t("location_required"));
      return;
    }
    // F2 — lancer le calcul du tracé EN PARALLÈLE de l'estimation (zéro attente
    // séquentielle) ; il sera révélé quand le bottom sheet aura fini son apparition.
    plannedRoutePromiseRef.current = computePlannedRoute(
      Number(startLat), Number(startLon),
      Number(arriveselectionner?.lat), Number(arriveselectionner?.lng)
    );
    let promo = valorno ? code : "";
    const estimatePayload = {
      code_promo: promo,
      lon_start_location: Number(startLon),
      lon_end_location: Number(arriveselectionner?.lng),
      lat_start_location: Number(startLat),
      lat_end_location: Number(arriveselectionner?.lat),
    };
    try {
      const response = await authFetch("/rides/client/estimate", {
        method: "POST",
        body: JSON.stringify(estimatePayload),
      });
      if (!response.ok) {
        // Lire le corps une fois : diagnostic F4 + vrai message backend.
        let rawBody = "";
        let backendMsg = "";
        try {
          rawBody = await response.text();
          try {
            const parsed = JSON.parse(rawBody);
            backendMsg = parsed?.Message || parsed?.message || parsed?.detail || parsed?.error || "";
          } catch { /* corps non-JSON */ }
        } catch { /* corps illisible */ }
        console.warn(
          `[ESTIMATE ${response.status}] body=${(rawBody || "").slice(0, 300)} | payload=` +
          JSON.stringify(estimatePayload)
        );

        // On n'accuse le promo À TORT : message "code promo" UNIQUEMENT si un promo
        // est réellement en cause (promo envoyé + 404 / message backend promo).
        // Sinon → vrai message backend, ou générique. Plus de faux "code promo expiré".
        const hasPromo = !!(promo && String(promo).trim());
        let errMsg: string;
        if (hasPromo && response.status === 404) {
          errMsg = t("promo_code_not_found");
        } else if (hasPromo && /promo|code/i.test(backendMsg)) {
          errMsg = t("promo_code_invalid");
        } else if (backendMsg) {
          errMsg = String(backendMsg).slice(0, 200);
        } else {
          errMsg = t("badchoice");
        }
        setModalVisible(false);
        settopview(true);
        setIseditable(true);
        setmessageerreur(errMsg);
        setModalerreur(true);
        // Erreur déjà gérée (modale affichée) → on arrête sans propager, sinon
        // les appelants en try/finally sans catch génèrent un rejet non catché.
        return;
      }
      const data = await response.json();
      // Garde : les 3 prestations doivent être présentes (sinon accès
      // data.Data.confort[...] / prestige[...] crasherait sur réponse partielle).
      if (!data?.Data?.economy || !data?.Data?.confort || !data?.Data?.prestige) return;
      const hasPromoDiscount = "Price After Promo Discount" in data.Data.economy;
      const hasDiscount = "Price After Discount" in data.Data.economy;
      const hasFinalPrice = "Final Price" in data.Data.economy;

      if (hasPromoDiscount) {
        setprixeconomy(data.Data.economy["Price After Promo Discount"]);
        setprixconfort(data.Data.confort["Price After Promo Discount"]);
        setprixprestige(data.Data.prestige["Price After Promo Discount"]);
      } else if (hasDiscount) {
        setprixeconomy(data.Data.economy["Price After Discount"]);
        setprixconfort(data.Data.confort["Price After Discount"]);
        setprixprestige(data.Data.prestige["Price After Discount"]);
      } else if (hasFinalPrice) {
        setprixeconomy(data.Data.economy["Final Price"]);
        setprixconfort(data.Data.confort["Final Price"]);
        setprixprestige(data.Data.prestige["Final Price"]);
      } else {
        setprixeconomy(data.Data.economy["Normal Price"]);
        setprixconfort(data.Data.confort["Normal Price"]);
        setprixprestige(data.Data.prestige["Normal Price"]);
      }

      const normalEco = data.Data.economy["Normal Price"] ?? null;
      setnormalprixeconomy(normalEco);
      setnormalprixconfort(data.Data.confort["Normal Price"] ?? null);
      setnormalprixprestige(data.Data.prestige["Normal Price"] ?? null);
      setAppliedDiscount(data.applied_discount ?? null);
      setDistanceKm(data.Data.economy["Distance(Km)"] ?? null);


      seteconomy(data.Data.economy);
      setconfort(data.Data.confort);
      setprestige(data.Data.prestige);
      setModalVisible(false);
      setrequest(true);
      // F2 — le tracé (déjà en calcul) sera révélé via onShown du bottom sheet.
    } catch (error) {
      // console.error("Erreur lors de l'estimation du trajet:", error);
      throw error;
    }
  };

  const requestRide = async () => {
    // F5 — Re-valider départ + destination avant l'envoi (défense en profondeur).
    // On THROW si invalide : le caller (afficheconfort) catch et n'affiche donc PAS
    // la modale "recherche de chauffeur" sur des coordonnées pourries.
    const reqStartLat = departselectionner?.lat ?? lastGPSPositionRef.current?.lat ?? userRealLocation?.lat;
    const reqStartLon = departselectionner?.lng ?? lastGPSPositionRef.current?.lon ?? userRealLocation?.lon;
    if (!isValidLatLon(reqStartLat, reqStartLon)) {
      setmessageerreur(t("location_required"));
      setModalerreur(true);
      throw new Error("invalid_start_coords");
    }
    if (!isValidLatLon(arriveselectionner?.lat, arriveselectionner?.lng)) {
      setmessageerreur(t("destination_required"));
      setModalerreur(true);
      throw new Error("invalid_end_coords");
    }
    const payload = {
      code_promo: code,
      lon_start_location: Number(reqStartLon),
      lon_end_location: Number(arriveselectionner?.lng),
      lat_start_location: Number(reqStartLat),
      lat_end_location: Number(arriveselectionner?.lat),
      prestation: selectedComfort,
      mode_of_payments: modepaiement,
      start_location: departselectionner?.description ?? currentLocationLabel,
      end_location: arriveselectionner?.description,
      // Informatif (n'influe pas sur le prix) : transmis pour affichage côté chauffeur.
      number_of_passengers: passengerCount,
    };
    try {
      const response = await authFetch("/rides/client/request/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let errData: any = null;
        try { errData = await response.json(); } catch (_) {}
        // F4 — diagnostic : statut + retour backend + payload (coords) envoyé.
        console.warn(
          `[REQUEST ${response.status}] body=${(JSON.stringify(errData) || "").slice(0, 300)} | payload=` +
          JSON.stringify(payload)
        );
        const backendMsg: string = errData?.Message || errData?.message || errData?.detail || errData?.error || "";
        const hasPromo = !!(code && String(code).trim());
        // Promo déjà utilisé → modale dédiée
        if (hasPromo && backendMsg.toLowerCase().includes("déjà utilisé")) {
          setrequest(false);
          setModalPromoUsed(true);
          throw new Error("promo_already_used");
        }
        // Ne plus accuser le promo À TORT : on ne montre un message "code promo"
        // QUE si un promo est réellement en cause (code saisi + 404 / message promo).
        // Sinon → vrai message backend, ou message générique (ex. au "réessayer").
        let errMsg: string;
        if (hasPromo && response.status === 404) {
          errMsg = t("promo_code_not_found");
        } else if (hasPromo && /promo|code/i.test(backendMsg)) {
          errMsg = t("promo_code_invalid");
        } else if (backendMsg) {
          errMsg = String(backendMsg).slice(0, 200);
        } else {
          errMsg = t("connection_error");
        }
        setmessageerreur(errMsg);
        setModalerreur(true);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      setalredyrequest(true);
      const data = await response.json();
      const rideid = data.Rides_id;
      setrideid(rideid);
      setinitioaldepart({
        latitude: departselectionner?.lat,
        longitude: departselectionner?.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.04,
      });
      setinitioalarrive({
        latitude: arriveselectionner?.lat,
        longitude: arriveselectionner?.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.04,
      });
    } catch (error: unknown) {
      // Propage l'échec pour que l'appelant (afficheconfort) n'affiche pas
      // le modal de recherche pour une course qui n'a pas été créée.
      throw error;
    }
  };

  const getAccepted = async (idride: any) => {
    try {
      const response = await authFetch(`/rides/driver/${idride}/accepted/`);
      if (!response.ok) return; // réponse d'erreur : ne pas injecter de données vides dans le modal
      const data = await response.json();

      const driver = data.Driver || {};
      if (driver.vehicle_color) setVehicleColor(driver.vehicle_color);
      if (driver.vehicle_photo) setVehiclePhoto(driver.vehicle_photo);
      if (driver.vehicle_model) setVehicleModel(driver.vehicle_model);
      if (driver.license_plate) setVehicleLicensePlate(driver.license_plate);

      setinfocoursencours(data as RideInfo);
      setModalinfochauffeur(true);
      await AsyncStorage.setItem("rideInfo", JSON.stringify(data));
      return data;
    } catch (error) {
      throw error;
    }
  };

  const getstat = async () => {
    try {
      const response = await authFetch(`/clients/stats`);
      if (!response.ok) throw new Error(`Erreur: ${response.status}`);
      const data = await response.json();
      const totalRides = `${data?.Data?.total_rides ?? 0}`;
      await AsyncStorage.setItem("totalride", totalRides);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const getInfo = async () => {
    try {
      const response = await authFetch("/clients/profile/");
      const data = await response.json();
      await AsyncStorage.setItem("Info", JSON.stringify(data));
      if (!data?.Data) return;
      const id = data.Data.id;
      const token = await AsyncStorage.getItem("authToken");
      if (!token) { return; }
      const url = `${WS_BASE_URL}/ws/notifications/${id}/?token=${token}`;

      // Fermer le WS précédent s'il existe
      if (wsNotifRef.current) {
        wsNotifRef.current.close();
        wsNotifRef.current = null;
      }
      const ws = new WebSocket(url);
      wsNotifRef.current = ws;

      ws.onopen = () => {
        wsNotifRetryCount.current = 0;
        if (wsNotifPingIntervalRef.current) clearInterval(wsNotifPingIntervalRef.current);
        wsNotifPingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 30000);
      };

      ws.onmessage = async (event) => {
        if (!isMountedRef.current) return;
        try {
        const parsedData = JSON.parse(event.data) as NotificationWsMessage;
        switch (parsedData.notification_type) {
          case "ride_accepted":
            await sendLocalNotification("Course acceptée !", "Un chauffeur a accepté votre course", { ride_id: parsedData.event_id });
            setnotifaccepted(parsedData);
            setvisible(false);
            stopSearchCountdown();
            setModalinfochauffeur(true);
            setEventid(parsedData.event_id);
            lastRouteFetchRef.current = 0;
            routeToDriverRef.current = [];
            hasAnimatedTrajectoryRef.current = false;
            if (!rideAcceptedProcessingRef.current) {
              rideAcceptedProcessingRef.current = true;
              getTracky(parsedData.event_id);
              getAccepted(parsedData.event_id);
              stopAvailableDriversRefresh();
              setTimeout(() => { rideAcceptedProcessingRef.current = false; }, 5000);
            }
            stopAvailableDriversRefresh();
            break;

          case "ride_started":
            await sendLocalNotification(" Course démarrée !", "Votre chauffeur a démarré la course", { ride_id: parsedData.event_id });
            rideStartedRef.current = true;
            setRideStarted(true);
            lastRouteFetchRef.current = 0;
            setDriverETA(null);
            hasAnimatedTrajectoryRef.current = false;
            if (trajectoryFullRef.current.length >= 2) {
              setDisplayedTrajectory([...trajectoryFullRef.current]);
            } else {
              getTracky(parsedData.event_id);
            }
            break;

          case "ride_completed":
            if (rideCompletedProcessingRef.current) break;
            rideCompletedProcessingRef.current = true;
            await sendLocalNotification("Course terminée !", "Vous êtes arrivé à destination", { ride_id: parsedData.event_id });
            currentTrackingRideIdRef.current = null;
            wsTrackingRef.current?.close();
            setModalinfochauffeur(false);
            setmodalnotechauffeur(true);
            // ✅ Déverrouillage immédiat de la phase 2 (indépendant de la soumission de l'avis).
            // On garde infocoursencour / eventid / rating pour le modal de notation ; leur
            // nettoyage se fait à la fermeture du modal (submitReview / closenotechauffeur).
            rideStartedRef.current = false;
            setRideStarted(false);
            setalredyrequest(false);
            setIseditable(true);
            setIsClicked(false);
            settopview(true);
            startAvailableDriversRefresh();
            setVehicleColor("");
            setVehiclePhoto("");
            setVehicleModel("");
            setVehicleLicensePlate("");
            break;

          case "ride_canceled":
            if (
              currentTrackingRideIdRef.current != null &&
              parsedData.event_id != null &&
              String(parsedData.event_id) !== String(currentTrackingRideIdRef.current)
            ) break;
            await sendLocalNotification("Course annulée", parsedData.message || "La course a été annulée", { ride_id: parsedData.event_id });
            currentTrackingRideIdRef.current = null;
            wsTrackingRef.current?.close();
            setalredyrequest(false);
            setIseditable(true);
            setIsClicked(false);
            settopview(true);
            startAvailableDriversRefresh();
            break;

          case "payment_success":
            await sendLocalNotification("Paiement réussi", "Votre paiement a été effectué avec succès", { transaction_id: parsedData.event_id });
            break;

          case "payment_failed":
            await sendLocalNotification("Échec du paiement", "Le paiement a échoué. Veuillez réessayer", { transaction_id: parsedData.event_id });
            break;

          case "message_received":
            if (parsedData.additional_data?.sender_id !== id) {
              await sendLocalNotification("Nouveau message", parsedData.message || "Vous avez reçu un nouveau message", { from: parsedData.additional_data?.sender_id });
            }
            break;

          default:
            await sendLocalNotification("Notification", parsedData.message || "Nouvelle notification", parsedData);
            break;
        }

        checkUnreadNotifications();
        } catch {}
      };

      ws.onclose = (event) => {
        if (wsNotifPingIntervalRef.current) { clearInterval(wsNotifPingIntervalRef.current); wsNotifPingIntervalRef.current = null; }
        if (!isMountedRef.current) return;
        if (event.code === 1000 || event.code === 4001) { wsNotifRetryCount.current = 0; return; }
        const delay = Math.min(3000 * Math.pow(2, wsNotifRetryCount.current), 30000);
        wsNotifRetryCount.current += 1;
        if (wsNotifReconnectRef.current) clearTimeout(wsNotifReconnectRef.current);
        wsNotifReconnectRef.current = setTimeout(() => { if (isMountedRef.current) getInfo(); }, delay);
      };
      ws.onerror = () => {};
    } catch (error) {
      // console.error("Erreur :", error);
    }
  };

  const connectRideStatusWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) { return; }

      // Fermer le WS précédent + ping orphelin
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      if (wsRideStatusRef.current) {
        wsRideStatusRef.current.close();
        wsRideStatusRef.current = null;
      }

      const url = `${WS_BASE_URL}/ws/ride-status/?token=${token}`;
      const wsRideStatus = new WebSocket(url);
      wsRideStatusRef.current = wsRideStatus;

      wsRideStatus.onopen = () => {
        wsRideStatusRetryCount.current = 0;
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (wsRideStatus.readyState === WebSocket.OPEN) {
            wsRideStatus.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      wsRideStatus.onmessage = async (event) => {
        if (!isMountedRef.current) return;
        try {
        const data = JSON.parse(event.data) as RideStatusWsMessage;
        switch (data.type) {
          case "connection_established":
            break;
          case "searching":
            // Dispatch backend en cours (cascade) → on maintient l'écran de recherche.
            setNoDriverFound(false);
            break;
          case "no_driver":
            // Cascade épuisée / délai dépassé → afficher l'échec (piloté par le backend,
            // plus par le minuteur local de 30 s qui causait le faux "aucun chauffeur").
            triggerNoDriver();
            break;
          case "ride_accepted":
            setvisible(false);
            setModalinfochauffeur(true);
            lastRouteFetchRef.current = 0;
            routeToDriverRef.current = [];
            hasAnimatedTrajectoryRef.current = false;
            if (!rideAcceptedProcessingRef.current) {
              rideAcceptedProcessingRef.current = true;
              getTracky(data.ride_id);
              getAccepted(data.ride_id);
              stopAvailableDriversRefresh();
              setTimeout(() => { rideAcceptedProcessingRef.current = false; }, 5000);
            }
            break;
          case "ride_started":
            rideStartedRef.current = true;
            setRideStarted(true);
            lastRouteFetchRef.current = 0;
            setDriverETA(null);
            hasAnimatedTrajectoryRef.current = false;
            if (trajectoryFullRef.current.length >= 2) {
              setDisplayedTrajectory([...trajectoryFullRef.current]);
            } else {
              getTracky(data.ride_id);
            }
            break;
          case "ride_completed":
            if (rideCompletedProcessingRef.current) break;
            rideCompletedProcessingRef.current = true;
            currentTrackingRideIdRef.current = null;
            wsTrackingRef.current?.close();
            setModalinfochauffeur(false);
            setmodalnotechauffeur(true);
            // ✅ Déverrouillage immédiat de la phase 2 (indépendant de la soumission de l'avis).
            // On garde infocoursencour / eventid / rating pour le modal de notation ; leur
            // nettoyage se fait à la fermeture du modal (submitReview / closenotechauffeur).
            rideStartedRef.current = false;
            setRideStarted(false);
            setalredyrequest(false);
            setIseditable(true);
            setIsClicked(false);
            settopview(true);
            startAvailableDriversRefresh();
            setVehicleColor("");
            setVehiclePhoto("");
            setVehicleModel("");
            setVehicleLicensePlate("");
            break;
          case "ride_cancelled":
            // Compat : le backend envoie aussi ride_cancelled en fin de recherche
            // sans preneur. On affiche l'échec dans la modale de recherche au lieu
            // d'un reset complet (le statut dédié `no_driver` fait la même chose).
            if (data.reason === "no_driver") {
              triggerNoDriver();
              break;
            }
            if (
              currentTrackingRideIdRef.current != null &&
              data.ride_id != null &&
              String(data.ride_id) !== String(currentTrackingRideIdRef.current)
            ) break;
            currentTrackingRideIdRef.current = null;
            wsTrackingRef.current?.close();
            setalredyrequest(false);
            setIseditable(true);
            setIsClicked(false);
            settopview(true);
            startAvailableDriversRefresh();
            break;
          case "pong":
            break;
          default:
            break;
        }
        } catch {}
      };

      wsRideStatus.onerror = () => {};
      wsRideStatus.onclose = (event) => {
        if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
        if (!isMountedRef.current) return;
        if (event.code === 1000 || event.code === 4001) { wsRideStatusRetryCount.current = 0; return; }
        const delay = Math.min(3000 * Math.pow(2, wsRideStatusRetryCount.current), 30000);
        wsRideStatusRetryCount.current += 1;
        if (wsRideStatusReconnectRef.current) clearTimeout(wsRideStatusReconnectRef.current);
        wsRideStatusReconnectRef.current = setTimeout(() => { if (isMountedRef.current) connectRideStatusWebSocket(); }, delay);
      };
    } catch {
      // silently ignore
    }
  };

  const closeinfochauffeur = () => setmodalinfoVisible(false);

  const cancelinfochauffeur = async () => {
    if (isCanceling) return;
    setIsCanceling(true);
    setmodalinfoVisible(false);
    setModalinfochauffeur(false);
    try {
      await cancelcourse();
      startAvailableDriversRefresh();
    } finally {
      setIsCanceling(false);
    }
  };

  const closenotechauffeur = async () => {
    if (isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      await submitReview();
    } finally {
      setIsSubmittingReview(false);
      setmodalnotechauffeur(false);
      rideCompletedProcessingRef.current = false;
    }
  };

  const anulerequest = () => {
    setIseditable(true);
    setIsClicked(false);
    settopview(true);
    setrequest(false);
    // Effacer le tracé et l'animation planifiée pour éviter qu'ils réapparaissent
    // brièvement lors d'une prochaine estimation (isrequest repasse à true avant revealPlannedRoute).
    if (plannedAnimRef.current) { clearInterval(plannedAnimRef.current); plannedAnimRef.current = null; }
    setPlannedRoute([]);
    setarriverselectionner(null);
    setdeppartselectionner(null);
    plannedRoutePromiseRef.current = null;
    // ✅ Reprendre le rafraîchissement si annulation avant commande
    startAvailableDriversRefresh();
    // Recentrer la carte sur la position de l'utilisateur à la fermeture du sheet,
    // et réautoriser le suivi auto (l'utilisateur revient "centré sur lui").
    const pos =
      lastGPSPositionRef.current ??
      (userRealLocation ? { lat: userRealLocation.lat, lon: userRealLocation.lon } : null);
    if (pos) {
      userMovedMapRef.current = false;
      lastCenteredPosRef.current = pos;
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          { latitude: pos.lat, longitude: pos.lon, latitudeDelta: 0.015, longitudeDelta: 0.012 },
          600
        );
      }, 150);
    }
  };

  const submitReview = async () => {
    const idclient = await AsyncStorage.getItem("userId");
    try {
      const reviewData = {
        id: idclient,
        rides_id: eventid,
        client_id: idclient,
        driver_id: infocoursencour?.Ride?.driver_id,
        rating: rating,
        comment: message,
      };
      await authFetch("/rides/client/review/", {
        method: "POST",
        body: JSON.stringify(reviewData),
      });
    } catch (_) {
      // Soumission de l'avis best-effort : un échec réseau ne doit pas
      // empêcher la réinitialisation de l'état de la course.
    } finally {
      // ── Reset état course (toujours, même si l'envoi de l'avis échoue) ──
      setalredyrequest(false);
      setIseditable(true);
      setIsClicked(false);
      settopview(true);

      // ── Reset champs de saisie ──
      setInputValue("");
      setdeppartselectionner(null);
      setarriverselectionner(null);
      departCoordRef.current = null;
      arriveCoordRef.current = null;

      // ── Reset IDs et infos course ──
      setEventid("");
      setrideid("");
      setDriverETA(null);
      setTrajectory([]);
      setDisplayedTrajectory([]);
      setRouteToDriver([]);
      setDisplayedRoute([]);

      // ── Reset notation (prochaine course) ──
      setRating(0);
      setMessage("");

      // ── Nettoyage AsyncStorage ──
      await AsyncStorage.removeItem("rideInfo");

      // ✅ Reprendre le rafraîchissement après fin de course
      startAvailableDriversRefresh();
    }
  };

  const [initialdepart, setinitioaldepart] = useState({
    latitude: 4.0504, longitude: 9.7011, latitudeDelta: 0.06, longitudeDelta: 0.04,
  });
  const [initialarrive, setinitioalarrive] = useState({
    latitude: 4.0504, longitude: 9.7011, latitudeDelta: 0.06, longitudeDelta: 0.04,
  });

  const increment = () => { if (passengerCount < 4) setPassengerCount(passengerCount + 1); };
  const decrement = () => { if (passengerCount > 1) setPassengerCount(passengerCount - 1); };
  const goToNotifications = () => navigation.navigate("Notifications");

  const handleRecenter = () => {
    const pos = lastGPSPositionRef.current;
    if (!pos) return;
    const region = { latitude: pos.lat, longitude: pos.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    if (alredyreqest) {
      activeMapRef.current?.animateToRegion(region, 600);
    } else {
      mapRef.current?.animateToRegion(region, 600);
    }
  };

  const handleQuickEmergencyCall = async (serviceType: 'police' | 'gendarmerie' | 'pompiers') => {
    const phoneNumber = serviceType === 'police' ? '117' : serviceType === 'gendarmerie' ? '113' : '118';
    const serviceName = serviceType === 'police' ? 'Police' : serviceType === 'gendarmerie' ? 'Gendarmerie' : 'Pompiers';
    Vibration.vibrate(100);
    Alert.alert(
      t('sos_call_title'),
      `Ouvrir le clavier pour appeler la ${serviceName} (${phoneNumber}) ?`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => setShowSOSModal(false) },
        {
          text: 'OUVRIR LE CLAVIER',
          style: 'destructive',
          onPress: async () => {
            setShowSOSModal(false);
            Vibration.vibrate(300);
            try {
              await Linking.openURL(`tel:${phoneNumber}`);
            } catch (err) {
              Alert.alert('Erreur', `Impossible d'ouvrir le clavier.\n\nNuméro: ${phoneNumber}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ===== LOADER GPS ===== */}
      {!gpsReady && (
        <Animated.View style={[styles.gpsLoaderContainer, { opacity: loaderOpacity }]}>
          {/* Halo pulsant */}
          <Animated.View style={[styles.gpsLoaderHalo, { transform: [{ scale: loaderPulse }] }]} />
          {/* Cercle central */}
          <View style={styles.gpsLoaderCircle}>
            <Icon source="map-marker-radius" size={36} color="white" />
          </View>
          <Text style={styles.gpsLoaderTitle}>Toya</Text>
          <Text style={styles.gpsLoaderSubtitle}>Localisation en cours...</Text>
          {/* Points animés */}
          <View style={styles.gpsLoaderDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.gpsLoaderDot, { opacity: 0.3 + i * 0.3 }]} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* ===== CONTENU PRINCIPAL (masqué pendant le loader GPS) ===== */}
      {gpsReady && (<>

      {/* ===== CARTE ===== */}
      {alredyreqest ? (
        // Carte pendant une course active
        <MapView
          key="active-ride-map"
          ref={activeMapRef}
          provider={PROVIDER_GOOGLE}
          style={{ position: 'absolute', width: screenWidth, height: screenHeight, top: 0, left: 0 }}
          showsUserLocation={true}
          onUserLocationChange={() => {}}
          showsMyLocationButton={false}
          showsTraffic={false}
          rotateEnabled={false}
          minZoomLevel={10}
          maxZoomLevel={18}
          mapPadding={activeMapPadding}
          initialRegion={{
            latitude: departCoordRef.current?.lat ?? lastGPSPositionRef.current?.lat ?? 3.848,
            longitude: departCoordRef.current?.lon ?? lastGPSPositionRef.current?.lon ?? 11.502,
            latitudeDelta: 0.015,
            longitudeDelta: 0.012,
          }}
          onMapReady={() => {
            setActiveMapPadding({ top: 40, right: 5, bottom: -30, left: 0 });
            lastFitTimeRef.current = 0;
            const coords = rideStarted ? trajectory : routeToDriver;
            if (coords.length >= 2) fitActiveMap(coords);
          }}
        >
          {/* Point de prise en charge — visible avant que la course démarre */}
          {!rideStarted && departselectionner != null && !isNaN(parseFloat(departselectionner.lat)) && (
            <Marker
              coordinate={{ latitude: parseFloat(departselectionner.lat), longitude: parseFloat(departselectionner.lng) }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <View style={{ alignItems: "center" }}>
                <View style={{ backgroundColor: "#1A1A1A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4, elevation: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "white" }} numberOfLines={1}>{t("you_are_here") || "Vous êtes ici"}</Text>
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "white", borderWidth: 3, borderColor: Colors.light.tint, elevation: 4, alignItems: "center", justifyContent: "center" }}>
                  <Icon source="account" size={18} color={Colors.light.tint} />
                </View>
                <View style={{ width: 3, height: 10, backgroundColor: Colors.light.tint }} />
              </View>
            </Marker>
          )}

          {/* Destination — visible uniquement en phase 2 (course démarrée) */}
          {rideStarted && arriveselectionner != null && !isNaN(parseFloat(arriveselectionner.lat)) && (
            <Marker
              coordinate={{ latitude: parseFloat(arriveselectionner.lat), longitude: parseFloat(arriveselectionner.lng) }}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.tint, borderWidth: 3, borderColor: "white", elevation: 4, alignItems: "center", justifyContent: "center" }}>
                  <Icon source="flag-checkered" size={18} color="white" />
                </View>
                <View style={{ width: 3, height: 10, backgroundColor: Colors.light.tint }} />
              </View>
            </Marker>
          )}

          {/* Marqueur chauffeur — hasDriverLocation ne change qu'une fois → pas de re-render à chaque position WS */}
          {hasDriverLocation && activeRideDriverAnimRegionRef.current != null && (
            <ActiveRideDriverMarker
              animRegion={activeRideDriverAnimRegionRef.current}
              headingAnim={activeRideHeadingAnimRef.current}
              driverETA={driverETA}
            />
          )}

          {/* Tracé trafic : chauffeur → pickup (découplé de hasDriverLocation : dessiné dès que les coords existent) */}
          {displayedRoute.length > 1 && !rideStarted && (
            <Polyline coordinates={displayedRoute} strokeWidth={5} strokeColor={routeColor} />
          )}
          {/* Point fin du tracé phase 1 */}
          {routeToDriver.length > 1 && !rideStarted && (<>
            <Circle center={routeToDriver[routeToDriver.length - 1]} radius={14} fillColor="white" strokeColor={Colors.light.tint} strokeWidth={4} />
            <Circle center={routeToDriver[routeToDriver.length - 1]} radius={7} fillColor={Colors.light.tint} strokeColor="transparent" strokeWidth={0} />
          </>)}

          {/* Tracé de la course complète (animé progressivement) — découplé de hasDriverLocation */}
          {displayedTrajectory.length > 1 && (
            <Polyline coordinates={displayedTrajectory} strokeWidth={4} strokeColor={Colors.light.tint} />
          )}
          {/* Point fin du tracé phase 2 */}
          {trajectory.length > 1 && (<>
            <Circle center={trajectory[trajectory.length - 1]} radius={14} fillColor="white" strokeColor={Colors.light.tint} strokeWidth={4} />
            <Circle center={trajectory[trajectory.length - 1]} radius={7} fillColor={Colors.light.tint} strokeColor="transparent" strokeWidth={0} />
          </>)}
        </MapView>
      ) : (
        // Carte principale avec chauffeurs disponibles
        <MapView
          key="idle-map"
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ position: 'absolute', width: screenWidth, height: screenHeight, top: 0, left: 0 }}
          onPanDrag={() => { userMovedMapRef.current = true; }}
          showsUserLocation={true}
          onUserLocationChange={() => {}}
          showsMyLocationButton={false}
          showsTraffic={false}
          showsBuildings={false}
          showsIndoors={false}
          rotateEnabled={false}
          minZoomLevel={12}
          maxZoomLevel={18}
          initialRegion={camerounRegion}
          onMapReady={() => setMapReady(true)}
        >
          {/* ✅ NOUVEAU : Marqueurs des chauffeurs disponibles */}
          {availableDrivers.map((driver) => {
            const animRegion   = animatedRegionsRef.current.get(driver.driver_id);
            const headingValue = headingAnimValuesRef.current.get(driver.driver_id);
            const opacityValue = driverOpacityRef.current.get(driver.driver_id);
            if (!animRegion || !headingValue || !opacityValue) return null;

            return (
              <AvailableDriverMarker
                key={driver.driver_id}
                animRegion={animRegion}
                headingValue={headingValue}
                opacityValue={opacityValue}
                vehicleColor={driver.vehicle_color}
              />
            );
          })}

          {/* F2 — Itinéraire prévu (départ→destination) affiché dès l'estimation */}
          {isrequest && plannedRoute.length > 1 && (
            <Polyline coordinates={plannedRoute} strokeWidth={5} strokeColor={Colors.light.tint} />
          )}
          {isrequest && departselectionner != null && !isNaN(parseFloat(departselectionner.lat)) && (
            <Marker
              coordinate={{ latitude: parseFloat(departselectionner.lat), longitude: parseFloat(departselectionner.lng) }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "white", borderWidth: 4, borderColor: Colors.light.tint }} />
            </Marker>
          )}
          {isrequest && arriveselectionner != null && !isNaN(parseFloat(arriveselectionner.lat)) && (
            <Marker
              coordinate={{ latitude: parseFloat(arriveselectionner.lat), longitude: parseFloat(arriveselectionner.lng) }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <View style={{ width: 46, height: 50, alignItems: "center" }}>
                <Icon source="map-marker" size={46} color="#E53935" />
                {/* point blanc dans la tête du pin */}
                <View style={{ position: "absolute", top: 9, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "white" }} />
              </View>
            </Marker>
          )}

        </MapView>
      )}

      {/* ===== BARRE DE RECHERCHE ===== */}
      {topview && !isrequest && !alredyreqest && !visible && !modalinfochauffeur && !modalVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.inputWithIconContainer}>
            <View style={styles.externalIcon}>
              <Icon source="directions" size={20} color="white" />
            </View>
            {isCustomInput ? (
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={inputValue}
                placeholder={currentLocationLabel || t("from")}
                editable={true}
                onFocus={() => setIsCustomInput(false)}
                onChangeText={setInputValue}
              />
            ) : (
              <GooglePlacesAutocomplete
                key={`depart-${departKey}`}
                placeholder={currentLocationLabel || t("from")}
                minLength={3}
                debounce={500}
                autoFocus={false}
                returnKeyType={"search"}
                listViewDisplayed="auto"
                fetchDetails={true}
                isNewPlacesAPI={true}
                fields="location,id,formattedAddress,displayName"
                requestUrl={{ useOnPlatform: "all", url: "https://places.googleapis.com", headers: { "Content-Type": "application/json" } }}
                onPress={(data, details = null) => {
                  departPlacesTokenRef.current = genPlacesToken();
                  if (details?.location) {
                    const selectedPlace = {
                      description: data.description,
                      place_id: data.place_id,
                      lat: details.location.latitude,
                      lng: details.location.longitude,
                    };
                    setdeppartselectionner(selectedPlace);
                    setInputValue(data.structured_formatting?.main_text || data.description);
                    setIsCustomInput(true);
                  }
                }}
                query={{ key: GOOGLE_PLACES_WEB_API_KEY, languageCode: "fr", includedRegionCodes: ["cm"] }}
                renderDescription={(row) => row.structured_formatting?.main_text || row.description}
                styles={{
                  container: { ...styles.autocompleteItemContainer, zIndex: 9999, flex: 1 },
                  textInputContainer: styles.textInputContainer,
                  textInput: styles.textInput,
                  listView: { ...styles.listView, marginTop: 70 },
                  description: styles.description,
                  row: styles.suggestionRow,
                }}
                renderRightButton={() => (
                  <View style={styles.rightInputButton}>
                    <Icon source="map-marker-radius" size={22} color="#6B4FFF" />
                  </View>
                )}
                enablePoweredByContainer={false}
                textInputProps={{ placeholder: currentLocationLabel || t("from") }}
              />
            )}
          </View>

          <View style={styles.inputWithIconContainer}>
            <View style={styles.externalIcon}>
              <Icon source="map-marker" size={20} color="white" />
            </View>
            <GooglePlacesAutocomplete
              key="arrive"
              ref={arriveInputRef}
              placeholder={t("to")}
              minLength={3}
              debounce={500}
              autoFocus={false}
              returnKeyType={"search"}
              listViewDisplayed="auto"
              fetchDetails={true}
              isNewPlacesAPI={true}
              fields="location,id,formattedAddress,displayName"
              requestUrl={{ useOnPlatform: "all", url: "https://places.googleapis.com", headers: { "Content-Type": "application/json" } }}
              onPress={(data, details = null) => {
                arrivePlacesTokenRef.current = genPlacesToken();
                if (!details?.location) {
                  Alert.alert(t("location_details_error"));
                  return;
                }
                const selectedPlace = {
                  description: data.description,
                  place_id: data.place_id,
                  lat: details.location.latitude,
                  lng: details.location.longitude,
                };
                setarriverselectionner(selectedPlace);
                const displayText = data.structured_formatting?.main_text || data.description;
                setInputarrive(displayText);
                arriveInputRef.current?.setAddressText(displayText);
                setModalVisible(true);
              }}
              query={{ key: GOOGLE_PLACES_WEB_API_KEY, languageCode: "fr", includedRegionCodes: ["cm"] }}
              renderDescription={(row) => row.structured_formatting?.main_text || row.description}
              styles={{
                container: { ...styles.autocompleteItemContainer, zIndex: 9998, flex: 1 },
                textInputContainer: styles.textInputContainer,
                textInput: styles.textInput,
                listView: styles.listView,
                description: styles.description,
                row: styles.suggestionRow,
              }}
              enablePoweredByContainer={false}
              textInputProps={{ placeholder: t("to") }}
            />
          </View>

        </View>
      )}

      {/* ===== MÉTÉO (en bas à droite) ===== */}
      {topview && !isrequest && !alredyreqest && !visible && !modalinfochauffeur && !modalVisible && (
        <View style={styles.weatherBottomRight}>
          <WeatherWidget weather={weather} />
        </View>
      )}

      {/* ===== MODAL CHOIX PRESTATION ===== */}
      <ServicePickerModal
        visible={isrequest}
        economy={economy}
        confort={confort}
        prestige={prestige}
        prixeconomy={prixeconomy}
        prixconfort={prixconfort}
        prixprestige={prixprestige}
        normalprixeconomy={normalprixeconomy}
        normalprixconfort={normalprixconfort}
        normalprixprestige={normalprixprestige}
        appliedDiscount={appliedDiscount}
        distanceKm={distanceKm}
        selectedComfort={selectedComfort}
        onSelectComfort={setSelectedComfort}
        passengerCount={passengerCount}
        onIncrement={increment}
        onDecrement={decrement}
        modepaiement={modepaiement}
        onChangePaiement={setmodepaiement}
        onOrder={afficheconfort}
        onClose={anulerequest}
        isOrdering={isOrdering}
        onHeight={(h) => { sheetOccupiedRef.current = h; }}
        onShown={() => { plannedRoutePromiseRef.current?.then((d) => revealPlannedRoute(d)).catch(() => {}); }}
      />

      {/* ===== MODAL CODE PROMO DÉJÀ UTILISÉ ===== */}
      <Modal animationType="fade" transparent={true} visible={modalPromoUsed} onRequestClose={() => setModalPromoUsed(false)}>
        <View style={styles.promoUsedOverlay}>
          <View style={styles.promoUsedContent}>
            <Text style={styles.promoUsedTitle}>{t("promo_already_used_title")}</Text>
            <Text style={styles.promoUsedMessage}>{t("promo_already_used_message")}</Text>
            <TouchableOpacity style={styles.promoUsedBtnPrimary} onPress={continuerSansPromo}>
              <Text style={styles.promoUsedBtnPrimaryText}>{t("continue_without_promo")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promoUsedBtnSecondary} onPress={() => setModalPromoUsed(false)}>
              <Text style={styles.promoUsedBtnSecondaryText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== MODAL ERREUR ===== */}
      <ErrorModal
        visible={modalerreur}
        message={messageerreur}
        onClose={() => setModalerreur(false)}
      />

      {/* ===== MODAL CODE PROMO ===== */}
      <PromoCodeModal
        visible={modalVisible}
        code={code}
        onChangeCode={setcode}
        onValidate={closeModalvalide}
        onIgnore={closeModalnon}
        onClose={closeModal}
        isEstimating={isEstimating}
      />

      {/* ===== MODAL RECHERCHE CHAUFFEUR ===== */}
      <SearchingDriverModal
        visible={visible}
        noDriverFound={noDriverFound}
        searchCountdown={searchCountdown}
        onCancel={onClose}
        onRetry={relancerRecherche}
      />

      {/* ===== BARRE CHAUFFEUR ACCEPTÉ ===== */}
      {modalinfochauffeur && infocoursencour?.Driver && (
        <View style={styles.modalBackground}>
          <View style={styles.modalContainerdepo}>
            <View style={styles.rowContainer}>
              <Image
                style={styles.profileImage}
                source={
                  infocoursencour.Driver.profile_picture
                    ? { uri: infocoursencour.Driver.profile_picture }
                    : require("../assets/images/profile.jpg")
                }
              />
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.userNamedepo} numberOfLines={1} ellipsizeMode="tail">
                  {infocoursencour.Driver.first_name} {infocoursencour.Driver.lastname}
                </Text>
              </View>
              <TouchableOpacity style={styles.dropButton} onPress={handleinfochauffeur}>
                <Text style={styles.dropButtonText}>{t("information")}</Text>
              </TouchableOpacity>
              {!rideStarted && infocoursencour.Driver.phone_number ? (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${infocoursencour.Driver.phone_number}`)}
                >
                  <Icon source="phone" size={20} color="white" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => navigation.navigate("chatcontent", {
                  paramName: {
                    ride_id: eventid,
                    driver_id: infocoursencour?.Ride?.driver_id,
                  },
                })}
              >
                <Icon source="message" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ===== MODAL INFO CHAUFFEUR ===== */}
      <DriverInfoModal
        visible={modalinfoVisible}
        infocoursencour={infocoursencour}
        vehiclePhoto={vehiclePhoto}
        vehicleModel={vehicleModel}
        vehicleColor={vehicleColor}
        vehicleLicensePlate={vehicleLicensePlate}
        rideStarted={rideStarted}
        isCanceling={isCanceling}
        onClose={closeinfochauffeur}
        onCancel={cancelinfochauffeur}
        getVehicleColorHex={getVehicleColorHex}
        getVehicleColorLabel={getVehicleColorLabel}
      />

      {/* ===== MODAL NOTE CHAUFFEUR ===== */}
      <ReviewModal
        visible={modalnotechauffeur}
        driverFirstName={infocoursencour.Driver.first_name}
        rating={rating}
        labels={labels}
        message={message}
        isSubmittingReview={isSubmittingReview}
        onChangeRating={setRating}
        onChangeMessage={setMessage}
        onClose={closenotechauffeur}
      />

      {/* ===== BOUTON RECENTRAGE ===== */}
      {topview && !isClicked && !modalVisible && !modalinfoVisible && !modalnotechauffeur && !modalerreur && !visible && !isSuggestionModalVisible && (
        <TouchableOpacity style={styles.recenterButton} activeOpacity={0.7} onPress={handleRecenter}>
          <Icon source="crosshairs-gps" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
      )}

      {/* ===== BOUTON NOTIFICATIONS ===== */}
      {topview && !isClicked && !alredyreqest && !modalVisible && !modalinfochauffeur && !modalinfoVisible && !modalnotechauffeur && !modalerreur && !visible && !isSuggestionModalVisible && (
        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7} onPress={goToNotifications}>
          <Icon source="bell" size={28} color="white" />
          {hasUnreadNotifications && <View style={styles.notificationDot} />}
        </TouchableOpacity>
      )}

      {/* ===== BOUTON SOS — visible uniquement pendant le trajet (ride_started) ===== */}
      {rideStarted && (
        <TouchableOpacity
          style={styles.sosButton}
          activeOpacity={0.7}
          onPress={() => { Vibration.vibrate(100); setShowSOSModal(true); }}
        >
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>SOS</Text>
        </TouchableOpacity>
      )}

      {/* ===== MODAL SOS ===== */}
      <SOSModal
        visible={showSOSModal}
        onClose={() => { Vibration.vibrate(50); setShowSOSModal(false); }}
        onCallPolice={() => handleQuickEmergencyCall('police')}
        onCallGendarmerie={() => handleQuickEmergencyCall('gendarmerie')}
        onCallPompiers={() => handleQuickEmergencyCall('pompiers')}
      />

      </>)}{/* fin gpsReady */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rightInputButton: { justifyContent: "center", alignItems: "center", height: "100%", paddingHorizontal: 10 },
  inputWithIconContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingHorizontal: 10 },
  externalIcon: { marginRight: 10 },
  weatherBottomRight: {
    position: "absolute",
    bottom: 550,   // remonté encore plus haut
    right: 25,
    zIndex: 50,
  },
  searchContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 20,
    backgroundColor: "#6B4FFF",
    padding: 15,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    overflow: "visible",
  },
  autocompleteItemContainer: { flex: 0, minHeight: 48, marginBottom: 10, overflow: "visible", zIndex: 9999, elevation: 20 },
  textInputContainer: { backgroundColor: "white", borderRadius: 12, borderTopWidth: 0, borderBottomWidth: 0, marginHorizontal: 0, padding: 0, flexDirection: "row", alignItems: "center" },
  textInput: { height: 48, color: "#000", fontSize: 16, borderRadius: 12, paddingLeft: 15, paddingRight: 15, backgroundColor: "white", flex: 1 },
  inputIcon: { paddingHorizontal: 10, paddingTop: 4 },
  listView: { position: "absolute", top: 55, left: 0, right: 0, backgroundColor: "white", borderRadius: 8, zIndex: 9999, elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  suggestionRow: { padding: 10, backgroundColor: "white", flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ccc" },
  description: { color: "black" },

  // ✅ NOUVEAU : Compteur chauffeurs disponibles
  driversCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 5,
    alignSelf: "flex-start",
  },
  driversCountText: { color: "white", fontSize: 12, fontWeight: "600", marginLeft: 5 },

  // ✅ NOUVEAU : Marqueur chauffeur sur la carte
  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    position: "relative",
  },
  driverMarkerImage: { width: 38, height: 38, borderRadius: 19 },
  driverMarkerPlaceholder: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  vehicleColorBadge: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: "white" },

  rowContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, marginHorizontal: 16 },
  containe: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 4, width: 100, height: 40 },
  inpu: { flex: 1, textAlign: "center", fontSize: 16, padding: 0 },
  buttonContainer: { justifyContent: "center" },
  butto: { height: 20, justifyContent: "center", alignItems: "center" },
  buttonTex: { fontSize: 16, fontWeight: "bold" },
  boutton: { marginTop: "20%", justifyContent: "center", alignItems: "center", flexDirection: "row" },
  closeInfochauffeur: { width: "40%", borderRadius: 10, marginHorizontal: 15, paddingVertical: 12, backgroundColor: Colors.light.tint, alignItems: "center" },
  refuser: { width: "40%", borderRadius: 10, borderWidth: 2, borderColor: Colors.light.tint, marginHorizontal: 15, paddingVertical: 12, alignItems: "center" },
  starsContainer: { flexDirection: "row" },
  star: { marginHorizontal: 5 },
  label: { marginTop: 10, fontSize: 16, color: "#757575" },
  closeInfo: { borderRadius: 10, marginHorizontal: 15, paddingVertical: 20, backgroundColor: Colors.light.tint, alignItems: "center" },
  serviceLeft: { flex: 1, paddingRight: 10 },
  textButtonAddCredit: { color: "#fff", fontSize: 16 },
  departdestination: { flexDirection: "row", opacity: 0.6, marginLeft: 0 },
  dropButton: { backgroundColor: "#7D5FFF", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
  dropButtonText: { color: "white", fontWeight: "600" },
  chatIcon: { padding: 10, borderRadius: 25, backgroundColor: "#e6e6e6" },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  userNamedepo: { fontSize: 14, fontWeight: "500", color: "#000" },
  modalContainerdepo: { width: "95%", backgroundColor: "transparent" },
  userInfodepo: { flexDirection: "row", alignItems: "center" },
  modalBackground: { position: "absolute", bottom: 130, left: 0, right: 0, alignItems: "center" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  modalContainerrecherche: { width: 300, padding: 20, backgroundColor: "#ffffff", borderRadius: 10, alignItems: "center" },
  iconContainer: { marginBottom: 15, alignItems: "center", justifyContent: "center" },
  iconPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#e0e0e0", alignItems: "center", justifyContent: "center" },
  titlerecherche: { fontSize: 18, fontWeight: "bold", marginBottom: 5, color: "#000" },
  countdownText: { fontSize: 22, fontWeight: "600", color: "#6D56F2", marginBottom: 20, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: "#757575", marginBottom: 20 },
  buttonrecherche: { marginTop: 15, paddingVertical: 10, paddingHorizontal: 30, backgroundColor: "#e0e0e0", borderRadius: 5, borderWidth: 1, borderColor: "#9c27b0", width: "90%" },
  buttonTextrecherche: { alignSelf: "center", color: "#9c27b0", fontWeight: "bold" },
  selectedItem: { backgroundColor: "#e0e0e0" },
  container: { flex: 1, padding: 20, backgroundColor: "#F8F8F8" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, color: "#000" },
  passengerContainer: { alignItems: "center", justifyContent: "center", marginBottom: 20, padding: 10, borderWidth: 1, borderColor: "#CCC", borderRadius: 8, width: 60 },
  passengerCount: { fontSize: 18 },
  serviceItem: { flexDirection: "row", padding: 15, borderWidth: 1, borderColor: "#CCC", borderRadius: 8, marginBottom: 10 },
  serviceText: { fontSize: 16, fontWeight: "bold", color: "#000" },
  serviceDetails: { fontSize: 14, color: "#777" },
  button: { backgroundColor: "#6C63FF", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  card: { marginTop: 20, width: "90%", flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", padding: 10, borderRadius: 10 },
  rewardButtonText: { color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" },
  rewardButton: { backgroundColor: "#6200EE", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  headerContent: { flex: 1, alignItems: "center", marginBottom: 12 },
  infoContent: { justifyContent: "space-between", margin: 8, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
  headerImage: { width: 60, height: 60, borderRadius: 100 },
  closeButton: { position: "absolute", top: 10, right: 10 },
  modalAddCreditContainer: { width: "98%", alignSelf: "center", flex: 1, justifyContent: "center", paddingTop: 20, paddingBottom: 100 },
  modalAddCreditContent: { minHeight: 555, backgroundColor: "white", borderRadius: 10, padding: 20, margin: 15 },
  safeArea: { flex: 1 },
  gpsLoaderContainer: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#0F0C29",
    alignItems: "center", justifyContent: "center",
    zIndex: 9999,
  },
  gpsLoaderHalo: {
    position: "absolute",
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(109, 86, 242, 0.25)",
  },
  gpsLoaderCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#6D56F2",
    alignItems: "center", justifyContent: "center",
    elevation: 8,
    shadowColor: "#6D56F2", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 12,
  },
  gpsLoaderTitle: {
    marginTop: 24, fontSize: 28, fontWeight: "800",
    color: "white", letterSpacing: 2,
  },
  gpsLoaderSubtitle: {
    marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  gpsLoaderDots: {
    flexDirection: "row", marginTop: 20, gap: 8,
  },
  gpsLoaderDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#6D56F2",
  },
  topViewLeft: { position: "absolute", top: 25, left: 20, width: "90%", padding: 15, borderRadius: 20, backgroundColor: "#6B4FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5 },
  alignRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  serviceRight: { maxWidth: 100, alignItems: "flex-end" },
  serviceOption: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  serviceOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: "#f3f0ff",
  },
  serviceLabel: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
  },
  input: { flex: 1, backgroundColor: "white", padding: 10, borderRadius: 10, marginLeft: 10, color: "#333" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: "#ddd", marginLeft: 10, width: "90%" },
  messageButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "#000", justifyContent: "center", alignItems: "center" },
  callButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#43A047", justifyContent: "center", alignItems: "center", marginHorizontal: 4 },
  locationButton: { padding: 8, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  icon: { marginRight: 10 },
  separator: { height: 1, backgroundColor: "black", opacity: 0.1, marginVertical: 10, padding: 1 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { width: 300, padding: 20, backgroundColor: "white", borderRadius: 20, alignItems: "center" },
  modalTitle: { fontSize: 25, fontWeight: "bold", marginBottom: 10, color: "#000" },
  modalText: { fontSize: 15, fontWeight: "300", textAlign: "center" },
  modalButton: { marginTop: 15, width: 250, borderRadius: 25, paddingVertical: 10, backgroundColor: Colors.light.tint, alignItems: "center" },
  modalButtonText: { color: "#fff", fontSize: 16 },
  messageText: { marginBottom: 20, fontSize: 16 },
  modalContainererreur: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  modalContenterreur: { width: "80%", padding: 20, backgroundColor: "white", borderRadius: 10 },
  inputContainer: { flexDirection: "row", alignItems: "center", position: "relative", width: "100%" },

  promoUsedOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  promoUsedContent: { width: "85%", backgroundColor: "white", borderRadius: 20, padding: 24, alignItems: "center" },
  promoUsedTitle: { fontSize: 18, fontWeight: "700", color: "#000", textAlign: "center", marginBottom: 12 },
  promoUsedMessage: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  promoUsedBtnPrimary: { width: "100%", backgroundColor: Colors.light.tint, paddingVertical: 13, borderRadius: 30, alignItems: "center", marginBottom: 10 },
  promoUsedBtnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  promoUsedBtnSecondary: { width: "100%", paddingVertical: 11, borderRadius: 30, alignItems: "center", borderWidth: 1, borderColor: "#ccc" },
  promoUsedBtnSecondaryText: { color: "#555", fontSize: 15 },
  recenterButton: { position: "absolute", bottom: 215, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: "white", justifyContent: "center", alignItems: "center", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  notificationButton: { position: "absolute", bottom: 145, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.light.tint, justifyContent: "center", alignItems: "center", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  notificationDot: { position: "absolute", top: 8, right: 8, backgroundColor: "red", borderRadius: 6, width: 12, height: 12, borderWidth: 2, borderColor: "white" },

  sosButton: { position: "absolute", bottom: 285, right: 25, width: 68, height: 68, borderRadius: 34, backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center", elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, borderWidth: 3, borderColor: "white" },
  sosModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)", justifyContent: "center", alignItems: "center" },
  sosModalContent: { width: "88%", maxWidth: 400, backgroundColor: "white", borderRadius: 25, padding: 30, alignItems: "center", elevation: 10 },
  sosHeader: { alignItems: "center", marginBottom: 25 },
  sosTitle: { fontSize: 32, fontWeight: "bold", color: "#FF3B30", marginTop: 15, letterSpacing: 1 },
  sosSubtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 30, lineHeight: 22 },
  emergencyButton: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FF3B30", paddingVertical: 18, paddingHorizontal: 20, borderRadius: 15, marginBottom: 15, elevation: 4 },
  emergencyButtonText: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 12 },
  sosCancelButton: { width: "100%", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 15, borderWidth: 2, borderColor: "#CCCCCC", marginTop: 15, backgroundColor: "#F5F5F5" },
  sosCancelButtonText: { color: "#666", fontSize: 17, fontWeight: "600", textAlign: "center" },

  // ✅ NOUVEAU : Styles véhicule dans barre chauffeur
  vehicleColorRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  vehicleColorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginRight: 5 },
  vehicleColorText: { fontSize: 11, color: "#666" },

  // ✅ NOUVEAU : Styles photo véhicule dans modal info
  driverAvatarOverlay: {
    position: "absolute",
    bottom: 30,
    right: 12,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  vehiclePhotoContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "visible",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    position: "relative",
  },
  vehiclePhotoImage: { width: "100%", height: 130, borderRadius: 12 },
  vehiclePhotoInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f9f9f9" },
  vehicleModelText: { fontSize: 13, fontWeight: "600", color: "#333" },
  vehicleColorBadgeRow: { flexDirection: "row", alignItems: "center" },
  vehicleColorDotSmall: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, marginRight: 5 },
  vehicleColorSmallText: { fontSize: 12, color: "#555" },
});
