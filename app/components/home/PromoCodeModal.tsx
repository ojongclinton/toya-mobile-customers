import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";

type Props = {
  visible: boolean;
  code: string;
  onChangeCode: (v: string) => void;
  onValidate: () => void;
  onIgnore: () => void;
  onClose: () => void;
  isEstimating: boolean;
};

export default function PromoCodeModal({ visible, code, onChangeCode, onValidate, onIgnore, onClose, isEstimating }: Props) {
  const { t } = useTranslation();
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>{t("enter_promo_code")}</Text>
          <TextInput style={styles.input} value={code} onChangeText={v => onChangeCode(v.toUpperCase())} placeholder={t("enter_promo_code")} autoCapitalize="characters" />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, isEstimating && { opacity: 0.5 }]} onPress={onValidate} disabled={isEstimating}>
              <Text style={styles.buttonText}>{isEstimating ? t("loading") : t("validate")}</Text>
            </TouchableOpacity>
            <View style={{ paddingLeft: "10%" }} />
            <TouchableOpacity style={[styles.button, isEstimating && { opacity: 0.5 }]} onPress={onIgnore} disabled={isEstimating}>
              <Text style={styles.buttonText}>{t("ignore")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  content: { width: 300, padding: 20, backgroundColor: "white", borderRadius: 20, alignItems: "center" },
  title: { fontSize: 25, fontWeight: "bold", marginBottom: 10, color: "#000" },
  input: { marginTop: 20, width: "90%", backgroundColor: "#f5f5f5", padding: 10, borderRadius: 10 },
  row: { flexDirection: "row", paddingTop: 20 },
  button: { backgroundColor: "#6200EE", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" },
});
