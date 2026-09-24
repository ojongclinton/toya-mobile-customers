import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
  Platform,
  Linking,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useEffect, useState } from "react";
import BASE_URL from "@/constants/api/BASE_URL";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

export default function DriverProfile({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [url, seturl] = useState("");
  const [allreferal, setallreferal] = useState(0);
  const [language, setlangage] = useState("fr");

  const copyToClipboard = async () => {
    const code = referralCode;
    if (!code) return;
    // expo-clipboard expose setStringAsync (et non setString → crash).
    await Clipboard.setStringAsync(String(code));
    Alert.alert(t("code_copied"), t("code_copied_message"));
  };
  useEffect(() => {
    const fetchTotalRide = async () => {
      const language = (await AsyncStorage.getItem("language")) || "fr";
      setlangage(language);
    };

    fetchTotalRide();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.light.tint,
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
    headerText: {
      fontSize: width > 375 ? 20 : 18,
      color: "white",
      marginTop: 10,
      fontWeight: "500",
    },
    headerBody: {
      alignItems: "center",
      marginTop: 20,
    },
    referralText: {
      color: "white",
      fontSize: width > 375 ? 20 : 18,
    },
    referralCount: {
      color: "white",
      fontWeight: "bold",
      fontSize: width > 375 ? 30 : 26,
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
      // fontSize: width > 375 ? 16 : 14,
      fontSize:15,
      textAlign: "center",
      marginBottom: 15,
      width: "100%",
      paddingHorizontal: 10,
      color: "#000",
      fontWeight:'bold'
    },
    shareText: {
      fontSize: width > 375 ? 21 : 19,
      textAlign: "center",
      marginTop: 15,
      marginBottom: 20,
      width: "100%",
      fontWeight: "500",
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
    text: {
      fontSize: width > 375 ? 16 : 14,
      color: "#000",
      flex: 1,
    },
    button: {
      backgroundColor: Colors.light.tint,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 10,
    },
    buttonText: {
      color: "#fff",
      fontSize: width > 375 ? 16 : 14,
    },
    shareButton: {
      width: "100%",
      borderRadius: 10,
      paddingVertical: 15,
      backgroundColor: Colors.light.tint,
      alignItems: "center",
      marginTop: 10,
    },
    shareButtonText: {
      color: "#fff",
      fontSize: width > 375 ? 18 : 16,
      fontWeight: "bold",
    },
  });

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

  useFocusEffect(
    React.useCallback(() => {
      GetData();
      getreferal();
    }, [])
  );

  const getreferal = async () => {
    const storage = await AsyncStorage.getItem("authToken");
    try {
      const response = await fetch(BASE_URL + `/referrals/clients/all`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + storage,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur: ${response.status}`);
      }
      const data = await response.json();
      setallreferal(data["Total number of referrals"]);
      return data;
    } catch (error) {
      throw error;
    }
  };

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

  /*const handleShare = () => {
    var predefinedMessage = "";
    if (language == "fr") {
      predefinedMessage = `TOYA, c'est le VTC local qui respecte ton temps et ton budget ! 💯
Inscris-toi avec ce lien et t'as direct -50% sur ta première course.
👉 https://www.toya-vtc.com/ #ToyaFamily`;
    } else {
      predefinedMessage = `TOYA, it's the local ride-hailing service that respects your time and your budget! 💯
Sign up with this link and get an instant -50% on your first ride.
👉 https://www.toya-vtc.com/ #ToyaFamily`;
    }

    const url = `sms:?body=${encodeURIComponent(predefinedMessage)}`;

    Linking.openURL(url).catch(() => {
      alert("L'application WhatsApp n'est pas installée");
    });
  };*/
  const handleShare = async () => {
    let predefinedMessage = "";

    if (language === "fr") {
      predefinedMessage =
        `TOYA, c'est le VTC local qui respecte ton temps et ton budget ! 💯

  Inscris-toi avec ce lien et t'as direct -50% dès ta seconde course.
  👉https://www.toya-vtc.com/ #ToyaFamily.
  Voici mon code ` + referralCode;
    } else {
      predefinedMessage =
        `TOYA, it's the local ride-hailing service that respects your time and your budget! 💯
  Sign up with this link and get an instant -50% starting from your second ride.
  👉 https://www.toya-vtc.com/ #ToyaFamily
  Here is my code ` + referralCode;
    }

    try {
      await Share.share({ message: predefinedMessage });
    } catch (error) {
      Alert.alert("Erreur", "Le partage a échoué.");
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
                  source={require("../../assets/images/profile.jpg")}
                />
              )}
              <Text style={styles.headerText}>
                {firstName} {lastName}
              </Text>
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.referralText}>{t("sponsored_friends")}</Text>
              <Text style={styles.referralCount}>{allreferal}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.instructionText}>{t("sharecodetext")}</Text>

            <Text style={styles.shareText}>{t("share_link")}</Text>

            <View style={styles.card}>
              <Text style={styles.text}>{referralCode}</Text>
              <TouchableOpacity style={styles.button} onPress={copyToClipboard}>
                <Text style={styles.buttonText}>{t("copy")}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>{t("share_code")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
