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
  useWindowDimensions,
  Platform,
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

export default function Parrainage({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalnonValide, setNonvalid] = useState(false);

  const handlePress = () => {
    applyReferralCode(code);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const applyReferralCode = async (inviteReferralCode) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + "/referrals/clients/apply", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invite_referral_code: inviteReferralCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNonvalid(true);
      } else {
        setModalVisible(true);
        return data;
      }
    } catch (error) {
      throw error;
    }
  };

  const [focusedInput, setFocusedInput] = useState("");
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.light.tint,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      minHeight: height * 0.35,
      alignItems: "center",
      backgroundColor: Colors.light.tint,
    },
    navRow: { flexDirection: "row", alignItems: "center", width: "100%", paddingHorizontal: 16, paddingVertical: 8 },
    backBtn: { padding: 4 },
    navTitle: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "600", color: "#fff" },
    navSpacer: { width: 32 },
    headerContent: {
      alignItems: "center",
      paddingVertical: 20,
    },
    headerImage: {
      width: width * 0.2,
      height: width * 0.2,
      minWidth: 80,
      minHeight: 80,
      maxWidth: 120,
      maxHeight: 120,
      borderRadius: 100,
    },
    headerBody: {
      alignItems: "center",
      marginTop: 5,
    },
    body: {
      flex: 1,
      backgroundColor: "white",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 30,
    },
    instructionText: {
      fontSize: width > 375 ? 16 : 14,
      textAlign: "center",
      marginBottom: 15,
      width: "100%",
      paddingHorizontal: 10,
      color: "#000",
    },
    instructionTitle: {
      fontSize: width > 375 ? 22 : 20,
      fontWeight: "bold",
      textAlign: "center",
      marginTop: 30,
      marginBottom: 20,
      color: "#000",
    },
    card: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f5f5f5",
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
    },
    submitButton: {
      width: "100%",
      borderRadius: 10,
      paddingVertical: 15,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
      marginTop: 20,
    },
    submitButtonText: {
      color: "#fff",
      fontSize: width > 375 ? 18 : 16,
      fontWeight: "bold",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: width * 0.85,
      maxHeight: height * 0.7,
      backgroundColor: "white",
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
    },
    modalTitle: {
      fontSize: width > 375 ? 20 : 18,
      fontWeight: "bold",
      marginBottom: 10,
      textAlign: "center",
      color: "#000",
    },
    modalContentnonvalide: {
      width: width * 0.85,
      padding: 20,
      backgroundColor: "white",
      borderRadius: 20,
      alignItems: "center",
    },
    modalButton: {
      width: "100%",
      borderRadius: 25,
      marginVertical: 10,
      paddingVertical: 15,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
    },
    modalButtonText: {
      color: "#fff",
      fontSize: width > 375 ? 16 : 14,
    },
    nameText: {
      fontSize: width > 375 ? 20 : 18,
      fontWeight: "500",
      color: "#fff",
      marginTop: 10,
    },
    ridesText: {
      color: "white",
      fontSize: width > 375 ? 20 : 18,
    },
    ridesCount: {
      color: "white",
      fontWeight: "bold",
      fontSize: width > 375 ? 30 : 26,
    },
  });

  const [errorMessage, setErrorMessage] = useState("");
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
  const [totalride, settotalride] = useState("");
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
  useEffect(() => {
    const fetchTotalRide = async () => {
      const totalride = await AsyncStorage.getItem("totalride");
      settotalride(totalride ?? "0");
    };

    fetchTotalRide();
  }, []);

  const GetData = async () => {
    try {
      const test = await AsyncStorage.getItem("Info");
      if (!test) return;
      const data = JSON.parse(test);
      const info = data?.Data ?? {};
      setMessage(data.Message);
      setTokens(data.Tokens);
      setId(info.id);
      setUsername(info.username);
      setEmail(info.email);
      setFirstName(info.first_name);
      setLastName(info.last_name);
      setPhoneNumber(info.phone_number);
      setAdresse(info.adresse);
      setDateJoined(info.date_joined);
      setReferralCode(info.referral_code);
      seturl(data.profile_picture);
    } catch {
      // Info absent ou JSON malformé → on n'écrase rien.
    }
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
              <Text style={styles.navTitle}>{t("referral")}</Text>
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
              <Text style={styles.nameText}>
                {firstName} {lastName}
              </Text>
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.ridesText}>{t("total_rides")}</Text>
              <Text style={styles.ridesCount}>{totalride}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.instructionText}> {t("venantami")}</Text>

            <Text style={styles.instructionTitle}>
              {t("enter_friend_code")}
            </Text>

            <TextInput
              style={styles.card}
              value={code}
              onChangeText={setcode}
              placeholder={t("referral_code")}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handlePress}>
              <Text style={styles.submitButtonText}>
                {t("validate_my_code")}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalnonValide}
            onRequestClose={() => setNonvalid(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContentnonvalide}>
                <Text style={styles.modalTitle}>{t("invalid_code")}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setNonvalid(false)}
                >
                  <Text style={styles.modalButtonText}>{t("close")}</Text>
                </TouchableOpacity>
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
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {t("referral_success_title")}
                </Text>
                <Text style={styles.instructionText}>
                  {t("referral_success_message")}
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={closeModal}
                >
                  <Text style={styles.modalButtonText}>{t("close")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </View>
  );
}
