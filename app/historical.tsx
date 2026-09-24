import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator } from "react-native";

import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import BASE_URL from "@/constants/api/BASE_URL";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "expo-router";

const { width } = Dimensions.get("window");

export default function Historical() {
  const insets = useSafeAreaInsets();
  const [url, seturl] = useState("");
  const { t, i18n } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [credit, setCredit] = useState(0);
  const [clientInfo, setclientInfo] = useState([]);
  const [modalinfoVisible, setModalInfoVisible] = useState(false);
  const [details, setDetails] = useState({});
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useFocusEffect(
    React.useCallback(() => {
      getAllTransactions();
    }, [])
  );

  const getAllTransactions = async () => {
    try {
      const storage = await AsyncStorage.getItem("authToken");
      const clientinfoString = await AsyncStorage.getItem("Info");
      const clientinfo = clientinfoString ? JSON.parse(clientinfoString) : null;
      setclientInfo(clientinfo?.Data || {});
      seturl(clientinfo?.profile_picture);

      const storedTransactionsString = await AsyncStorage.getItem("transactions");
      const storedTransactions = storedTransactionsString
        ? JSON.parse(storedTransactionsString)
        : [];

      if (storedTransactions.length > 0) {
        const sortedCache = [...storedTransactions].sort((a, b) =>
          new Date(b.ride_date || 0).getTime() - new Date(a.ride_date || 0).getTime()
        );
        setTransactions(sortedCache);
        setCredit(
          sortedCache.reduce((sum, tx) => sum + (tx.final_price || 0), 0)
        );
      }

      const historyUrl = BASE_URL + "/rides/client/history";
      fetch(historyUrl, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + storage,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
        .then((response) => response.json())
        .then(async (data) => {
          const apiTransactions = data.Data?.History || [];
          if (apiTransactions.length > 0) {
            const sorted = [...apiTransactions].sort((a, b) =>
              new Date(b.ride_date || 0).getTime() - new Date(a.ride_date || 0).getTime()
            );
            setTransactions(sorted);
            setCredit(data.Data?.["Total expenses"] || 0);
            await AsyncStorage.setItem("transactions", JSON.stringify(sorted));
          }
        })
        .catch((error) => {
        });
    } catch (error) {
    }
  };

  const FR_MONTHS: Record<string, string> = {
    Jan: "Janv", Feb: "Févr", Mar: "Mars", Apr: "Avr", May: "Mai",
    Jun: "Juin", Jul: "Juil", Aug: "Août", Sep: "Sept", Oct: "Oct", Nov: "Nov", Dec: "Déc",
  };
  const localizeRideDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    if (i18n.language !== "fr") return dateStr;
    return dateStr.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g,
      (m) => FR_MONTHS[m] ?? m);
  };

  const getPrestationLabel = (prestation) => {
    const map = { economy: "Économie", confort: "Confort", prestige: "Prestige" };
    return map[prestation] || prestation || "-";
  };

  // Libellé du mode de paiement (les noms de marque restent identiques en FR/EN)
  const paymentLabel = (mode) => {
    switch (mode) {
      case "orange_money":
        return "Orange Money";
      case "mtn_money":
        return "MTN Mobile Money";
      case "cash":
        return t("payment_cash");
      default:
        return mode || "-";
    }
  };

  // Libellé du type de remise
  const discountTypeLabel = (type) => {
    switch (type) {
      case "first_ride":
        return t("hist_discount_first_ride");
      case "promo":
        return t("hist_discount_promo");
      case "referral":
      case "referral_reward":
        return t("hist_discount_referral_reward");
      default:
        return type || "";
    }
  };

  // Durée lisible à partir d'un nombre de secondes (ex. "5 min 12 s", "47 s")
  const formatSeconds = (seconds) => {
    if (seconds == null || isNaN(seconds)) return "";
    const total = Math.round(Number(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m <= 0) return `${s} s`;
    return `${m} min ${s.toString().padStart(2, "0")} s`;
  };

  const renderStars = (rating) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          source={i <= rating ? "star" : "star-outline"}
          size={18}
          color={i <= rating ? "#FFD700" : "#ccc"}
        />
      ))}
    </View>
  );

  const showModalInfo = (id, transaction) => {
    setDetails(null);
    setSelectedTransaction(transaction);
    setModalInfoVisible(true);
    transactionDetails(id);
  };

  const closeModalInfo = () => {
    setModalInfoVisible(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getAllTransactions();
    setRefreshing(false);
  };

  const transactionDetails = async (rides_id) => {
    const storage = await AsyncStorage.getItem("authToken");
    try {
      const response = await fetch(
        `${BASE_URL}/rides/client/details/${rides_id}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + storage,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      const detail = data?.Data?.Data?.[0];

      if (detail) {
        setDetails(detail);
        return detail;
      }
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t("history")}</Text>
          {url ? (
            <Image style={styles.headerImage} source={{ uri: url }} />
          ) : (
            <Image
              style={styles.headerImage}
              source={require("../assets/images/profile.jpg")}
            />
          )}
          <Text style={styles.headerText}>
            {clientInfo.first_name} {clientInfo.last_name}
          </Text>
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.totalExpenseText}>{t("total_expense")}</Text>
          <Text style={styles.totalExpenseValue}>{credit?.toLocaleString("fr-FR")} F CFA</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.titleBody}>{t("history")}</Text>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.tint]}
              tintColor={Colors.light.tint}
            />
          }
        >
          {transactions.length > 0 ? (
            transactions.map((transaction: any, index: number) => (
              <TouchableOpacity
                key={transaction.id ?? index}
                onPress={() => showModalInfo(transaction.id, transaction)}
                style={styles.touchableWrapper}
              >
                <View style={styles.listItem}>
                  <View style={styles.leftColumn}>
                    {transaction.image_profile ? (
                      <Image
                        style={styles.listImage}
                        source={{ uri: transaction.image_profile }}
                      />
                    ) : (
                      <Image
                        style={styles.listImage}
                        source={require("../assets/images/toyalogo.png")}
                      />
                    )}
                    <View style={styles.itineraryColumn}>
                      <View style={styles.circle} />
                      <View style={styles.verticalLine} />
                      <Icon
                        source="map-marker"
                        size={16}
                        color="#9C27B0"
                      />
                    </View>
                  </View>

                  {/* Colonne droite : infos */}
                  <View style={styles.transactionContent}>
                    <View style={styles.headerRow}>
                      <Text style={styles.transactionName}>
                        {transaction.full_name}
                      </Text>
                      <Text style={styles.transactionPrice}>
                        {transaction.final_price?.toLocaleString("fr-FR")} F CFA
                      </Text>
                    </View>
                    <Text style={styles.transactionDate}>
                      {localizeRideDate(transaction.ride_date) || "-"}
                    </Text>

                    <Text style={styles.locationText}>
                      {transaction.start_location}
                    </Text>
                    <View style={{ height: 10 }} />
                    <Text style={styles.locationText}>
                      {transaction.end_location}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noTransactionsText}>
              {t("no_transactions")}
            </Text>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalinfoVisible}
        onRequestClose={closeModalInfo}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {details ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
                {/* Photo + nom */}
                <View style={{ alignItems: "center", marginBottom: 10 }}>
                  <Image
                    source={
                      details?.image_profile
                        ? { uri: details.image_profile }
                        : require("../assets/images/toyalogo.png")
                    }
                    style={styles.profileImage}
                  />
                  <Text style={styles.nameText}>
                    {details?.full_name || "John Doe"}
                  </Text>
                  {/* Étoiles */}
                  {(details?.driver_rating ?? selectedTransaction?.driver_rating) != null && (
                    <View style={{ marginTop: 4 }}>
                      {renderStars(details?.driver_rating ?? selectedTransaction?.driver_rating)}
                    </View>
                  )}
                  {/* Grade */}
                  {(details?.driver_grade || selectedTransaction?.driver_grade) ? (
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeText}>{details?.driver_grade || selectedTransaction?.driver_grade}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Infos course */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t("info_section")} :</Text>
                  {(details?.discount_amount ?? selectedTransaction?.discount_amount) > 0 && (
                    <>
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>{t("hist_gross_price")}</Text>
                        <Text style={styles.value}>{Number(details?.gross_price ?? selectedTransaction?.gross_price).toLocaleString("fr-FR")} F CFA</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={[styles.label, { flex: 1 }]} numberOfLines={2}>
                          {t("hist_discount")}
                          {(details?.discount_percentage ?? selectedTransaction?.discount_percentage) ? ` (-${details?.discount_percentage ?? selectedTransaction?.discount_percentage}%)` : ""}
                          {(details?.discount_type ?? selectedTransaction?.discount_type) ? ` · ${discountTypeLabel(details?.discount_type ?? selectedTransaction?.discount_type)}` : ""}
                        </Text>
                        <Text style={[styles.value, { color: "#E53935" }]}>
                          -{Number(details?.discount_amount ?? selectedTransaction?.discount_amount).toLocaleString("fr-FR")} F CFA
                        </Text>
                      </View>
                      {(details?.promo_code ?? selectedTransaction?.promo_code) ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.label}>{t("hist_promo_code")}</Text>
                          <Text style={styles.value}>{details?.promo_code ?? selectedTransaction?.promo_code}</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t("course_price")}</Text>
                    <Text style={[styles.value, { fontWeight: "700" }]}>{details?.final_price?.toLocaleString("fr-FR")} F CFA</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t("hist_payment_method")}</Text>
                    <Text style={styles.value}>{paymentLabel(details?.mode_of_payments ?? selectedTransaction?.mode_of_payments)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t("distance")}</Text>
                    <Text style={styles.value}>{details?.distance} km</Text>
                  </View>
                  {(details?.duration_seconds ?? selectedTransaction?.duration_seconds) != null ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>{t("duration")}</Text>
                      <Text style={styles.value}>{formatSeconds(details?.duration_seconds ?? selectedTransaction?.duration_seconds)}</Text>
                    </View>
                  ) : (details?.duration_minutes != null) && (
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>{t("duration")}</Text>
                      <Text style={styles.value}>{Math.round(details.duration_minutes)} min</Text>
                    </View>
                  )}
                  {(details?.waiting_seconds ?? selectedTransaction?.waiting_seconds) != null && (
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>{t("hist_waiting_time")}</Text>
                      <Text style={styles.value}>{formatSeconds(details?.waiting_seconds ?? selectedTransaction?.waiting_seconds)}</Text>
                    </View>
                  )}
                  {(details?.ride_rating ?? selectedTransaction?.ride_rating) != null && (
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>{t("hist_rating_given")}</Text>
                      {renderStars(details?.ride_rating ?? selectedTransaction?.ride_rating)}
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Prestation</Text>
                    <Text style={styles.value}>{getPrestationLabel(details?.prestation || selectedTransaction?.prestation)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>
                      {localizeRideDate(details?.ride_date ?? details?.date ?? selectedTransaction?.ride_date ?? selectedTransaction?.date)}
                    </Text>
                  </View>
                </View>


                {/* Itinéraire */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t("route_info")}</Text>
                  <View style={styles.routeRow}>
                    <Icon source="flag-outline" size={18} color="#7E57C2" />
                    <Text style={styles.routeText} numberOfLines={2} ellipsizeMode="tail">
                      {details?.start_location}
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Icon source="map-marker-outline" size={18} color="#7E57C2" />
                    <Text style={styles.routeText} numberOfLines={2} ellipsizeMode="tail">
                      {details?.end_location}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.closeButton, { marginBottom: 10 }]}
                  onPress={closeModalInfo}
                >
                  <Text style={styles.closeButtonText}>{t("close")}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                <ActivityIndicator
                  size="large"
                  color="#7E57C2"
                  style={{ marginVertical: 20 }}
                />
                <TouchableOpacity style={styles.closeButton} onPress={closeModalInfo}>
                  <Text style={styles.closeButtonText}>{t("close")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    height: 300,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    paddingHorizontal: "8%",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  headerImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: 100,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    color: "white",
  },
  headerBody: {
    alignItems: "center",
    marginBottom: 30,
  },
  totalExpenseText: {
    color: "white",
    fontSize: 18,
  },
  totalExpenseValue: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
  },
  body: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  titleBody: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "black",
  },
  scrollContainer: {
    paddingBottom: 60,
  },
  touchableWrapper: {
    marginBottom: 20,
  },

  transactionContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },

  leftColumn: {
    alignItems: "center",
    marginRight: 15,
    justifyContent: "space-between",
  },

  itineraryColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
  },

  listImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  circle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9C27B0",
    marginBottom: 4,
  },

  verticalLine: {
    width: 1,
    height: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#9C27B0",
    marginBottom: 4,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
  transactionPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  transactionDate: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  itinerary: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  locationText: {
    fontSize: 14,
    color: "#333",
  },
  noTransactionsText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
  },
  nameText: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 15,
  },
  section: {
    width: "100%",
    marginTop: 10,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: {
    color: "#333",
    fontSize: 14,
  },
  value: {
    color: "#333",
    fontSize: 14,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  routeText: {
    flex: 1,
    marginLeft: 8,
    color: "#333",
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: "#7E57C2",
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  gradeBadge: {
    marginTop: 6,
    backgroundColor: "#EDE7F6",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gradeText: {
    color: "#7E57C2",
    fontSize: 13,
    fontWeight: "600",
  },
});
