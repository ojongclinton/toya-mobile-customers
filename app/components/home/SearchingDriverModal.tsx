import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";

type Props = {
  visible: boolean;
  noDriverFound: boolean;
  searchCountdown: number;
  onCancel: () => void;
  onRetry: () => void;
};

export default function SearchingDriverModal({ visible, noDriverFound, searchCountdown, onCancel, onRetry }: Props) {
  const { t } = useTranslation();
  const mm = String(Math.floor(searchCountdown / 60)).padStart(2, "0");
  const ss = String(searchCountdown % 60).padStart(2, "0");

  // Clignotement (icône véhicule + points "…") pendant la recherche.
  const pulse = useRef(new Animated.Value(1)).current;
  const searching = visible && !noDriverFound;
  useEffect(() => {
    if (!searching) { pulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [searching]);

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!noDriverFound ? (
            <>
              <View style={styles.iconBox}>
                <Animated.View style={[styles.iconCircle, { opacity: pulse }]}>
                  <Icon source="car" size={20} color="#9c27b0" />
                </Animated.View>
              </View>
              <Text style={styles.title}>{t("searching_drivers")}</Text>
              {searchCountdown > 0 ? (
                <Text style={styles.countdown}>{`${mm}:${ss}`}</Text>
              ) : (
                <Animated.Text style={[styles.countdown, { opacity: pulse }]}>…</Animated.Text>
              )}
              <TouchableOpacity style={styles.btn} onPress={onCancel}>
                <Text style={styles.btnText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconBox}>
                <View style={[styles.iconCircle, { backgroundColor: "#fce4ec" }]}>
                  <Icon source="car-off" size={20} color="#e91e63" />
                </View>
              </View>
              <Text style={styles.title}>{t("no_driver_found")}</Text>
              <Text style={styles.subtitle}>{t("no_driver_message")}</Text>
              <TouchableOpacity style={styles.btn} onPress={onRetry}>
                <Text style={styles.btnText}>{t("retry_search")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { marginTop: 8, borderColor: "#ccc" }]} onPress={onCancel}>
                <Text style={[styles.btnText, { color: "#757575" }]}>{t("cancel")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  container: { width: 300, padding: 20, backgroundColor: "#fff", borderRadius: 10, alignItems: "center" },
  iconBox: { marginBottom: 15, alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#e0e0e0", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 5, color: "#000" },
  countdown: { fontSize: 22, fontWeight: "600", color: "#6D56F2", marginBottom: 20, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: "#757575", marginBottom: 20 },
  btn: { marginTop: 15, paddingVertical: 10, paddingHorizontal: 30, backgroundColor: "#e0e0e0", borderRadius: 5, borderWidth: 1, borderColor: "#9c27b0", width: "90%" },
  btnText: { alignSelf: "center", color: "#9c27b0", fontWeight: "bold" },
});
