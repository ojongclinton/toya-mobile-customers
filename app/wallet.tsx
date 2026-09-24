import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";
import BASE_URL from "@/constants/api/BASE_URL";

export default function Wallet({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const [url, setUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [total_rides, settotalrie] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      GetData();
      getstat();
    }, [])
  );

  const GetData = async () => {
    const test = await AsyncStorage.getItem("Info");
    if (test) {
      try {
        const data = JSON.parse(test);
        if (!data?.Data) return;
        setFirstName(data.Data.first_name);
        setLastName(data.Data.last_name);
        setUrl(data.profile_picture);
      } catch {}
    }
  };

  const getstat = async () => {
    const storage = await AsyncStorage.getItem("authToken");
    try {
      const response = await fetch(BASE_URL + `/clients/stats`, {
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
      const totalRides = data?.Data?.total_rides ?? 0;
      settotalrie(totalRides);
      return data;
    } catch {
      // silently ignore
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.walletHeader, { paddingTop: statusBarHeight }]}>
        <Text style={styles.walletHeaderTitle}>{t("promotion")}</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContent}>
            <Image
              style={styles.headerImage}
              source={
                url ? { uri: url } : require("../assets/images/profile.jpg")
              }
            />
            <Text style={styles.headerText}>
              {firstName} {lastName}
            </Text>
            <Text style={styles.subHeaderText}>{t("total_rides")}</Text>
            <Text style={styles.totalRides}>{total_rides}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => navigation.navigate("codepromotion")}
            >
              <Text style={styles.optionText}>{t("promo_code")}</Text>
              <View style={styles.iconContainer}>
                <Icon source="chevron-right" size={20} color="black" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => navigation.navigate("codeparrainage")}
            >
              <Text style={styles.optionText}>{t("referral_code")}</Text>
              <View style={styles.iconContainer}>
                <Icon source="chevron-right" size={20} color="black" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => navigation.navigate("driver_profile")}
            >
              <Text style={styles.optionText}>{t("refer_friends")}</Text>
              <View style={styles.iconContainer}>
                <Icon source="chevron-right" size={20} color="black" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.tint,
  },
  walletHeader: {
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    paddingBottom: 12,
  },
  walletHeaderTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 16,
  },
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 40, // plus besoin de forcer 80 sur Android
  },
  headerContent: {
    alignItems: "center",
  },
  headerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  subHeaderText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
  },
  totalRides: {
    color: "white",
    fontWeight: "bold",
    fontSize: 30,
    marginBottom: 20,
  },
  optionsContainer: {
    width: "90%",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    color: "black",
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
});
