import React from "react";
import { Modal, Animated, View, Text, Image, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";
import { Colors } from "@/constants/Colors";

type Props = {
  visible: boolean;
  driverFirstName: string;
  rating: number;
  labels: string[];
  message: string;
  isSubmittingReview: boolean;
  onChangeRating: (v: number) => void;
  onChangeMessage: (v: string) => void;
  onClose: () => void;
};

export default function ReviewModal({
  visible, driverFirstName, rating, labels, message,
  isSubmittingReview, onChangeRating, onChangeMessage, onClose,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal animationType="none" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("rate_comment")}</Text>
            <Image style={styles.headerImage} source={require("../../../assets/images/logo.png")} />
            <Text style={styles.driverName}>{driverFirstName}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t("ride_title")}</Text>
          <View style={styles.starsRow}>
            <View style={styles.starsContainer}>
              {Array.from({ length: 5 }).map((_, index) => (
                <TouchableOpacity key={index} onPress={() => onChangeRating(index + 1)}>
                  <Icon
                    source={index < rating ? "star" : "star-outline"}
                    size={30}
                    color={index < rating ? "#FFC107" : "#E0E0E0"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{rating > 0 ? labels[rating - 1] : t("select_rating")}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t("your_feedback")}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("your_feedback")}
            multiline
            numberOfLines={3}
            value={message}
            onChangeText={onChangeMessage}
          />

          <TouchableOpacity
            style={[styles.submitBtn, isSubmittingReview && { opacity: 0.5 }]}
            onPress={onClose}
            disabled={isSubmittingReview}
          >
            <Text style={styles.submitBtnText}>{isSubmittingReview ? t("loading") : t("close")}</Text>
          </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavContainer: { width: "98%", alignSelf: "center", flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingTop: 20, paddingBottom: 40 },
  content: { backgroundColor: "white", borderRadius: 10, padding: 20, margin: 15 },
  header: { flex: 1, alignItems: "center", marginBottom: 12 },
  headerTitle: { color: "black", fontWeight: "bold", fontSize: 30, textAlign: "center" },
  headerImage: { width: 60, height: 60, borderRadius: 100 },
  driverName: { color: "black", fontWeight: "bold" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#000" },
  starsRow: { alignItems: "center", marginVertical: 8 },
  starsContainer: { flexDirection: "row" },
  ratingLabel: { marginTop: 10, fontSize: 16, color: "#757575" },
  textInput: { backgroundColor: "#F2F2F2", borderRadius: 10, minHeight: 120, maxHeight: 120, textAlignVertical: "top", marginTop: 20, padding: 20 },
  submitBtn: { borderRadius: 10, marginHorizontal: 15, paddingVertical: 20, backgroundColor: Colors.light.tint, alignItems: "center", marginTop: "10%" },
  submitBtnText: { color: "#fff", fontSize: 16 },
});
