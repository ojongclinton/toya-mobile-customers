// import {
//   Text,
//   View,
//   StyleSheet,
//   Button,
//   TouchableOpacity,
//   TextInput,
//   Alert,
//   Switch,
//   Modal,
// } from "react-native";
// import { Colors } from "@/constants/Colors";
// import { Link } from "expo-router";
// import { useState } from "react";
// import BASE_URL from "../constants/api/BASE_URL";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import i18n from "./translation";
// import { useTranslation } from "react-i18next";
// import { Icon } from "react-native-paper";
// import { ActivityIndicator } from "react-native";

// export default function Forgot({ navigation }: { navigation: any }) {
//   const [focusedInput, setFocusedInput] = useState("");
//   const { t } = useTranslation();
//   const [isEnabled, setIsEnabled] = useState(false);
//   const [language, setlanguage] = useState("en");
//   const [token, settoken] = useState("");
//   const [modalVisible, setModalVisible] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [modalErrorMessage, setModalErrorMessage] = useState("");

//   const styles = StyleSheet.create({
//     topViewLeft: {
//       flexDirection: "row",
//       position: "absolute",
//       top: 10,
//       right: 25,
//       borderRadius: 5,
//       justifyContent: "center",
//       alignItems: "center",
//       paddingHorizontal: 5,
//       paddingVertical: 10,
//     },
//     container: {
//       flex: 1,
//       justifyContent: "space-between",
//       paddingBottom: 20,
//       paddingTop: 100,
//       paddingHorizontal: 5,
//       backgroundColor: "white",
//     },
//     centered: {
//       flex: 1,
//       alignItems: "center",
//     },
//     titleText: {
//       fontSize: 20,
//       fontWeight: "bold",
//     },
//     button: {
//       borderRadius: 10,
//       marginHorizontal: 5,
//       paddingVertical: 20,
//       backgroundColor: Colors.light.tint,
//       alignItems: "center",
//     },
//     input: {
//       height: 50,
//       borderColor: "transparent",
//       borderWidth: 2,
//       borderRadius: 10,
//       paddingHorizontal: 10,
//       marginHorizontal: 5,
//       marginBottom: 20,
//       backgroundColor: "#f0f0f0",
//     },
//     inputFocused: {
//       borderColor: Colors.light.tint,
//     },
//     buttonText: {
//       color: "#fff",
//       fontSize: 16,
//     },
//     languageContainer: {
//       flexDirection: "row",
//       justifyContent: "space-around",
//       padding: 10,
//     },
//     labelText: {
//       fontSize: 18,
//       marginHorizontal: 8,
//     },
//     modalContainer: {
//       flex: 1,
//       justifyContent: "center",
//       alignItems: "center",
//       backgroundColor: "rgba(0, 0, 0, 0.5)",
//     },
//     modalContent: {
//       width: "85%",
//       padding: 25,
//       backgroundColor: "#fff",
//       borderRadius: 20,
//       alignItems: "stretch",
//       shadowColor: "#000",
//       shadowOffset: {
//         width: 0,
//         height: 2,
//       },
//       shadowOpacity: 0.25,
//       shadowRadius: 4,
//       elevation: 5,
//     },

//     modalTitle: {
//       textAlign: "center",
//       width: 250,
//       marginVertical: 10,
//       paddingVertical: 10,
//       fontSize: 25,
//       fontWeight: "bold",
//     },
//     modalText: {
//       width: 250,
//       fontSize: 15,
//       fontWeight: "300",
//     },
//     modalButton: {
//       backgroundColor: Colors.light.tint,
//       borderRadius: 12,
//       paddingVertical: 14,
//       alignItems: "center",
//       marginTop: 10,
//     },
//     modalButtonText: {
//       color: "#fff",
//       fontSize: 16,
//     },
//     modalCont: {
//       flex: 1,
//       justifyContent: "center",
//       alignItems: "center",
//       backgroundColor: "rgba(0, 0, 0, 0.5)",
//     },
//     modalConten: {
//       width: "80%",
//       padding: 20,
//       backgroundColor: "white",
//       borderRadius: 10,
//     },
//     messageText: {
//       marginBottom: 20,
//       fontSize: 16,
//     },
//     inputWrapper: {
//       flexDirection: "row",
//       alignItems: "center",
//       borderRadius: 10,
//       backgroundColor: "#f0f0f0",
//       marginHorizontal: 5,
//       marginBottom: 20,
//       paddingHorizontal: 5,
//     },
//     prefix: {
//       backgroundColor: "#f9fafb",
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//       borderTopLeftRadius: 8,
//       borderBottomLeftRadius: 8,
//     },
//     prefixText: {
//       color: "#6b7280",
//       fontWeight: "bold",
//     },
//     phoneInput: {
//       flex: 1,
//       height: 50,
//       paddingLeft: 10,
//       fontSize: 16,
//       color: "#333",
//     },
//     passwordContainer: {
//       flexDirection: "row",
//       alignItems: "center",
//       borderWidth: 1,
//       borderColor: "#e0e0e0",
//       borderRadius: 12,
//       paddingHorizontal: 10,
//       backgroundColor: "#f9f9f9",
//       marginBottom: 15,
//     },

//     passwordInput: {
//       flex: 1,
//       height: 50,
//       fontSize: 16,
//       color: "#333",
//     },
//   });

//   const closeModal = () => {
//     setIsEnabled(false);
//   };

//   const [errorMessage, setErrorMessage] = useState("");
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [successVisible, setSuccessVisible] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const valideotp = async (otp) => {
//     try {
//       const response = await fetch(
//         BASE_URL + "/clients/auth/validate-reset-code/",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//           body: JSON.stringify({
//             phone_number: "+237" + phoneNumber,
//             otp_code: otp,
//           }),
//         }
//       );
//       const data = await response.json();
//       if (response.ok) {
//         settoken(data.Tokens.access);
//         setIsEnabled(true);
//       } else {
//         setErrorMessage("Numero de téléphone invalide");
//         setTimeout(() => {
//           setErrorMessage("");
//         }, 2000);
//       }
//     } catch (error) {
//       console.error("Erreur lors ", error);
//     } finally {
//       setLoading(false);
//     }
//   };
//   const newpassword = async () => {
//     try {
//       if (password !== confirmPassword) {
//         setModalErrorMessage(t("password_mismatch"));
//         setTimeout(() => setModalErrorMessage(""), 1500);
//         return;
//       }
//       const response = await fetch(BASE_URL + "/clients/auth/reset_password/", {
//         method: "POST",
//         headers: {
//           Authorization: "Bearer " + token,
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({
//           new_password: password,
//         }),
//       });
//       const data = await response.text();
//       if (response.ok) {
//         setIsEnabled(false);
//         setSuccessVisible(true);
//       } else {
//         setModalErrorMessage("Une erreur est survenue");
//         setTimeout(() => setModalErrorMessage(""), 1500);
//       }
//     } catch (error) {
//       console.error("Erreur lors ", error);
//       setModalErrorMessage("Erreur réseau");
//       setTimeout(() => setModalErrorMessage(""), 1500);
//     }
//   };
//   const connect = async () => {
//     if (!phoneNumber.trim()) {
//       setErrorMessage("Veuiller remplir les champs obligatoires !");
//       setTimeout(() => {
//         setErrorMessage("");
//       }, 1500);
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await fetch(
//         BASE_URL + "/clients/auth/forgot_password/",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//           body: JSON.stringify({
//             phone_number: "+237" + phoneNumber,
//           }),
//         }
//       );

//       if (response.ok) {
//         const data = await response.json();

//         console.log(data,"reponse otp")
//           if (data && data["OTP"]) {
//               valideotp(data["OTP"]);
//             } else {
//               setErrorMessage("Erreur: Code OTP non reçu. Veuillez réessayer.");
//               setTimeout(() => {
//                 setErrorMessage("");
//               }, 3000);
//             }
//       } else {
//         setErrorMessage(t("number"));
//         setTimeout(() => {
//           setErrorMessage("");
//         }, 1500);
//       }
//     } catch (error) {
//       console.error(
//         "Erreur lors de la récupération du corps de la réponse :",
//         error
//       );
//     }
//   };

//   const formattedNumber = phoneNumber
//     ? phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
//     : "";
//   const handlePhoneChange = (value: string) => {
//     let cleanValue = value.replace(/\D/g, "");
//     if (cleanValue.length > 9) {
//       cleanValue = cleanValue.slice(0, 9);
//     }
//     setPhoneNumber(cleanValue);
//   };
//   return (
//     <View style={styles.container}>
//       <View style={{ ...styles.centered, flex: 1 }}>
//         <Modal
//           animationType="slide"
//           transparent={true}
//           visible={isEnabled}
//           onRequestClose={closeModal}
//         >
//           <View style={styles.modalContainer}>
//             <View style={styles.modalContent}>
//               <Text style={styles.modalTitle}>{t("enternewpassword")}</Text>

//               <View style={styles.passwordContainer}>
//                 <TextInput
//                   style={styles.passwordInput}
//                   placeholder={t("password")}
//                   onFocus={() => setFocusedInput("input1")}
//                   onBlur={() => setFocusedInput("")}
//                   onChangeText={setPassword}
//                   value={password}
//                   secureTextEntry={!showPassword}
//                 />
//                 <TouchableOpacity
//                   onPress={() => setShowPassword(!showPassword)}
//                 >
//                   <Icon
//                     source={showPassword ? "eye" : "eye-off"}
//                     size={20}
//                     color="#666"
//                   />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.passwordContainer}>
//                 <TextInput
//                   style={styles.passwordInput}
//                   placeholder={t("confirm_password")}
//                   onFocus={() => setFocusedInput("input2")}
//                   onBlur={() => setFocusedInput("")}
//                   onChangeText={setConfirmPassword}
//                   value={confirmPassword}
//                   secureTextEntry={!showConfirmPassword}
//                 />
//                 <TouchableOpacity
//                   onPress={() => setShowConfirmPassword(!showConfirmPassword)}
//                 >
//                   <Icon
//                     source={showConfirmPassword ? "eye" : "eye-off"}
//                     size={20}
//                     color="#666"
//                   />
//                 </TouchableOpacity>
//               </View>

//               {/* Message d'erreur dans le modal */}
//               {modalErrorMessage ? (
//                 <Text
//                   style={{
//                     color: "red",
//                     marginBottom: 10,
//                     textAlign: "center",
//                   }}
//                 >
//                   {modalErrorMessage}
//                 </Text>
//               ) : null}

//               <TouchableOpacity
//                 style={styles.modalButton}
//                 onPress={newpassword}
//               >
//                 <Text style={styles.modalButtonText}>{t("validate")}</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         <Modal
//           animationType="fade"
//           transparent={true}
//           visible={successVisible}
//           onRequestClose={() => setSuccessVisible(false)}
//         >
//           <View style={styles.modalContainer}>
//             <View style={styles.modalContent}>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: "bold",
//                   marginTop: 15,
//                   marginBottom: 10,
//                   textAlign: "center",
//                 }}
//               >
//                 {t("password_reset_success") ||
//                   "Mot de passe réinitialisé avec succès"}
//               </Text>
//               <TouchableOpacity
//                 style={styles.modalButton}
//                 onPress={() => {
//                   setSuccessVisible(false);
//                   navigation.navigate("index");
//                 }}
//               >
//                 <Text style={styles.modalButtonText}>
//                   {t("go_to_login") || "Aller à la connexion"}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         <Text style={styles.titleText}>{t("forgot_password")}</Text>
//         <Text>{t("no_account")}</Text>
//         <TouchableOpacity onPress={() => navigation.navigate("signup")}>
//           <Text style={{ color: Colors.light.tint }}>{t("sign_up")}</Text>
//         </TouchableOpacity>
//       </View>
//       <View style={{ flex: 2 }}>
//         <View
//           style={[
//             styles.inputWrapper,
//             focusedInput === "phone" && styles.inputFocused,
//           ]}
//         >
//           <View style={styles.prefix}>
//             <Text style={styles.prefixText}>+237</Text>
//           </View>
//           <TextInput
//             style={styles.phoneInput}
//             value={formattedNumber}
//             onChangeText={handlePhoneChange}
//             placeholder="XXX XXX XXX"
//             placeholderTextColor="#999"
//             keyboardType="phone-pad"
//             onFocus={() => setFocusedInput("phone")}
//             onBlur={() => setFocusedInput("")}
//           />
//         </View>
//         <View style={{ flex: 1, alignItems: "flex-end", paddingRight: 15 }}>
//           <Text
//             style={{ color: Colors.light.tint }}
//             onPress={() => navigation.navigate("index")}
//           >
//             {t("login")}
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
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.buttonText}>{t("send")}</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }



import {
  Text,
  View,
  StyleSheet,
  Button,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import BASE_URL from "../constants/api/BASE_URL";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "./translation";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

export default function Forgot({ navigation }: { navigation: any }) {
  const [message, setmessage] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [language, setlanguage] = useState("en");
  const [token, settoken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const styles = StyleSheet.create({
    topViewLeft: {
      flexDirection: "row",
      position: "absolute",
      top: 10,
      right: 25,
      borderRadius: 5,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 5,
      paddingVertical: 10,
    },
    container: {
      flex: 1,
      backgroundColor: "white",
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
      paddingTop: 100,
      paddingHorizontal: 5,
    },
    centered: {
      alignItems: "center",
      marginBottom: 30,
    },
    titleText: {
      fontSize: 20,
      fontWeight: "bold",
      color:"#000000"
    },
    button: {
      borderRadius: 10,
      marginHorizontal: 5,
      paddingVertical: 20,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: "#e0e0e0",
      borderRadius: 12,
      paddingHorizontal: 15,
      marginBottom: 15,
      backgroundColor: "#f9f9f9",
      fontSize: 16,
      color: "#333",
    },
    inputFocused: {
      borderColor: Colors.light.tint,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
    },
    languageContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      padding: 10,
    },
    labelText: {
      fontSize: 18,
      marginHorizontal: 8,
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      width: "85%",
      padding: 25,
      backgroundColor: "#fff",
      borderRadius: 20,
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
      textAlign: "center",
      marginVertical: 10,
      paddingVertical: 10,
      fontSize: 25,
      fontWeight: "bold",
    },
    modalText: {
      fontSize: 15,
      fontWeight: "300",
      textAlign: "center",
      marginBottom: 15,
    },
    modalButton: {
      backgroundColor: Colors.light.tint,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 10,
    },

    modalButtonText: {
      color: "#fff",
      fontSize: 16,
    },
    modalCont: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalConten: {
      width: "80%",
      padding: 20,
      backgroundColor: "white",
      borderRadius: 10,
    },
    messageText: {
      marginBottom: 20,
      fontSize: 16,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      backgroundColor: "#f0f0f0",
      marginHorizontal: 5,
      marginBottom: 20,
      paddingHorizontal: 5,
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
    phoneInput: {
      flex: 1,
      height: 50,
      paddingLeft: 10,
      fontSize: 16,
      color: "#333",
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#e0e0e0",
      borderRadius: 12,
      paddingHorizontal: 10,
      backgroundColor: "#f9f9f9",
      marginBottom: 15,
    },

    passwordInput: {
      flex: 1,
      height: 50,
      fontSize: 16,
      color: "#333",
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
     noAccount:{
    color:"#000000"

  }
  });

  const closeModal = () => {
    setIsEnabled(false);
  };

  const closeOtpModal = () => {
    setOtpModalVisible(false);
    setOtpCode("");
  };

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);

  const formattedNumber = phoneNumber
    ? phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
    : "";
  const handlePhoneChange = (value: string) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 9) {
      cleanValue = cleanValue.slice(0, 9);
    }
    setPhoneNumber(cleanValue);
  };

  const handleOtpChange = (value: string) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 6) {
      cleanValue = cleanValue.slice(0, 6);
    }
    setOtpCode(cleanValue);
  };

  const valideotp = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      setErrorMessage(t("enter_valid_otp"));
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        BASE_URL + "/clients/auth/validate-reset-code/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            phone_number: "+237" + phoneNumber,
            otp_code: otpCode,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      const data = await response.json();
      if (response.ok) {
        settoken(data?.Tokens?.access ?? "");
        setOtpModalVisible(false);
        setOtpCode("");
        setIsEnabled(true);
      } else {
        setErrorMessage(t("invalid_otp_code"));
        setTimeout(() => setErrorMessage(""), 2000);
      }
    } catch {
      clearTimeout(timeoutId);
      setErrorMessage(t("connection_error"));
      setTimeout(() => setErrorMessage(""), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const newpassword = async () => {
    if (password !== confirmPassword) {
      setErrorMessage(t("password_mismatch"));
      setTimeout(() => setErrorMessage(""), 1500);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(BASE_URL + "/clients/auth/reset_password/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ new_password: password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      await response.text();
      if (response.ok) {
        setIsEnabled(false);
        setSuccessVisible(true);
      } else {
        setErrorMessage(t("forgot_reset_error") || "Erreur lors de la réinitialisation");
        setTimeout(() => setErrorMessage(""), 1500);
      }
    } catch {
      clearTimeout(timeoutId);
      setErrorMessage(t("connection_error"));
      setTimeout(() => setErrorMessage(""), 1500);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    if (!phoneNumber.trim()) {
      setErrorMessage(t("requiredFieldsError"));
      setTimeout(() => setErrorMessage(""), 1500);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(BASE_URL + "/clients/auth/forgot_password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone_number: "+237" + phoneNumber }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        setOtpModalVisible(true);
      } else {
        setErrorMessage(t("number"));
        setTimeout(() => setErrorMessage(""), 1500);
      }
    } catch {
      clearTimeout(timeoutId);
      setErrorMessage(t("connection_error"));
      setTimeout(() => setErrorMessage(""), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Modal OTP */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={closeOtpModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Code de vérification</Text>
            <Text style={styles.modalText}>
              Entrez le code OTP reçu par SMS au +237 {formattedNumber}
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
            />
            {errorMessage && otpModalVisible ? (
              <Text style={{ color: "red", marginBottom: 10, textAlign: "center" }}>
                {errorMessage}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.modalButton, isLoading && { opacity: 0.7 }]}
              onPress={valideotp}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalButtonText}>{t("validate")}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#666", marginTop: 10 }]}
              onPress={closeOtpModal}
              disabled={isLoading}
            >
              <Text style={styles.modalButtonText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Nouveau mot de passe */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEnabled}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("enternewpassword")}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("password")}
                onFocus={() => setFocusedInput("input1")}
                onBlur={() => setFocusedInput("")}
                onChangeText={setPassword}
                value={password}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon source={showPassword ? "eye" : "eye-off"} size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("confirm_password")}
                onFocus={() => setFocusedInput("input2")}
                onBlur={() => setFocusedInput("")}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon source={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {errorMessage && isEnabled ? (
              <Text style={{ color: "red", marginBottom: 10, textAlign: "center" }}>
                {errorMessage}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.modalButton, isLoading && { opacity: 0.7 }]}
              onPress={newpassword}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalButtonText}>{t("validate")}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Succès */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successVisible}
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 15, marginBottom: 10, textAlign: "center" }}>
              {t("password_reset_success") || "Mot de passe réinitialisé avec succès"}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => { setSuccessVisible(false); navigation.navigate("index"); }}
            >
              <Text style={styles.modalButtonText}>
                {t("go_to_login") || "Aller à la connexion"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centered}>
          <Text style={styles.titleText}>{t("forgot_password")}</Text>
          <Text style={styles.noAccount}>{t("no_account")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("signup")}>
            <Text style={{ color: Colors.light.tint }}>{t("sign_up")}</Text>
          </TouchableOpacity>
        </View>

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

        <View style={{ alignItems: "flex-end", paddingRight: 15, marginBottom: 10 }}>
          <Text style={{ color: Colors.light.tint }} onPress={() => navigation.navigate("index")}>
            {t("login")}
          </Text>
        </View>

        {errorMessage && !otpModalVisible && !isEnabled ? (
          <Text style={{ color: "red", marginBottom: 10, marginHorizontal: 5 }}>
            {errorMessage}
          </Text>
        ) : null}

      </ScrollView>
      <View style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : 20 }}>
        <TouchableOpacity
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={connect}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t("send")}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

