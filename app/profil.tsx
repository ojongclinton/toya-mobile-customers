import {
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Button,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";

import BASE_URL from "@/constants/api/BASE_URL";
import styles from "../assets/styles/global_styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";
import { Colors } from "@/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profil({ navigation }: { navigation: any }) {
  const [url, seturl] = useState("");
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisiblewant, setModalVisiblewant] = useState(false);
  const [photo, setPhoto] = useState(null);

  // ✅ NOUVEAU : États pour la suppression de compte
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const getData = async () => {
        const data = await AsyncStorage.getItem("Info");
        if (data) {
          try {
            const datatojson = JSON.parse(data);
            if (!datatojson?.Data) return;
            setFirstName(datatojson.Data.first_name);
            setLastName(datatojson.Data.last_name);
            seturl(datatojson.profile_picture);
          } catch {}
        }
      };
      getData();
    }, [])
  );

  const pickphoto = async () => {
    setModalVisiblewant(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert(t("gallery_permission_denied"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      setPhoto({
        uri: file.uri,
        name: "profile.jpg",
        mimeType: "image/jpeg",
      });
      setModalVisible(true);
    }
  };

  const confirmphoto = async (file) => {
    setModalVisible(false);
    const formData = new FormData();
    try {
      const storage = await AsyncStorage.getItem("authToken");
      const instance = axios.create({
        baseURL: BASE_URL,
        timeout: 15000,
        headers: {
          Authorization: "Bearer " + storage,
          "Content-Type": "multipart/form-data",
        },
      });
      formData.append("profile_picture", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      });

      const response = await instance.post(
        "/clients/upload/profile_picture/",
        formData
      );
      seturl(response.data["Profile Picture URL"]);
      getInfo();
    } catch {
      Alert.alert(t("connection_error"));
    }
  };

  const getInfo = async () => {
    try {
      const storage = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + "/clients/profile/", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + storage,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = await response.json();
      await AsyncStorage.removeItem("Info");
      await AsyncStorage.setItem("Info", JSON.stringify(data));
    } catch {
      // silently ignore
    }
  };

  const logout = async () => {
    // Conserver les préférences non liées au compte
    const language = await AsyncStorage.getItem("language");
    const deviceId = await AsyncStorage.getItem("device_id");
    await AsyncStorage.clear();
    if (language) await AsyncStorage.setItem("language", language);
    if (deviceId) await AsyncStorage.setItem("device_id", deviceId);
    navigation.reset({
      index: 0,
      routes: [{ name: "index" }],
    });
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + "/clients/delete/", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        setIsDeleting(false);
        Alert.alert(t("connection_error"));
        return;
      }

      await AsyncStorage.clear();
      setIsDeleting(false);
      setModalDeleteVisible(false);
      navigation.reset({ index: 0, routes: [{ name: "index" }] });
    } catch {
      clearTimeout(timeoutId);
      setIsDeleting(false);
      Alert.alert(t("connection_error"));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={style.welcomeText}>{t("home")}</Text>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setModalVisiblewant(true)}>
              <View>
                {url ? (
                  <Image style={styles.headerImage} source={{ uri: url }} />
                ) : (
                  <Image
                    style={styles.headerImage}
                    source={require("../assets/images/profile.jpg")}
                  />
                )}
                <View style={style.plusIconContainer}>
                  <Icon source="plus" size={20} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.headerText}>
              {firstName} {lastName}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.menuContainer}
            onPress={() => navigation.navigate("driver_profile")}
          >
            <Icon source="check-circle" size={25} color="#000" />
            <Text style={styles.menuText}>{t("sponsorship")}</Text>
          </TouchableOpacity>

          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.menuContainer}
            onPress={() => navigation.navigate("user_profile")}
          >
            <Icon source="account-circle" size={25} color="#000" />
            <Text style={styles.menuText}>{t("profile")}</Text>
          </TouchableOpacity>

          <View style={styles.separator} />
          <TouchableOpacity style={styles.menuContainer} onPress={logout}>
            <Icon source="exit-to-app" size={25} color="#000" />
            <Text style={styles.menuText}>{t("logout")}</Text>
          </TouchableOpacity>

          {/* ✅ NOUVEAU : Bouton suppression de compte */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.menuContainer}
            onPress={() => setModalDeleteVisible(true)}
          >
            <Icon source="delete" size={25} color="red" />
            <Text style={[styles.menuText, { color: "red" }]}>
              {t("delete_account")}
            </Text>
          </TouchableOpacity>
          <View style={styles.separator} />
        </View>

        {/* ✅ AJOUTÉ : Espace en bas pour éviter que le contenu soit caché par la barre de navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal photo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={style.modalContainer}>
          <View style={style.modalContent}>
            <Text style={style.modalText}>{t("uplouadphoto")}</Text>
            {photo && (
              <Image style={style.modalImage} source={{ uri: photo.uri }} />
            )}
            <View style={style.modalButtons}>
              <Button
                title={t("cancel")}
                onPress={() => setModalVisible(false)}
              />
              <Button
                title={t("confirm")}
                onPress={() => confirmphoto(photo)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal changement photo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisiblewant}
        onRequestClose={() => setModalVisiblewant(false)}
      >
        <View style={style.modalContainer}>
          <View style={style.modalContent}>
            <Text style={style.modalText}>{t("want")}</Text>
            <View style={style.modalButtons}>
              <Button
                title={t("no")}
                onPress={() => setModalVisiblewant(false)}
              />
              <Button title={t("yes")} onPress={pickphoto} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ NOUVEAU : Modal suppression de compte */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDeleteVisible}
        onRequestClose={() => setModalDeleteVisible(false)}
      >
        <View style={style.modalContainer}>
          <View style={style.modalContent}>

            {/* Icône d'avertissement */}
            <View style={style.deleteIconContainer}>
              <Icon source="alert-circle" size={50} color="red" />
            </View>

            <Text style={style.deleteTitle}>
              {t("delete_account_confirm_title")}
            </Text>

            <Text style={style.deleteMessage}>
              {t("delete_account_confirm_message")}
            </Text>

            <View style={style.deleteButtons}>
              {/* Bouton Annuler */}
              <TouchableOpacity
                style={style.cancelButton}
                onPress={() => setModalDeleteVisible(false)}
                disabled={isDeleting}
              >
                <Text style={style.cancelButtonText}>{t("cancel")}</Text>
              </TouchableOpacity>

              {/* Bouton Supprimer */}
              <TouchableOpacity
                style={style.deleteButton}
                onPress={deleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={style.deleteButtonText}>{t("delete")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const style = StyleSheet.create({
  welcomeText: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    zIndex: 10,
  },
  plusIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: "#fff",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },

  // ✅ NOUVEAU : Styles pour la modal de suppression
  deleteIconContainer: {
    marginBottom: 15,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  deleteMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  deleteButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 15,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "red",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});