import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { type WeatherData, type WeatherAlert } from "../../hooks/useWeather";

interface Props {
  weather: WeatherData | null;
}

const SEVERITY_RANK: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 };
const SEVERITY_LABEL: Record<string, string> = {
  Extreme: "Extrême", Severe: "Sévère", Moderate: "Modérée", Minor: "Mineure",
};
const SEVERITY_COLOR: Record<string, string> = {
  Extreme: "#7f1d1d", Severe: "#b4370a", Moderate: "#b45309", Minor: "#6b7280",
};

const topSeverity = (alerts: WeatherAlert[]): string =>
  alerts.reduce((acc, a) => ((SEVERITY_RANK[a.severity] ?? 0) > (SEVERITY_RANK[acc] ?? 0) ? a.severity : acc), "Minor");

export default function WeatherWidget({ weather }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!weather) return null;

  const hasAlert = weather.alerts.length > 0;
  const sev = hasAlert ? topSeverity(weather.alerts) : "Minor";
  const pillAlertColor = hasAlert ? SEVERITY_COLOR[sev] : undefined;

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, hasAlert && { backgroundColor: pillAlertColor }]}
        onPress={() => hasAlert && setExpanded(true)}
        activeOpacity={hasAlert ? 0.8 : 1}
      >
        <Text style={styles.text}>
          {weather.emoji}  {weather.temperature}°  {weather.conditionText}
        </Text>
        {hasAlert && <Text style={styles.alertBadge}>⚠️</Text>}
      </TouchableOpacity>

      {hasAlert && (
        <Modal transparent animationType="fade" visible={expanded} onRequestClose={() => setExpanded(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setExpanded(false)}>
            <View style={styles.alertBox} onStartShouldSetResponder={() => true}>
              <Text style={styles.alertTitle}>⚠️ Alertes météo</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                {weather.alerts.map((a, i) => (
                  <View key={i} style={styles.alertCard}>
                    <View style={styles.alertCardHead}>
                      <Text style={styles.alertEmoji}>{a.emoji}</Text>
                      <Text style={styles.alertHeadline}>{a.headline}</Text>
                      <View style={[styles.sevChip, { backgroundColor: SEVERITY_COLOR[a.severity] ?? "#6b7280" }]}>
                        <Text style={styles.sevChipText}>{SEVERITY_LABEL[a.severity] ?? a.severity}</Text>
                      </View>
                    </View>
                    {!!a.detail && <Text style={styles.alertDetail}>{a.detail}</Text>}
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.7}>
                <Text style={styles.alertClose}>Appuyer pour fermer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: { color: "white", fontSize: 13, fontWeight: "600" },
  alertBadge: { fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  alertBox: { backgroundColor: "white", borderRadius: 16, padding: 20 },
  alertTitle: { fontSize: 17, fontWeight: "bold", color: "#c0392b", marginBottom: 14 },
  alertCard: { backgroundColor: "#faf7f5", borderRadius: 12, padding: 12, marginBottom: 10 },
  alertCardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertEmoji: { fontSize: 20 },
  alertHeadline: { flex: 1, fontSize: 14, fontWeight: "700", color: "#222" },
  sevChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sevChipText: { color: "white", fontSize: 10, fontWeight: "700" },
  alertDetail: { fontSize: 13, color: "#555", marginTop: 6, lineHeight: 18 },
  alertClose: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 },
});
