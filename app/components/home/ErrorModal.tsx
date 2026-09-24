import React from "react";
import { Modal, View, Text, Button, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export default function ErrorModal({ visible, message, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView>
            <Text style={styles.message}>{message}</Text>
          </ScrollView>
          <Button title={t("close")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  content: { width: "80%", padding: 20, backgroundColor: "white", borderRadius: 10 },
  message: { marginBottom: 20, fontSize: 16 },
});
