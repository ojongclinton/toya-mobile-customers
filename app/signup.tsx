// import {
//   Text,
//   View,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   Modal,
//   Button,
// } from "react-native";
// import { Colors } from "@/constants/Colors";
// import React, { useState } from "react";
// import { Link } from "expo-router";
// import BASE_URL from "../constants/api/BASE_URL";
// import { useTranslation } from "react-i18next";
// import { Icon } from "react-native-paper";

// export default function Signup({ navigation }: { navigation: any }) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const { t } = useTranslation();
//   const [focusedInput, setFocusedInput] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const styles = StyleSheet.create({
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
//     modalContainer: {
//       flex: 1,
//       justifyContent: "center",
//       alignItems: "center",
//       backgroundColor: "rgba(0, 0, 0, 0.5)",
//     },
//     modalContent: {
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
//   });

//   const [username, setUsername] = useState("");
//   const [message, setmessage] = useState("");
//   const [email, setEmail] = useState("");
//   const [name, setName] = useState("");
//   const [firstname, setFirstname] = useState("");
//   const [phonenumber, setPhonenumber] = useState("");
//   const [address, setAddress] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmpassword, setConfirmPassword] = useState("");

//   const [errorMessage, setErrorMessage] = useState("");
//   const handlePhoneChange = (value: string) => {
//     let cleanValue = value.replace(/\D/g, "");
//     if (cleanValue.length > 9) {
//       cleanValue = cleanValue.slice(0, 9);
//     }
//     setPhonenumber(cleanValue);
//   };

//   const formattedNumber = phonenumber
//     ? phonenumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
//     : "";

//   const register = () => {
//     var formetphone = "+237" + phonenumber;
//     if (
//       !username.trim() ||
//       !email.trim() ||
//       !name.trim() ||
//       !firstname.trim() ||
//       !phonenumber.trim() ||
//       !address.trim() ||
//       !password.trim() ||
//       !confirmpassword.trim()
//     ) {
//       setErrorMessage(t("requiredFieldsError"));
//       setTimeout(() => {
//         setErrorMessage("");
//       }, 2000);
//       return;
//     }
//     if (password !== confirmpassword) {
//       setErrorMessage(t("passwordMismatchError"));
//       setTimeout(() => {
//         setErrorMessage("");
//       }, 2000);
//       return;
//     }
//     if (!email.includes("@")) {
//       setErrorMessage(t("incorrectEmail"));
//       setTimeout(() => {
//         setErrorMessage("");
//       }, 2000);
//       return;
//     }
//     if (!formetphone.includes("+237") || formetphone.length != 13) {
//       console.log(formetphone);
//       setmessage(t("putPlus"));
//       setModalVisible(true);
//       return;
//     }
//     let data = {
//       username: username,
//       email: email,
//       password: password,
//       first_name: name,
//       last_name: firstname,
//       phone_number: formetphone,
//       adresse: address,
//     };
//     fetch(BASE_URL + "/clients/auth/register/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(data),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           response
//             .json()
//             .then((a) => {
//               if (a.Message.hasOwnProperty("password")) {
//                 setmessage(t("wrongType"));
//                 setModalVisible(true);
//               } else if (a.Message.hasOwnProperty("phone_number")) {
//                 setmessage(t("alredyexist"));
//                 setModalVisible(true);
//                 1;
//               } else {
//                 setmessage(t("emailPhoneExistsError"));
//                 setModalVisible(true);
//               }

//               console.error("Erreur HTTP :", a);
//             })
//             .catch((error) => {
//               console.error(
//                 "Erreur lors de la récupération du corps de la réponse :",
//                 error
//               );
//             });
//         }

//         return response.json();
//       })
//       .then((data) => {
//         if (data.Id) {
//           setmessage(t("registrationSuccess"));
//           setModalVisible(true);
//           setUsername("");
//           setEmail("");
//           setName("");
//           setFirstname("");
//           setPhonenumber("");
//           setAddress("");
//           setPassword("");
//           setConfirmPassword("");
//           setTimeout(() => {
//             navigation.navigate("index");
//           });
//         }
//       })
//       .catch((error) => {
//         console.error("Erreur lors de la requete HTTP : " + error.message);
//       });
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView>
//         <View style={{ ...styles.centered, flex: 1 }}>
//           <Text style={styles.titleText}>{t("title")}</Text>
//           <Text>{t("hasAccount")}</Text>
//           <TouchableOpacity onPress={() => navigation.navigate("index")}>
//             <Text style={{ color: Colors.light.tint }}>{t("login")}</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={{ flex: 5 }}>
//           <TextInput
//             style={[
//               styles.input,
//               focusedInput === "input1" && styles.inputFocused,
//             ]}
//             placeholder={t("usernamePlaceholder")}
//             onFocus={() => setFocusedInput("input1")}
//             onBlur={() => setFocusedInput("")}
//             onChangeText={setUsername}
//             value={username}
//           />
//           <TextInput
//             style={[
//               styles.input,
//               focusedInput === "input2" && styles.inputFocused,
//             ]}
//             placeholder={t("emailPlaceholder")}
//             keyboardType="email-address"
//             autoCapitalize="none"
//             onFocus={() => setFocusedInput("input2")}
//             onBlur={() => setFocusedInput("")}
//             onChangeText={setEmail}
//             value={email}
//           />
//           <TextInput
//             style={[
//               styles.input,
//               focusedInput === "input3" && styles.inputFocused,
//             ]}
//             placeholder={t("namePlaceholder")}
//             onFocus={() => setFocusedInput("input3")}
//             onBlur={() => setFocusedInput("")}
//             onChangeText={setName}
//             value={name}
//           />
//           <TextInput
//             style={[
//               styles.input,
//               focusedInput === "input4" && styles.inputFocused,
//             ]}
//             placeholder={t("firstnamePlaceholder")}
//             onFocus={() => setFocusedInput("input4")}
//             onBlur={() => setFocusedInput("")}
//             onChangeText={setFirstname}
//             value={firstname}
//           />
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
//           <TextInput
//             style={[
//               styles.input,
//               focusedInput === "input6" && styles.inputFocused,
//             ]}
//             placeholder={t("addressPlaceholder")}
//             onFocus={() => setFocusedInput("input6")}
//             onBlur={() => setFocusedInput("")}
//             onChangeText={setAddress}
//             value={address}
//           />
//           <View
//             style={[
//               styles.inputWrapper,
//               focusedInput === "input7" && styles.inputFocused,
//             ]}
//           >
//             <TextInput
//               style={[styles.phoneInput]}
//               placeholder={t("passwordPlaceholder")}
//               onFocus={() => setFocusedInput("input7")}
//               onBlur={() => setFocusedInput("")}
//               onChangeText={setPassword}
//               value={password}
//               secureTextEntry={!showPassword}
//             />
//             <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//               <Icon
//                 source={showPassword ? "eye-off" : "eye"}
//                 size={20}
//                 color="#666"
//               />
//             </TouchableOpacity>
//           </View>

//           <View
//             style={[
//               styles.inputWrapper,
//               focusedInput === "input8" && styles.inputFocused,
//             ]}
//           >
//             <TextInput
//               style={[styles.phoneInput]}
//               placeholder={t("confirmPasswordPlaceholder")}
//               onFocus={() => setFocusedInput("input8")}
//               onBlur={() => setFocusedInput("")}
//               onChangeText={setConfirmPassword}
//               value={confirmpassword}
//               secureTextEntry={!showConfirmPassword}
//             />
//             <TouchableOpacity
//               onPress={() => setShowConfirmPassword(!showConfirmPassword)}
//             >
//               <Icon
//                 source={showConfirmPassword ? "eye-off" : "eye"}
//                 size={20}
//                 color="#666"
//               />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </ScrollView>
//       <Modal
//         visible={modalVisible}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <ScrollView>
//               <Text style={styles.messageText}>{message}</Text>
//             </ScrollView>
//             <Button title={t("close")} onPress={() => setModalVisible(false)} />
//           </View>
//         </View>
//       </Modal>
//       <View>
//         {errorMessage ? (
//           <Text style={{ color: "red", marginBottom: 10, marginHorizontal: 5 }}>
//             {errorMessage}
//           </Text>
//         ) : null}
//         <TouchableOpacity style={styles.button} onPress={register}>
//           <Text style={styles.buttonText}>{t("title")}</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Button,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Colors } from "@/constants/Colors";
import React, { useState } from "react";
import { Link } from "expo-router";
import BASE_URL from "../constants/api/BASE_URL";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

export default function Signup({ navigation }: { navigation: any }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const { t } = useTranslation();
  const [focusedInput, setFocusedInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "white",
    },
    keyboardView: {
      flex: 1,
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
    },
    button: {
      borderRadius: 10,
      marginHorizontal: 5,
      marginBottom: 20,
      paddingVertical: 20,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
    },
    input: {
      height: 50,
      borderColor: "transparent",
      borderWidth: 2,
      borderRadius: 10,
      paddingHorizontal: 10,
      marginHorizontal: 5,
      marginBottom: 20,
      backgroundColor: "#f0f0f0",
    },
    inputFocused: {
      borderColor: Colors.light.tint,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
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
      borderWidth: 2,
      borderColor: "transparent",
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
  });

  const [username, setUsername] = useState("");
  const [message, setmessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [firstname, setFirstname] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (value: string) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 9) {
      cleanValue = cleanValue.slice(0, 9);
    }
    setPhonenumber(cleanValue);
  };

  const handleOtpChange = (value: string) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 6) {
      cleanValue = cleanValue.slice(0, 6);
    }
    setOtpCode(cleanValue);
  };

  const formattedNumber = phonenumber
    ? phonenumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
    : "";

  const closeOtpModal = () => {
    setOtpModalVisible(false);
    setOtpCode("");
  };

  const verifyOtp = async () => {
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
        BASE_URL + "/clients/auth/verify-signup-otp/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            phone_number: "+237" + phonenumber,
            otp_code: otpCode,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        setOtpModalVisible(false);
        setOtpCode("");
        setmessage(t("registrationSuccess"));
        setModalVisible(true);
        setUsername("");
        setEmail("");
        setName("");
        setFirstname("");
        setPhonenumber("");
        setAddress("");
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setModalVisible(false);
          navigation.navigate("index");
        }, 3000);
      } else {
        setErrorMessage(data.Message || t("invalid_otp_code"));
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

  const register = async () => {
    var formetphone = "+237" + phonenumber;
    if (
      !username.trim() ||
      !email.trim() ||
      !name.trim() ||
      !firstname.trim() ||
      !phonenumber.trim() ||
      !address.trim() ||
      !password.trim() ||
      !confirmpassword.trim()
    ) {
      setErrorMessage(t("requiredFieldsError"));
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    if (password !== confirmpassword) {
      setErrorMessage(t("passwordMismatchError"));
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    if (!email.includes("@")) {
      setErrorMessage(t("incorrectEmail"));
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    if (!formetphone.includes("+237") || formetphone.length != 13) {
      setmessage(t("putPlus"));
      setModalVisible(true);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(BASE_URL + "/clients/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, email, password,
          first_name: name,
          last_name: firstname,
          phone_number: formetphone,
          adresse: address,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        if (responseData.Message?.password) {
          setmessage(t("wrongType"));
        } else if (responseData.Message?.phone_number) {
          setmessage(t("alredyexist"));
        } else {
          setmessage(t("emailPhoneExistsError"));
        }
        setModalVisible(true);
        return;
      }

      if (responseData.Id) {
        setOtpModalVisible(true);
      } else {
        setErrorMessage(t("connection_error"));
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centered}>
          <Text style={styles.titleText}>{t("title")}</Text>
          <Text>{t("hasAccount")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("index")}>
            <Text style={{ color: Colors.light.tint }}>{t("login")}</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TextInput
            style={[
              styles.input,
              focusedInput === "input1" && styles.inputFocused,
            ]}
            placeholder={t("usernamePlaceholder")}
            onFocus={() => setFocusedInput("input1")}
            onBlur={() => setFocusedInput("")}
            onChangeText={setUsername}
            value={username}
          />
          <TextInput
            style={[
              styles.input,
              focusedInput === "input2" && styles.inputFocused,
            ]}
            placeholder={t("emailPlaceholder")}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedInput("input2")}
            onBlur={() => setFocusedInput("")}
            onChangeText={setEmail}
            value={email}
          />
          <TextInput
            style={[
              styles.input,
              focusedInput === "input3" && styles.inputFocused,
            ]}
            placeholder={t("namePlaceholder")}
            onFocus={() => setFocusedInput("input3")}
            onBlur={() => setFocusedInput("")}
            onChangeText={setName}
            value={name}
          />
          <TextInput
            style={[
              styles.input,
              focusedInput === "input4" && styles.inputFocused,
            ]}
            placeholder={t("firstnamePlaceholder")}
            onFocus={() => setFocusedInput("input4")}
            onBlur={() => setFocusedInput("")}
            onChangeText={setFirstname}
            value={firstname}
          />
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
              placeholder="XXX XXX XXX"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              onFocus={() => setFocusedInput("phone")}
              onBlur={() => setFocusedInput("")}
            />
          </View>
          <TextInput
            style={[
              styles.input,
              focusedInput === "input6" && styles.inputFocused,
            ]}
            placeholder={t("addressPlaceholder")}
            onFocus={() => setFocusedInput("input6")}
            onBlur={() => setFocusedInput("")}
            onChangeText={setAddress}
            value={address}
          />
          <View
            style={[
              styles.inputWrapper,
              focusedInput === "input7" && styles.inputFocused,
            ]}
          >
            <TextInput
              style={[styles.phoneInput]}
              placeholder={t("passwordPlaceholder")}
              onFocus={() => setFocusedInput("input7")}
              onBlur={() => setFocusedInput("")}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                source={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputWrapper,
              focusedInput === "input8" && styles.inputFocused,
            ]}
          >
            <TextInput
              style={[styles.phoneInput]}
              placeholder={t("confirmPasswordPlaceholder")}
              onFocus={() => setFocusedInput("input8")}
              onBlur={() => setFocusedInput("")}
              onChangeText={setConfirmPassword}
              value={confirmpassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                source={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {errorMessage && !otpModalVisible ? (
          <Text style={{ color: "red", marginBottom: 10, marginHorizontal: 5 }}>
            {errorMessage}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={register}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t("title")}</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Modal OTP */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={closeOtpModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("verification_code_title")}</Text>
            <Text style={styles.modalText}>
              {t("enter_otp_message")} {formattedNumber}
            </Text>
            <Text style={{ fontSize: 15, color: "#666", textAlign: "center", marginBottom: 12 }}>
              {t("otp_email_hint")}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
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
              style={[styles.modalButton, isLoading && { opacity: 0.7 }]}
              onPress={verifyOtp}
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

      {/* Modal Messages */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.messageText}>{message}</Text>
            </ScrollView>
            <Button title={t("close")} onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}