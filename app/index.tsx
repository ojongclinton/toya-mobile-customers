// import {
//   Text,
//   View,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   Switch,
//   ActivityIndicator,Modal,
// } from "react-native";
// import * as SplashScreen from "expo-splash-screen";
// import { useEffect, useState } from "react";
// import { Eye, EyeOff } from "lucide-react-native";
// import { Colors } from "@/constants/Colors";
// import BASE_URL from "../constants/api/BASE_URL";
// import i18n from "./translation";
// import { useTranslation } from "react-i18next";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// SplashScreen.preventAutoHideAsync();

// export default function Index({ navigation }: { navigation: any }) {
//   const { t } = useTranslation();

//   const [loading, setLoading] = useState(false);
//   const [isEnabled, setIsEnabled] = useState(true);
//   const [language, setLanguage] = useState("fr");
//   const [focusedInput, setFocusedInput] = useState("");
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [errorMessage, setErrorMessage] = useState("");

//   const [otpModalVisible, setOtpModalVisible] = useState(false);
// const [otpCode, setOtpCode] = useState("");
// const [isResendingOtp, setIsResendingOtp] = useState(false);

//   const formattedNumber = phoneNumber
//     ? phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
//     : "";

//   useEffect(() => {
//     const prepareSplash = async () => {
//       try {
//         const token = await AsyncStorage.getItem("authToken");
//         await new Promise((resolve) => setTimeout(resolve, 3000));
//         if (token) {
//           navigation.replace("MainTabs");
//         }
//       } catch (e) {
//         console.warn(e);
//       } finally {
//         await SplashScreen.hideAsync();
//       }
//     };

//     prepareSplash();
//   }, []);

//   const handlePhoneChange = (value: string) => {
//     let cleanValue = value.replace(/\D/g, "");
//     if (cleanValue.length > 9) {
//       cleanValue = cleanValue.slice(0, 9);
//     }
//     setPhoneNumber(cleanValue);
//   };

//   const toggleSwitch = () => {
//     const newLang = isEnabled ? "en" : "fr";
//     changeLanguage(newLang);
//     setLanguage(newLang);
//     setIsEnabled((prev) => !prev);
//   };

//   const changeLanguage = (lang: string) => {
//     i18n.changeLanguage(lang);
//     AsyncStorage.setItem("language", lang);
//   };

//   const connect = async () => {
//     const formattedPhone = "+237" + phoneNumber;
//     if (!phoneNumber.trim() || !password.trim()) {
//       setErrorMessage("Veuillez remplir les champs obligatoires !");
//       setTimeout(() => setErrorMessage(""), 1500);
//       return;
//     }
//     setLoading(true);
//     try {
//       const response = await fetch(BASE_URL + "/clients/auth/login/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({
//           phone_number: formattedPhone,
//           password: password,
//         }),
//       });

//       const data = await response.json();

//       console.log(data)

//   // ✅ NOUVEAU CODE
// if (data.verification_required === true) {
//     setLoading(false); // Arrêter le loader
//     setOtpModalVisible(true); // Ouvrir la modal OTP
//     requestOtp(); // Envoyer automatiquement le code OTP
//     return; // Arrêter l'exécution
// }

//       if (response.ok) {
//         await AsyncStorage.setItem("userId", data.Id);
//         await AsyncStorage.setItem("authToken", data.Tokens.access);
//         await AsyncStorage.setItem("language", language);
//         navigation.replace("MainTabs");
//       } else {
//         setErrorMessage("Numéro ou mot de passe invalide !");
//         setTimeout(() => setErrorMessage(""), 1500);
//       }
//     } catch (err) {
//       console.error("Erreur lors de la connexion :", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleOtpChange = (value: string) => {
//   let cleanValue = value.replace(/\D/g, "");
//   if (cleanValue.length > 6) {
//     cleanValue = cleanValue.slice(0, 6);
//   }
//   setOtpCode(cleanValue);
// };

// const requestOtp = async () => {
//   const formattedPhone = "+237" + phoneNumber;
//   setIsResendingOtp(true);
  
//   try {
//     const response = await fetch(BASE_URL + "/clients/auth/request-signup-otp/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       body: JSON.stringify({
//         phone_number: formattedPhone,
//       }),
//     });

//     const data = await response.json();

//     if (response.ok) {
//       setErrorMessage("Code OTP envoyé par SMS !");
//       setTimeout(() => setErrorMessage(""), 2000);
//     } else {
//       setErrorMessage(data.Message || "Erreur lors de l'envoi du code");
//       setTimeout(() => setErrorMessage(""), 2000);
//     }
//   } catch (error) {
//     console.error("Erreur lors de l'envoi OTP:", error);
//     setErrorMessage("Erreur de connexion");
//     setTimeout(() => setErrorMessage(""), 2000);
//   } finally {
//     setIsResendingOtp(false);
//   }
// };

// const verifyOtp = async () => {
//   const formattedPhone = "+237" + phoneNumber;
  
//   if (!otpCode.trim() || otpCode.length < 4) {
//     setErrorMessage("Veuillez entrer un code OTP valide");
//     setTimeout(() => setErrorMessage(""), 2000);
//     return;
//   }

//   setLoading(true);
  
//   try {
//     const response = await fetch(BASE_URL + "/clients/auth/verify-signup-otp/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       body: JSON.stringify({
//         phone_number: formattedPhone,
//         otp_code: otpCode,
//       }),
//     });

//     const data = await response.json();

//     if (response.ok) {
//       // ✅ Vérification réussie → Fermer modal et se connecter automatiquement
//       setOtpModalVisible(false);
//       setOtpCode("");
//       setErrorMessage("Numéro vérifié ! Connexion en cours...");
      
//       // Relancer la connexion automatiquement
//       setTimeout(async () => {
//         await connect();
//       }, 500);
//     } else {
//       setErrorMessage(data.Message || "Code OTP invalide");
//       setTimeout(() => setErrorMessage(""), 2000);
//     }
//   } catch (error) {
//     console.error("Erreur lors de la vérification OTP:", error);
//     setErrorMessage("Erreur de connexion");
//     setTimeout(() => setErrorMessage(""), 2000);
//   } finally {
//     setLoading(false);
//   }
// };

// const closeOtpModal = () => {
//   setOtpModalVisible(false);
//   setOtpCode("");
//   setErrorMessage("");
// };

//   return (
//     <View style={styles.container}>
//       <View style={styles.topViewLeft}>
//         <Text style={styles.labelText}>en</Text>
//         <Switch
//           trackColor={{ false: "#767577", true: "#81b0ff" }}
//           thumbColor={isEnabled ? Colors.light.tint : "#f4f3f4"}
//           ios_backgroundColor="#3e3e3e"
//           onValueChange={toggleSwitch}
//           value={isEnabled}
//         />
//         <Text style={styles.labelText}>fr</Text>
//       </View>

//       <View style={{ ...styles.centered, flex: 1 }}>
//         <Text style={styles.titleText}>{t("login")}</Text>
//         <Text>{t("no_account")}</Text>
//         <TouchableOpacity onPress={() => navigation.navigate("signup")}>
//           <Text style={{ color: Colors.light.tint }}>{t("sign_up")}</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={{ flex: 2 }}>
//         <View>
//           <View
//             style={[
//               styles.inputWrapper,
//               focusedInput === "phone" && styles.inputFocused,
//             ]}
//           >
//             <View style={styles.prefix}>
//               <Text style={styles.prefixText}>+237</Text>
//             </View>
//             <TextInput
//               style={styles.phoneInput}
//               value={formattedNumber}
//               onChangeText={handlePhoneChange}
//               placeholder="XXX XXX XXX"
//               placeholderTextColor="#999"
//               keyboardType="phone-pad"
//               onFocus={() => setFocusedInput("phone")}
//               onBlur={() => setFocusedInput("")}
//             />
//           </View>
//           <View
//             style={[
//               styles.inputWrapper,
//               focusedInput === "password" && styles.inputFocused,
//             ]}
//           >
//             <TextInput
//               style={[styles.phoneInput, { flex: 1 }]}
//               placeholder="Mot de passe"
//               onFocus={() => setFocusedInput("password")}
//               onBlur={() => setFocusedInput("")}
//               onChangeText={setPassword}
//               value={password}
//               secureTextEntry={!showPassword}
//             />
//             <TouchableOpacity
//               onPress={() => setShowPassword(!showPassword)}
//               style={{ marginRight: 10 }}
//             >
//               {showPassword ? (
//                 <Eye size={20} color="rgba(51, 51, 51, 0.5)" />
//               ) : (
//                 <EyeOff size={20} color="rgba(51, 51, 51, 0.5)" />
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//         <View style={{ flex: 1, alignItems: "flex-end", paddingRight: 15 }}>
//           <Text
//             style={{ color: Colors.light.tint }}
//             onPress={() => navigation.navigate("forgot")}
//           >
//             {t("forgot_password")}{" "}
//           </Text>
//         </View>
//         {errorMessage ? (
//           <Text style={{ color: "red", marginBottom: 10, marginHorizontal: 5 }}>
//             {errorMessage}
//           </Text>
//         ) : null}
//       </View>

//       <View>
//         <TouchableOpacity
//           style={styles.button}
//           onPress={connect}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator size="small" color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>{t("login")}</Text>
//           )}
//         </TouchableOpacity>
//       </View>

//       {/* Modal de vérification OTP */}
// <Modal
//   animationType="slide"
//   transparent={true}
//   visible={otpModalVisible}
//   onRequestClose={closeOtpModal}
// >
//   <View style={styles.modalContainer}>
//     <View style={styles.modalContent}>
//       <Text style={styles.modalTitle}>Vérification requise</Text>
//       <Text style={styles.modalText}>
//         Votre numéro n'est pas vérifié. Un code OTP a été envoyé au +237 {formattedNumber}
//       </Text>

//       <TextInput
//         style={styles.otpInput}
//         placeholder="000000"
//         placeholderTextColor="#999"
//         value={otpCode}
//         onChangeText={handleOtpChange}
//         keyboardType="number-pad"
//         maxLength={6}
//         contextMenuHidden={true}
//         textContentType="oneTimeCode"
//         autoComplete="sms-otp"
//       />

//       {errorMessage && otpModalVisible ? (
//         <Text style={{ color: "red", marginBottom: 10, textAlign: "center" }}>
//           {errorMessage}
//         </Text>
//       ) : null}

//       {/* Bouton Valider */}
//       <TouchableOpacity
//         style={styles.modalButton}
//         onPress={verifyOtp}
//         disabled={loading}
//       >
//         {loading ? (
//           <ActivityIndicator size="small" color="#fff" />
//         ) : (
//           <Text style={styles.modalButtonText}>Valider</Text>
//         )}
//       </TouchableOpacity>

//       {/* Bouton Renvoyer le code */}
//       <TouchableOpacity
//         style={[styles.modalButton, { backgroundColor: "#666", marginTop: 10 }]}
//         onPress={requestOtp}
//         disabled={isResendingOtp}
//       >
//         {isResendingOtp ? (
//           <ActivityIndicator size="small" color="#fff" />
//         ) : (
//           <Text style={styles.modalButtonText}>Renvoyer le code</Text>
//         )}
//       </TouchableOpacity>

//       {/* Bouton Annuler */}
//       <TouchableOpacity
//         style={[styles.modalButton, { backgroundColor: "#ccc", marginTop: 10 }]}
//         onPress={closeOtpModal}
//       >
//         <Text style={styles.modalButtonText}>Annuler</Text>
//       </TouchableOpacity>
//     </View>
//   </View>
// </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   topViewLeft: {
//     flexDirection: "row",
//     position: "absolute",
//     top: 50,
//     right: 25,
//     borderRadius: 5,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 5,
//     paddingVertical: 10,
//   },
//   container: {
//     flex: 1,
//     justifyContent: "space-between",
//     paddingBottom: 20,
//     paddingTop: 100,
//     paddingHorizontal: 5,
//     backgroundColor: "white",
//   },
//   centered: {
//     flex: 1,
//     alignItems: "center",
//   },
//   titleText: {
//     fontSize: 20,
//     fontWeight: "bold",
//   },
//   button: {
//     borderRadius: 10,
//     marginHorizontal: 5,
//     paddingVertical: 20,
//     backgroundColor: Colors.light.tint,
//     alignItems: "center",
//   },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderRadius: 10,
//     backgroundColor: "#f0f0f0",
//     marginHorizontal: 5,
//     marginBottom: 20,
//     paddingHorizontal: 5,
//   },
//   inputFocused: {
//     borderColor: Colors.light.tint,
//   },
//   phoneInput: {
//     flex: 1,
//     height: 50,
//     paddingLeft: 10,
//     fontSize: 16,
//     color: "#333",
//   },
//   prefix: {
//     backgroundColor: "#f9fafb",
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     borderTopLeftRadius: 8,
//     borderBottomLeftRadius: 8,
//   },
//   prefixText: {
//     color: "#6b7280",
//     fontWeight: "bold",
//   },
//   labelText: {
//     fontSize: 18,
//     marginHorizontal: 8,
//   },
//   buttonText: {
//     color: "#fff",
//     fontSize: 16,
//   },

//    modalContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(0, 0, 0, 0.5)",
//   },
//   modalContent: {
//     width: "85%",
//     backgroundColor: "white",
//     borderRadius: 20,
//     padding: 25,
//     alignItems: "stretch",
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   modalTitle: {
//     fontSize: 22,
//     fontWeight: "bold",
//     marginBottom: 10,
//     textAlign: "center",
//   },
//   modalText: {
//     fontSize: 15,
//     textAlign: "center",
//     marginBottom: 20,
//     color: "#666",
//   },
//   otpInput: {
//     height: 50,
//     borderWidth: 1,
//     borderColor: "#e0e0e0",
//     borderRadius: 12,
//     paddingHorizontal: 15,
//     marginBottom: 15,
//     backgroundColor: "#f9f9f9",
//     fontSize: 20,
//     color: "#333",
//     textAlign: "center",
//     letterSpacing: 10,
//   },
//   modalButton: {
//     backgroundColor: Colors.light.tint,
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: "center",
//   },
//   modalButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import BASE_URL from "../constants/api/BASE_URL";
import i18n from "./translation";
import { syncFcmToken } from "./services/notifications";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

const getOrCreateDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    await AsyncStorage.setItem("device_id", deviceId);
  }
  return deviceId;
};

export default function Index({ navigation }: { navigation: any }) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [language, setLanguage] = useState("fr");
  const [focusedInput, setFocusedInput] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const formattedNumber = phoneNumber
    ? phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
    : "";

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const deviceId = await getOrCreateDeviceId();
        const response = await fetch(
          `${BASE_URL}/support/language/get?device_id=${deviceId}`,
          { method: "GET", headers: { Accept: "application/json" } }
        );

        if (response.ok) {
          const data = await response.json();
          const serverLang = data.language;
          if (serverLang === "fr" || serverLang === "en") {
            i18n.changeLanguage(serverLang);
            await AsyncStorage.setItem("language", serverLang);
            setLanguage(serverLang);
            setIsEnabled(serverLang === "fr");
            return;
          }
        }
      } catch (err) {
        // erreur réseau silencieuse, fallback AsyncStorage
      }

      // Fallback AsyncStorage
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage) {
        setLanguage(savedLanguage);
        setIsEnabled(savedLanguage === "fr");
      }
    };
    loadLanguage();
  }, []);

  const handlePhoneChange = (value: string) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 9) {
      cleanValue = cleanValue.slice(0, 9);
    }
    setPhoneNumber(cleanValue);
  };

  const toggleSwitch = () => {
    const newLang = isEnabled ? "en" : "fr";
    changeLanguage(newLang);
    setLanguage(newLang);
    setIsEnabled((prev) => !prev);
  };

  const changeLanguage = async (lang: string) => {
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem("language", lang);

    try {
      const deviceId = await getOrCreateDeviceId();
      await fetch(`${BASE_URL}/support/language/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ language: lang, device_id: deviceId }),
      });
    } catch (err) {
      // erreur réseau silencieuse
    }
  };

  const connect = async (skipVerification = false) => {
    const formattedPhone = "+237" + phoneNumber;
    if (!phoneNumber.trim() || !password.trim()) {
      setErrorMessage(t("fill_required_fields"));
      setTimeout(() => setErrorMessage(""), 1500);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(BASE_URL + "/clients/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          password: password,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (response.status === 400 || response.status === 404) {
        setErrorMessage(t("invalid_credentials"));
        setTimeout(() => setErrorMessage(""), 3000);
        setLoading(false);
        return;
      }

      if (!skipVerification && data.verification_required === true) {
        setLoading(false);
        setOtpModalVisible(true);
        requestOtp();
        return;
      }

      if (response.ok) {
        // Garde : réponse 200 sans tokens → erreur propre (évite TypeError +
        // AsyncStorage.setItem(undefined) qui throw aussi).
        if (!data?.Tokens?.access) { throw new Error("invalid_login_response"); }
        await AsyncStorage.setItem("userId", String(data.Id ?? ""));
        await AsyncStorage.setItem("authToken", data.Tokens.access);
        // Enregistre le token FCM immédiatement après le login (idempotent,
        // best-effort → ne bloque pas la navigation).
        syncFcmToken(data.Tokens.access);
        navigation.replace("MainTabs");
      } else {
        setErrorMessage(t("invalid_credentials"));
        setTimeout(() => setErrorMessage(""), 3000);
      }
    } catch (err) {
      setErrorMessage(t("connection_error"));
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 6) {
      cleanValue = cleanValue.slice(0, 6);
    }
    setOtpCode(cleanValue);
  };

  const requestOtp = async () => {
    const formattedPhone = "+237" + phoneNumber;
    setIsResendingOtp(true);
    const resendController = new AbortController();
    const resendTimeoutId = setTimeout(() => resendController.abort(), 15000);

    try {
      const response = await fetch(BASE_URL + "/clients/auth/request-signup-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
        }),
        signal: resendController.signal,
      });

      const data = await response.json();

      if (response.ok) {
        setErrorMessage(t("otp_sent"));
        setTimeout(() => setErrorMessage(""), 2000);
      } else {
        setErrorMessage(data.Message || t("otp_send_error"));
        setTimeout(() => setErrorMessage(""), 2000);
      }
    } catch (error) {
      setErrorMessage(t("connection_error"));
      setTimeout(() => setErrorMessage(""), 2000);
    } finally {
      clearTimeout(resendTimeoutId);
      setIsResendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const formattedPhone = "+237" + phoneNumber;

    if (!otpCode.trim() || otpCode.length < 6) {
      setErrorMessage(t("enter_valid_otp"));
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }

    setLoading(true);
    const otpController = new AbortController();
    const otpTimeoutId = setTimeout(() => otpController.abort(), 15000);

    try {
      const response = await fetch(BASE_URL + "/clients/auth/verify-signup-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          otp_code: otpCode,
        }),
        signal: otpController.signal,
      });

      const data = await response.json();

      if (response.ok) {
        setOtpModalVisible(false);
        setOtpCode("");
        setErrorMessage(t("number_verified"));

        setTimeout(async () => {
          await connect(true);
        }, 500);
      } else {
        setErrorMessage(data.Message || t("invalid_otp_code"));
        setTimeout(() => setErrorMessage(""), 2000);
      }
    } catch (error) {
      setErrorMessage(t("connection_error"));
      setTimeout(() => setErrorMessage(""), 2000);
    } finally {
      clearTimeout(otpTimeoutId);
      setLoading(false);
    }
  };

  const closeOtpModal = () => {
    setOtpModalVisible(false);
    setOtpCode("");
    setErrorMessage("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec Toya à gauche et sélecteur de langue à droite */}
        <View style={styles.topHeader}>
          <Text style={styles.brandText}>Toya</Text>
          
          <View style={styles.topViewRight}>
            <Text style={styles.labelText}>en</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isEnabled ? Colors.light.tint : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleSwitch}
              value={isEnabled}
            />
            <Text style={styles.labelText}>fr</Text>
          </View>
        </View>

        <View style={styles.centered}>
          <Text style={styles.titleText}>{t("login")}</Text>
          <Text style={styles.noAccount}>{t("no_account")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("signup")}>
            <Text style={{ color: Colors.light.tint }}>{t("sign_up")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputsContainer}>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === "phone" && styles.inputFocused,
            ]}
          >
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+237</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={formattedNumber}
              onChangeText={handlePhoneChange}
              placeholder={t("phone_placeholder")}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              onFocus={() => setFocusedInput("phone")}
              onBlur={() => setFocusedInput("")}
            />
          </View>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === "password" && styles.inputFocused,
            ]}
          >
            <TextInput
              style={[styles.phoneInput, { flex: 1 }]}
              placeholder={t("passwordPlaceholder")}
              onFocus={() => setFocusedInput("password")}
              onBlur={() => setFocusedInput("")}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={!showPassword}
              placeholderTextColor="#6b7280"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ marginRight: 10 }}
            >
              {showPassword ? (
                <Eye size={20} color="rgba(51, 51, 51, 0.5)" />
              ) : (
                <EyeOff size={20} color="rgba(51, 51, 51, 0.5)" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.forgotPasswordContainer}>
            <Text
              style={styles.forgotPasswordText}
              onPress={() => navigation.navigate("forgot")}
            >
              {t("forgot_password")}
            </Text>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={connect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("login")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de vérification OTP */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={closeOtpModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("verification_required_title")}</Text>
            <Text style={styles.modalText}>
              {t("verification_required_message")} {formattedNumber}
            </Text>
            <Text style={{ fontSize: 15, color: "#666", textAlign: "center", marginBottom: 12 }}>
              {t("otp_email_hint")}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder={t("otp_placeholder")}
              placeholderTextColor="#999"
              value={otpCode}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              contextMenuHidden={true}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />

            {errorMessage && otpModalVisible ? (
              <Text style={{ color: "red", marginBottom: 10, textAlign: "center" }}>
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={verifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>{t("validate")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#666", marginTop: 10 }]}
              onPress={requestOtp}
              disabled={isResendingOtp}
            >
              {isResendingOtp ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>{t("resend_code")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#ccc", marginTop: 10 }]}
              onPress={closeOtpModal}
            >
              <Text style={styles.modalButtonText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingTop: 0,
    paddingHorizontal: 5,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "15%",
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  brandText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6D56F2",
  },
  topViewRight: {
    flexDirection: "row",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  centered: {
    alignItems: "center",
    marginVertical: 30,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000"
  },
  inputsContainer: {
    marginVertical: 20,
  },
  button: {
    borderRadius: 10,
    marginHorizontal: 5,
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 5,
    marginBottom: 20,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: Colors.light.tint,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    paddingLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  prefix: {
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  prefixText: {
    color: "#6b7280",
    fontWeight: "bold",
  },
  labelText: {
    fontSize: 18,
    marginHorizontal: 8,
    color: "#000000",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    paddingRight: 15,
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: Colors.light.tint,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    marginHorizontal: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  otpInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    fontSize: 20,
    color: "#333",
    textAlign: "center",
    letterSpacing: 10,
  },
  modalButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noAccount: {
    color: "#000000"
  }
});