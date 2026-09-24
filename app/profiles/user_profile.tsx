import {
  Image,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BASE_URL from "@/constants/api/BASE_URL";
import styles from "@/assets/styles/global_styles";

import { StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

export default function UserProfile({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState(null);
  const [url, seturl] = useState("");
  const [id, setId] = useState("");
  const [firstnametitle, setFirstnametitle] = useState("");
  const [lastnametitle, setLastnametitle] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adress, setAdress] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const style = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: Colors.light.lighterTint,
      minHeight: 50,
      justifyContent: "space-between",
      paddingHorizontal: 10,
      alignItems: "center",
      flexDirection: "row",
      fontWeight: "bold",
      marginTop: 10,
      width: "95%",
      borderRadius: 10,
      padding: "5%",
    },
    icon: {
      color: Colors.light.tint,
      fontSize: 20,
    },
    iconmety: {
      color: "#4CAF50",
      fontSize: 20,
    },
    button: {
      backgroundColor: Colors.light.tint,
      padding: 15,
      borderRadius: 10,
      marginTop: 60,
      alignItems: "center",
      width: "90%",
    },
    buttonText: {
      color: "white",
      fontWeight: "bold",
      fontSize: 17,
    },
    space: {
      height: 80,
    },
    image: {
      width: 90,
      height: 90,
      borderRadius: 100,
      borderWidth: 5,
      justifyContent: "center",
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      getData();
    }, [])
  );

  const getInfo = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + "/clients/profile/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données");
      }
      const data = await response.json();
      await AsyncStorage.setItem("Info", JSON.stringify(data));
    } catch {
      // silently ignore
    }
  };

  const getData = async () => {
    await getInfo();
    try {
      const info = await AsyncStorage.getItem("Info");
      if (!info) return;
      const data = JSON.parse(info);
      const d = data?.Data ?? {};
      setTokens(data.Tokens);
      setId(d.id);
      setFirstnametitle(d.first_name);
      setLastnametitle(d.last_name);
      setUsername(d.username);
      setEmail(d.email);
      setFirstname(d.first_name);
      setLastname(d.last_name);
      setTelephone(d.phone_number);
      setAdress(d.adresse);
      setReferralCode(d.referral_code);
      seturl(data.profile_picture);
    } catch {
      // Info absent ou JSON malformé → on n'écrase rien.
    }
  };

  const handleSubmit = async () => {
    const profileData = {
      username: username,
      email: email,
      first_name: firstname,
      last_name: lastname,
      phone_number: telephone,
      adresse: adress,
      referral_code: referralCode,
    };
    const storage = await AsyncStorage.getItem("authToken");
    try {
      const response = await fetch(BASE_URL + "/clients/profile/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + storage,
          Accept: "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        await response.json();
        setModalVisible(true);
        getData();
      }
    } catch {
      // silently ignore
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon source="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: "600", color: "#333" }}>{t("user_profile")}</Text>
        <View style={{ width: 32 }} />
      </View>
    <ScrollView>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                width: "80%",
                backgroundColor: "white",
                borderRadius: 10,
                padding: 20,
              }}
            >
              <Text style={{ textAlign: "center", fontSize: 18 }}>
                {t("profile_updated")}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 20,
                  backgroundColor: Colors.light.tint,
                  padding: 10,
                  borderRadius: 5,
                }}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  {t("close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <View>
          <View style={{ alignItems: "center" }}>
            {url ? (
              <Image style={styles.headerImage} source={{ uri: url }} />
            ) : (
              <Image
                style={styles.headerImage}
                source={require("../../assets/images/profile.jpg")}
              />
            )}
            <Text style={{ fontWeight: "bold", margin: 5 }}>
              {firstnametitle} {lastnametitle}
            </Text>
            <Text>{email}</Text>
          </View>
        </View>

        <TextInput
          style={style.card}
          placeholder={t("username")}
          onChangeText={setUsername}
          value={username}
        />
        <TextInput
          style={style.card}
          placeholder={t("email")}
          onChangeText={setEmail}
          value={email}
        />
        <TextInput
          style={style.card}
          placeholder={t("lastname")}
          onChangeText={setFirstname}
          value={firstname}
        />
        <TextInput
          style={style.card}
          placeholder={t("firstname")}
          onChangeText={setLastname}
          value={lastname}
        />
        <TextInput
          style={style.card}
          placeholder={t("phone_number")}
          onChangeText={setTelephone}
          value={telephone}
        />
        <TextInput
          style={style.card}
          placeholder={t("address")}
          onChangeText={setAdress}
          value={adress}
        />
        <TouchableOpacity style={style.button} onPress={handleSubmit}>
          <Text style={style.buttonText}>{t("save")}</Text>
        </TouchableOpacity>
        <View style={style.space} />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
