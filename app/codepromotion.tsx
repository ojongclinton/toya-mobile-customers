import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useEffect, useRef, useState } from "react";
import BASE_URL from "@/constants/api/BASE_URL";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

export default function Promotion({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalnonValide, setNonvalid] = useState(false);
  const [promoErrorMsg, setPromoErrorMsg] = useState("");
  const [promoResponse, setPromoResponse] = useState<any>(null);

  // Mappe le code d'erreur backend (error_code) vers un message clair.
  const promoErrorMessage = (errorCode?: string | null) => {
    const map: Record<string, string> = {
      PROMO_CODE_REQUIRED: "promo_err_required",
      PROMO_NOT_FOUND: "promo_err_not_found",
      PROMO_NOT_STARTED: "promo_err_not_started",
      PROMO_EXPIRED: "promo_err_expired",
      PROMO_EXHAUSTED: "promo_err_exhausted",
      PROMO_ALREADY_USED: "promo_err_already_used",
    };
    const key = errorCode && map[errorCode];
    return key ? t(key) : t("invalid_code_message"); // fallback code inconnu / absent
  };
  const handlePress = () => {
    applyReferralCode(code);
  };

  const closeModal = () => {
    setModalVisible(false);
  };
  const closenonvalide = () => {
    setNonvalid(false);
  };

  const applyReferralCode = async (inviteReferralCode) => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const storage = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + "/promotions/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + storage,
        },
        body: JSON.stringify({
          code: inviteReferralCode,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorCode: string | null = null;
        try {
          const errData = await response.json();
          errorCode = errData?.error_code ?? null;
        } catch {
          // corps non-JSON → message générique
        }
        setPromoErrorMsg(promoErrorMessage(errorCode));
        setNonvalid(true);
      } else {
        const data = await response.json();
        setPromoResponse(data);
        setModalVisible(true);
        return data;
      }
    } catch {
      clearTimeout(timeoutId);
      Alert.alert(t("connection_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const [focusedInput, setFocusedInput] = useState("");
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "white",
    },
    header: {
      height: 300,
      alignItems: "center",
      backgroundColor: Colors.light.tint,
    },
    navRow: { flexDirection: "row", alignItems: "center", width: "100%", paddingHorizontal: 16, paddingVertical: 8 },
    backBtn: { padding: 4 },
    navTitle: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "600", color: "#fff" },
    navSpacer: { width: 32 },
    headerContent: {
      flex: 1,
      alignItems: "center",
    },

    headerImage: {
      marginTop: 25,
      width: 80,
      height: 80,
      borderRadius: 100,
    },

    headerBody: {
      alignItems: "center",
      marginBottom: 50,
    },
    body: {
      flex: 1,
      top: -20,
      backgroundColor: "white",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    closeInfo: {
      width: "70%",
      borderRadius: 10,
      marginHorizontal: 15,
      paddingVertical: 20,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
    },

    textButtonAddCredit: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "bold",
    },
    card: {
      marginTop: 20,
      width: "90%",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f5f5f5",
      padding: 10,
      borderRadius: 10,
    },
    openButton: {
      backgroundColor: "#6200EE",
      padding: 10,
      borderRadius: 5,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      height: "60%",
      width: "85%",
      backgroundColor: "white",
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
      textAlign: "center",
      color: "#000",
    },
    profileImage: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 3,
      borderColor: "#4CAF50",
      marginBottom: 10,
    },
    userName: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 15,
      textAlign: "center",
      color: "#000",
    },
    modalMessage: {
      fontSize: 20,
      color: "#666",
      textAlign: "center",
      marginBottom: 20,
    },
    rewardButton: {
      backgroundColor: "#6200EE",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginTop: 15,
    },
    rewardButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
    },
    promoModalContent: {
      width: "85%",
      backgroundColor: "#fff",
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 8,
    },
    promoModalHeader: {
      backgroundColor: Colors.light.tint,
      paddingVertical: 30,
      alignItems: "center",
    },
    promoErrorHeader: {
      backgroundColor: "#FFEBEE",
      paddingVertical: 30,
      alignItems: "center",
    },
    promoErrorTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#F44336",
      textAlign: "center",
      marginBottom: 12,
    },
    promoIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },
    promoModalBody: {
      padding: 24,
      alignItems: "center",
    },
    promoModalTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: Colors.light.tint,
      textAlign: "center",
      marginBottom: 12,
    },
    promoModalMessage: {
      fontSize: 14,
      color: "#555",
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    promoModalButton: {
      backgroundColor: Colors.light.tint,
      paddingVertical: 13,
      paddingHorizontal: 40,
      borderRadius: 30,
      width: "100%",
      alignItems: "center",
    },
    promoModalButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    promoDetails: {
      width: "100%",
      backgroundColor: "#F3EEFF",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    promoDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    promoDetailLabel: {
      fontSize: 14,
      color: "#555",
    },
    promoDetailValue: {
      fontSize: 14,
      fontWeight: "700",
      color: Colors.light.tint,
    },
    //Modal non valide
    modalContainer: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContentnonvalide: {
      padding: 20,
      backgroundColor: "white",
      borderRadius: 20,
      alignItems: "center",
    },
    modalTitlenonvalide: {
      width: 250,
      marginVertical: 10,
      paddingVertical: 10,
      fontSize: 25,
      fontWeight: "bold",
      color: "#000",
    },
    modalText: {
      width: 250,
      fontSize: 15,
      fontWeight: "300",
      color: "#000",
    },
    modalButton: {
      width: 250,
      borderRadius: 25,
      marginHorizontal: 5,
      marginVertical: 10,
      paddingVertical: 10,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
    },
    modalButtonText: {
      color: "#fff",
      fontSize: 16,
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  // const [transactions, setTransactions] = useState([]);
  const [credit, setCredit] = useState(0);
  const [inputCredit, setInputCredit] = useState("");
  const [info, setInfo] = useState("");
  const [isAddCredit, setIsAddCredit] = useState(false);
  const [modalinfoVisible, setModalInfoVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [tokens, setTokens] = useState("");
  const [id, setId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [adresse, setAdresse] = useState("");
  const [dateJoined, setDateJoined] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [code, setcode] = useState("");
  const [url, seturl] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      GetData();
    }, [])
  );

  const slideAnim = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    if (isAddCredit) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isAddCredit]);

  const showModalInfo = (id) => {
    setInfo(id);
    setModalInfoVisible(true);
  };
  const closeModalInfo = () => {
    setModalInfoVisible(false);
  };

  const GetData = async () => {
    try {
      const test = await AsyncStorage.getItem("Info");
      if (!test) return;
      const data = JSON.parse(test);
      if (!data?.Data) return;
      setMessage(data.Message);
      setTokens(data.Tokens);
      setId(data.Data.id);
      setUsername(data.Data.username);
      setEmail(data.Data.email);
      setFirstName(data.Data.first_name);
      setLastName(data.Data.last_name);
      setPhoneNumber(data.Data.phone_number);
      setAdresse(data.Data.adresse);
      setDateJoined(data.Data.date_joined);
      setReferralCode(data.Data.referral_code);
      seturl(data.profile_picture);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Icon source="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Promotion</Text>
              <View style={styles.navSpacer} />
            </View>
            <View style={styles.headerContent}>
              {url ? (
                <Image style={styles.headerImage} source={{ uri: url }} />
              ) : (
                <Image
                  style={styles.headerImage}
                  source={require("../assets/images/profile.jpg")}
                />
              )}
              <Text style={{ color: "white", fontSize: 20 }}>
                {firstName} {lastName}
              </Text>
            </View>
          </View>
          <View style={[styles.body, { alignItems: "center" }]}>
            <Text
              style={{
                marginTop: 25,
                textAlign: "center",
                fontSize: 16,
                width: "80%",
                color: "#000",
              }}
            >
              {t("textcode")}
            </Text>

            <Text
              style={{
                marginTop: 30,
                textAlign: "center",
                fontSize: 22,
                width: "80%",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              {t("enter_promo_code_title")}
            </Text>

            <TextInput
              style={styles.card}
              value={code}
              onChangeText={v => setcode(v.toUpperCase())}
              placeholder={t("promo_code")}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.closeInfo, { marginTop: "20%" }, isLoading && { opacity: 0.7 }]}
              onPress={handlePress}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.textButtonAddCredit}>{t("validate_my_code")}</Text>
              }
            </TouchableOpacity>
          </View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalnonValide}
            onRequestClose={closenonvalide}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.promoModalContent}>
                <View style={styles.promoErrorHeader}>
                  <View style={styles.promoIconCircle}>
                    <Icon source="close-circle" size={40} color="#F44336" />
                  </View>
                </View>
                <View style={styles.promoModalBody}>
                  <Text style={styles.promoErrorTitle}>{t("invalid_code")}</Text>
                  <Text style={styles.promoModalMessage}>{promoErrorMsg || t("invalid_code_message")}</Text>
                  <TouchableOpacity style={styles.promoModalButton} onPress={closenonvalide}>
                    <Text style={styles.promoModalButtonText}>{t("close")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={closeModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.promoModalContent}>
                {/* Bandeau supérieur violet */}
                <View style={styles.promoModalHeader}>
                  <View style={styles.promoIconCircle}>
                    <Icon source="check" size={40} color={Colors.light.tint} />
                  </View>
                </View>

                {/* Corps */}
                <View style={styles.promoModalBody}>
                  <Text style={styles.promoModalTitle}>{t("promo_success_title")}</Text>

                  {promoResponse?.Data && (
                    <View style={styles.promoDetails}>
                      {promoResponse.Data.discount_percentage != null && (
                        <View style={styles.promoDetailRow}>
                          <Text style={styles.promoDetailLabel}>{t("promo_discount")}</Text>
                          <Text style={styles.promoDetailValue}>-{promoResponse.Data.discount_percentage}%</Text>
                        </View>
                      )}
                      {promoResponse.Data.reservation_days != null && (
                        <View style={styles.promoDetailRow}>
                          <Text style={styles.promoDetailLabel}>{t("promo_valid_for")}</Text>
                          <Text style={styles.promoDetailValue}>{promoResponse.Data.reservation_days} {t("promo_days")}</Text>
                        </View>
                      )}
                      {promoResponse.Data.expires_at && (
                        <View style={styles.promoDetailRow}>
                          <Text style={styles.promoDetailLabel}>{t("promo_expires_at")}</Text>
                          <Text style={styles.promoDetailValue}>
                            {new Date(promoResponse.Data.expires_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={styles.promoModalMessage}>{t("promo_success_message")}</Text>

                  <TouchableOpacity style={styles.promoModalButton} onPress={closeModal}>
                    <Text style={styles.promoModalButtonText}>{t("promo_success_button")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </View>
  );
}
