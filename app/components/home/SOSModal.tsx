import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCallPolice: () => void;
  onCallGendarmerie: () => void;
  onCallPompiers: () => void;
};

export default function SOSModal({ visible, onClose, onCallPolice, onCallGendarmerie, onCallPompiers }: Props) {
  const { t } = useTranslation();
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Icon source="alert-octagon" size={50} color="#FF3B30" />
            <Text style={styles.title}>{t("emergency")}</Text>
          </View>
          <Text style={styles.subtitle}>{t("select_emergency_service")}</Text>
          <TouchableOpacity style={styles.emergencyBtn} onPress={onCallPolice} activeOpacity={0.8}>
            <Icon source="shield-alert" size={26} color="white" />
            <Text style={styles.emergencyBtnText}>{t("call_police")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyBtn} onPress={onCallGendarmerie} activeOpacity={0.8}>
            <Icon source="shield-check" size={26} color="white" />
            <Text style={styles.emergencyBtnText}>{t("call_gendarmerie")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.emergencyBtn, styles.pompiersBtn]} onPress={onCallPompiers} activeOpacity={0.8}>
            <Icon source="fire-truck" size={26} color="white" />
            <Text style={styles.emergencyBtnText}>{t("call_pompiers")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)", justifyContent: "center", alignItems: "center" },
  content: { width: "88%", maxWidth: 400, backgroundColor: "white", borderRadius: 25, padding: 30, alignItems: "center", elevation: 10 },
  header: { alignItems: "center", marginBottom: 25 },
  title: { fontSize: 32, fontWeight: "bold", color: "#FF3B30", marginTop: 15, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 30, lineHeight: 22 },
  emergencyBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FF3B30", paddingVertical: 18, paddingHorizontal: 20, borderRadius: 15, marginBottom: 15, elevation: 4 },
  emergencyBtnText: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 12 },
  pompiersBtn: { backgroundColor: "#E05C00" },
  cancelBtn: { width: "100%", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 15, borderWidth: 2, borderColor: "#CCCCCC", marginTop: 15, backgroundColor: "#F5F5F5" },
  cancelBtnText: { color: "#666", fontSize: 17, fontWeight: "600", textAlign: "center" },
});
