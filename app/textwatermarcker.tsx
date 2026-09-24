import { View, Text, StyleSheet } from "react-native";

export default function TestWatermark() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.text}>VERSION TEST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "20%",
    left: 10,
    zIndex: 9999,
    alignItems: "flex-end",
  },
  text: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
