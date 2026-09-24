import React, { useState, useRef, useEffect } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import { Icon } from "react-native-paper";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Colors } from "@/constants/Colors";

const SCREEN_H = Dimensions.get("window").height;

const PAY_OPTIONS = [
  { value: "orange_money", label: "Orange Money", color: "#FF6600" },
  { value: "mtn_money", label: "MTN Mobile Money", color: "#FFC107" },
  { value: "cash", label: "Paiement en espèces", color: "#43A047" },
];

type Service = { Duration: any; Price: any } | null;

type Props = {
  visible: boolean;
  economy: Service; confort: Service; prestige: Service;
  prixeconomy: any; prixconfort: any; prixprestige: any;
  normalprixeconomy: number | null;
  normalprixconfort: number | null;
  normalprixprestige: number | null;
  appliedDiscount: { type: string; code: string; percentage: number } | null;
  distanceKm: number | null;
  selectedComfort: string;
  onSelectComfort: (v: string) => void;
  passengerCount: number;
  onIncrement: () => void;
  onDecrement: () => void;
  modepaiement: string;
  onChangePaiement: (v: string) => void;
  onOrder: () => void;
  onClose: () => void;
  isOrdering: boolean;
  onHeight?: (occupiedFromBottom: number) => void;
  onShown?: () => void;
};

export default function ServicePickerModal({
  visible, economy, confort, prestige,
  prixeconomy, prixconfort, prixprestige,
  normalprixeconomy, normalprixconfort, normalprixprestige,
  appliedDiscount, distanceKm,
  selectedComfort, onSelectComfort,
  passengerCount, onIncrement, onDecrement,
  modepaiement, onChangePaiement,
  onOrder, onClose, isOrdering, onHeight, onShown,
}: Props) {
  const { t } = useTranslation();
  // Hauteur de la barre d'onglets (Profil/Chat/Course…) pour remonter le sheet
  // au-dessus d'elle — sinon le bouton "Commander" passe derrière la tab bar.
  const tabBarHeight = useBottomTabBarHeight();
  const [payOpen, setPayOpen] = useState(false);
  // Animation d'apparition : le sheet glisse du bas vers le haut
  const slideAnim = useRef(new Animated.Value(500)).current;
  const shownRef = useRef(false);
  useEffect(() => {
    if (!visible) return;
    shownRef.current = false;
    // onShown ne doit se déclencher qu'UNE fois par ouverture.
    const fireShown = () => { if (!shownRef.current) { shownRef.current = true; onShown?.(); } };
    slideAnim.setValue(500);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 30, stiffness: 80, mass: 1.1 })
      .start(({ finished }) => { if (finished) fireShown(); });
    // Filet de sécurité : révèle le tracé même si l'animation est interrompue/ratée.
    const t = setTimeout(fireShown, 800);
    return () => clearTimeout(t);
  }, [visible]);
  if (!visible) return null;

  const normalPrices: Record<string, number | null> = {
    economy: normalprixeconomy,
    confort: normalprixconfort,
    prestige: normalprixprestige,
  };

  const hasPromo = !!appliedDiscount;
  const selectedPay = PAY_OPTIONS.find((o) => o.value === modepaiement) ?? PAY_OPTIONS[0];

  return (
    <View
      style={[styles.container, { bottom: tabBarHeight - 28 }]}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height + Math.max(0, tabBarHeight - 28))}
    >
      <Animated.View style={[styles.content, { paddingBottom: 48, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon source="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.grabber} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("ride_settings")}</Text>

        {/* Distance */}
        {distanceKm != null && (
          <View style={styles.infoRow}>
            <Icon source="map-marker-distance" size={20} color={Colors.light.tint} />
            <Text style={styles.infoText}>{distanceKm} km</Text>
          </View>
        )}

        {/* Badge code promo */}
        {hasPromo && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>
              {appliedDiscount.type === "promo"
                ? appliedDiscount.code
                  ? `${t("discount_type_promo")} ${appliedDiscount.code} (-${appliedDiscount.percentage}%)`
                  : `${t("discount_type_promo")} (-${appliedDiscount.percentage}%)`
                : `${t("discount_type_referral")} (-${appliedDiscount.percentage}%)`}
            </Text>
          </View>
        )}

        <View style={styles.passPayRow}>
          {/* Nombre de passagers (à gauche) */}
          <View style={styles.passPayColNarrow}>
            <Text style={styles.label}>{t("passenger_count")}</Text>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={onDecrement} style={[styles.stepBtn, passengerCount <= 1 && { opacity: 0.35 }]} disabled={passengerCount <= 1}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{passengerCount}</Text>
              <TouchableOpacity onPress={onIncrement} style={[styles.stepBtn, passengerCount >= 4 && { opacity: 0.35 }]} disabled={passengerCount >= 4}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Mode de paiement (à droite) */}
          <View style={styles.passPayColWide}>
            <Text style={[styles.label, { textAlign: "right" }]}>{t("payment_mode")}</Text>
            <TouchableOpacity style={styles.payBox} onPress={() => setPayOpen(true)} activeOpacity={0.7}>
              <View style={[styles.payDot, { backgroundColor: selectedPay.color }]} />
              <Text style={styles.payText} numberOfLines={1}>{selectedPay.label}</Text>
              <Icon source="chevron-down" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.label, { textAlign: "center", fontWeight: "bold", color: "#000", textTransform: "uppercase" }]}>{t("service_type")}</Text>
        <View style={styles.servicesRow}>
          {[
            { key: "economy", label: t("economy"), service: economy, prix: prixeconomy },
            { key: "confort",  label: t("comfort"),  service: confort,  prix: prixconfort },
            { key: "prestige", label: t("prestige"), service: prestige, prix: prixprestige },
          ].map(({ key, label, service, prix }) => {
            const normalPrix = normalPrices[key];
            const showStrike = hasPromo && normalPrix != null && normalPrix !== prix;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.serviceCard, selectedComfort === key && styles.selectedItem]}
                onPress={() => onSelectComfort(key)}
              >
                <Text style={styles.serviceText} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
                <Text style={styles.serviceDetails} numberOfLines={1}>{service?.Duration}</Text>
                {showStrike && (
                  <Text style={styles.strikePrice} numberOfLines={1}>{Number(normalPrix).toLocaleString()} CFA</Text>
                )}
                <Text style={[styles.servicePrice, showStrike && styles.promoPrice]} numberOfLines={1} adjustsFontSizeToFit>
                  {Number(prix).toLocaleString()} CFA
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        </ScrollView>

        {/* Bouton commander : HORS du ScrollView → toujours visible en bas du sheet */}
        <TouchableOpacity style={[styles.orderBtn, isOrdering && { opacity: 0.5 }]} onPress={onOrder} disabled={isOrdering}>
          <Text style={styles.orderBtnText}>{isOrdering ? t("loading") : t("order")}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Sélecteur de paiement custom — identique iOS / Android */}
      <Modal visible={payOpen} transparent animationType="fade" onRequestClose={() => setPayOpen(false)}>
        <TouchableOpacity style={styles.payOverlay} activeOpacity={1} onPress={() => setPayOpen(false)}>
          <View style={styles.paySheet}>
            <Text style={styles.payTitle}>{t("payment_mode")}</Text>
            {PAY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.payOption}
                onPress={() => { onChangePaiement(opt.value); setPayOpen(false); }}
                activeOpacity={0.7}
              >
                <View style={[styles.payDot, { backgroundColor: opt.color }]} />
                <Text style={styles.payOptionText}>{opt.label}</Text>
                {modepaiement === opt.value && <Icon source="check-circle" size={22} color={Colors.light.tint} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom sheet : ancré en bas, n'occupe que sa hauteur (le haut de la carte
  // — et le tracé de l'itinéraire — reste visible et interactif au-dessus).
  container: { position: "absolute", left: 0, right: 0, bottom: 0 },
  content: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  // SEUL limiteur de hauteur : la zone de champs scrolle si elle dépasse 55% de
  // l'écran. Le `content` n'a PAS de maxHeight → il grandit pour inclure le bouton
  // "Commander" (placé après), qui ne peut donc jamais être rogné.
  scroll: { maxHeight: SCREEN_H * 0.55 },
  scrollContent: { paddingBottom: 6 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", marginBottom: 8 },
  closeButton: { position: "absolute", top: 10, right: 12, zIndex: 2 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 6, color: "#000" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoText: { fontSize: 16, fontWeight: "600", color: "#5a5a5a" },
  promoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  promoBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  label: { marginTop: 8, fontSize: 15, color: "#757575" },
  passPayRow: { flexDirection: "row", gap: 12, marginTop: 4, alignItems: "flex-start" },
  passPayColNarrow: {},
  passPayColWide: { flex: 1 },
  // Stepper passagers moderne : [−] 1 [+]
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E3E1EC", borderRadius: 12, height: 46, overflow: "hidden", alignSelf: "flex-start", marginTop: 6 },
  stepBtn: { width: 42, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F4FB" },
  stepBtnText: { fontSize: 22, fontWeight: "700", color: Colors.light.tint, lineHeight: 24 },
  stepValue: { minWidth: 40, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#000" },
  // Sélecteur de paiement custom (assorti au stepper)
  payBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E3E1EC", borderRadius: 12, height: 46, marginTop: 6, paddingHorizontal: 12 },
  payDot: { width: 12, height: 12, borderRadius: 6 },
  payText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#000" },
  payOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 30 },
  paySheet: { backgroundColor: "white", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 8 },
  payTitle: { fontSize: 15, fontWeight: "700", color: "#000", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10 },
  payOptionText: { flex: 1, fontSize: 15, color: "#222" },
  // Prestations en cartes horizontales (3 côte à côte)
  servicesRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  serviceCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 1, borderColor: "#DDD", borderRadius: 10, alignItems: "center" },
  selectedItem: { borderColor: Colors.light.tint, borderWidth: 2, backgroundColor: "#F3F0FF" },
  serviceText: { fontSize: 13, fontWeight: "bold", color: "#000", textAlign: "center", textTransform: "uppercase" },
  serviceDetails: { fontSize: 11, color: "#777", marginTop: 2 },
  servicePrice: { fontSize: 15, fontWeight: "800", color: "#000", marginTop: 4 },
  strikePrice: { fontSize: 10, color: "#999", textDecorationLine: "line-through", marginTop: 2 },
  promoPrice: { color: Colors.light.tint },
  orderBtn: { backgroundColor: "#6C63FF", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 12 },
  orderBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
