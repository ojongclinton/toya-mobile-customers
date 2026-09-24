import React from "react";
import { Modal, Animated, View, Text, Image, TouchableOpacity, StyleSheet, Linking, ScrollView, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";
import { Colors } from "@/constants/Colors";

type RideInfo = {
  Driver: {
    profile_picture?: string;
    first_name: string;
    lastname: string;
    vehicle_model: string;
    vehicle_brand?: string;
    license_plate: string;
    phone_number?: string;
    grade?: string;
    rating?: number | null;
  };
  Ride: {
    start_location: string;
    end_location: string;
    price: any;
    distance: any;
    prestation?: string;
    mode_of_payments?: string;
  };
};

type Props = {
  visible: boolean;
  infocoursencour: RideInfo;
  vehiclePhoto: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
  rideStarted: boolean;
  isCanceling: boolean;
  onClose: () => void;
  onCancel: () => void;
  getVehicleColorHex: (c: string) => string;
  getVehicleColorLabel: (c: string) => string;
};

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  Platinum: { bg: "#6DD5FA", text: "#fff" },
  Gold:     { bg: "#e5c650", text: "#fff" },
  Silver:   { bg: "#9E9E9E", text: "#fff" },
  Bronze:   { bg: "#CD7F32", text: "#fff" },
  Standard: { bg: "#EEEEEE", text: "#555" },
  default:  { bg: "#6D56F2", text: "#fff" },
};

const PAYMENT_LABELS: Record<string, string> = {
  orange_money: "Orange Money",
  mtn_money:    "MTN Money",
  cash:         "Espèces",
};

function renderStars(rating: number | null | undefined) {
  if (rating == null) return null;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Icon
        key={i}
        source={i <= Math.round(rating) ? "star" : "star-outline"}
        size={16}
        color="#e5c650"
      />
    );
  }
  return <View style={{ flexDirection: "row", alignItems: "center" }}>{stars}</View>;
}

export default function DriverInfoModal({
  visible, infocoursencour, vehiclePhoto, vehicleModel, vehicleColor, vehicleLicensePlate,
  rideStarted, isCanceling, onClose, onCancel, getVehicleColorHex, getVehicleColorLabel,
}: Props) {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const driver = infocoursencour.Driver;
  const ride = infocoursencour.Ride;

  const gradeStyle = GRADE_COLORS[driver.grade ?? ""] ?? GRADE_COLORS.default;
  const paymentLabel = ride.mode_of_payments
    ? (PAYMENT_LABELS[ride.mode_of_payments] ?? ride.mode_of_payments)
    : null;

  return (
    <Modal animationType="none" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={styles.content}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon source="close" size={24} color="#fff" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: screenHeight * 0.72 }}>
          <View style={styles.vehiclePhotoContainer}>
            {vehiclePhoto !== "" ? (
              <Image source={{ uri: vehiclePhoto }} style={styles.vehiclePhotoImage} resizeMode="cover" />
            ) : (
              <View style={[styles.vehiclePhotoImage, { backgroundColor: "#f0f0f0" }]} />
            )}
            <View style={styles.driverAvatarOverlay}>
              <Image
                style={styles.headerImage}
                source={driver.profile_picture ? { uri: driver.profile_picture } : require("../../../assets/images/profile.jpg")}
              />
            </View>
            <View style={styles.vehiclePhotoInfo}>
              {(driver.vehicle_brand || vehicleModel) !== "" && (
                <Text style={styles.vehicleModelText}>
                  {[driver.vehicle_brand, vehicleModel].filter(Boolean).join(" ")}
                </Text>
              )}
              {vehicleColor !== "" && (
                <View style={styles.vehicleColorBadgeRow}>
                  <View style={[styles.vehicleColorDotSmall, { backgroundColor: getVehicleColorHex(vehicleColor), borderColor: getVehicleColorHex(vehicleColor) }]} />
                  <Text style={styles.vehicleColorSmallText}>{getVehicleColorLabel(vehicleColor)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Nom + grade + étoiles */}
          <View style={styles.driverHeaderRow}>
            <Text style={styles.driverName}>{driver.first_name} {driver.lastname}</Text>
            {driver.grade ? (
              <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
                <Text style={[styles.gradeText, { color: gradeStyle.text }]}>{driver.grade}</Text>
              </View>
            ) : null}
          </View>
          {driver.rating != null && (
            <View style={styles.starsRow}>
              {renderStars(driver.rating)}
            </View>
          )}

          <View>
            <View style={styles.routeRow}>
              <Icon source="directions" size={20} color="blue" />
              <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">{ride.start_location}</Text>
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.routeRow}>
              <Icon source="map-marker" size={20} color="green" />
              <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">{ride.end_location}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t("info_title")}</Text>
          <View style={styles.infoContent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{t("courseprice")}</Text>
            <Text style={styles.infoValue}>{Number(ride.price).toLocaleString()} FCFA</Text>
          </View>
          {ride.prestation ? (
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("service_type")}</Text>
              <Text style={styles.infoValue}>{t(ride.prestation)}</Text>
            </View>
          ) : null}
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{ride.distance} km</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{t("lisenseplate")}</Text>
            <Text style={styles.infoValue}>{vehicleLicensePlate || driver.license_plate}</Text>
          </View>
          {paymentLabel ? (
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("payment_mode_label")}</Text>
              <Text style={styles.infoValue}>{paymentLabel}</Text>
            </View>
          ) : null}

          {!rideStarted && (
            <View style={styles.cancelRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, isCanceling && { opacity: 0.5 }]}
                onPress={onCancel}
                disabled={isCanceling}
              >
                <Text style={styles.cancelBtnText}>{isCanceling ? t("loading") : "Annuler la course"}</Text>
              </TouchableOpacity>
            </View>
          )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { width: "98%", alignSelf: "center", flex: 1, justifyContent: "center", paddingTop: 20, paddingBottom: 100 },
  content: { backgroundColor: "white", borderRadius: 10, padding: 20, margin: 15 },
  closeButton: { position: "absolute", top: 1, right: 1, backgroundColor: Colors.light.tint, borderRadius: 20, padding: 4, zIndex: 10 },
  driverHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  driverName: { color: "black", fontWeight: "bold" },
  gradeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  gradeText: { fontSize: 11, fontWeight: "700" },
  starsRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 4 },
  ratingDivider: { fontSize: 14, color: "#bbb", marginHorizontal: 6 },
  ratingNumber: { fontSize: 12, color: "#555", fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", marginTop: 24, color: "#000" },
  infoContent: { justifyContent: "space-between", margin: 8, flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#000" },
  infoValue: { fontWeight: "600", color: "#000" },
  phoneLink: { fontWeight: "600", color: Colors.light.tint, textDecorationLine: "underline" },
  routeRow: { flexDirection: "row", alignItems: "center", opacity: 0.6 },
  routeText: { color: "black", fontWeight: "bold", flex: 1, marginLeft: 4 },
  routeSeparator: { opacity: 0.1, marginLeft: 20 },
  cancelRow: { marginTop: "5%", justifyContent: "center", alignItems: "center", flexDirection: "row" },
  cancelBtn: { width: "80%", borderRadius: 10, marginHorizontal: 15, paddingVertical: 12, backgroundColor: Colors.light.tint, alignItems: "center" },
  cancelBtnText: { color: "#fff", fontSize: 16 },
  headerImage: { width: 60, height: 60, borderRadius: 100 },
  driverAvatarOverlay: { position: "absolute", bottom: 30, right: 12, borderRadius: 40, borderWidth: 2, borderColor: "white", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  vehiclePhotoContainer: { width: "100%", borderRadius: 12, overflow: "visible", marginBottom: 12, borderWidth: 1, borderColor: "#e0e0e0", position: "relative" },
  vehiclePhotoImage: { width: "100%", height: 130, borderRadius: 12 },
  vehiclePhotoInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f9f9f9" },
  vehicleModelText: { fontSize: 13, fontWeight: "600", color: "#333" },
  vehicleColorBadgeRow: { flexDirection: "row", alignItems: "center" },
  vehicleColorDotSmall: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, marginRight: 5 },
  vehicleColorSmallText: { fontSize: 12, color: "#555" },
});
