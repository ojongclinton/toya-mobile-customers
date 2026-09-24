import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { Colors } from "@/constants/Colors";
import BASE_URL from "@/constants/api/BASE_URL";
import authFetch from "@/constants/api/authFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import CONVERSATION_URL from "@/constants/api/CONVERSATION_URL";
import { Icon } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Interface pour la nouvelle structure API
interface Conversation {
  conversation_id: string;
  ride_id: string;
  ride_status: string;
  other_user: {
    user_id: string;
    user_type: string;
    full_name: string;
    profile_picture: string;
  };
  last_message: {
    text: string;
    timestamp: string;
    sender: "you" | "other";
  };
  unread_count: number;
}

export default function Chat({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState("Chauffeurs");
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [modalinfoVisible, setModalInfoVisible] = useState(false);
  const [message, setmessage] = useState("");

  const [infochat, setinfochat] = useState<Conversation[]>([]);
  const [infotikets, setinfotikets] = useState([]);
  const [modalsupport, setmodalsupport] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [driverid, setDriverid] = useState("");
  const [driverFirstName, setDriverFirstName] = useState("");
  const [driverLastName, setDriverLastName] = useState("");
  const [driverProfilePicture, setDriverProfilePicture] = useState<string | null>(null);
  const [rideId, setRideId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSendingTicket, setIsSendingTicket] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const ws = useRef<WebSocket | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const storage = await AsyncStorage.getItem("authToken");
      await Promise.all([
        (async () => {
          const chatRes = await fetch(BASE_URL + `/conversation/all`, {
            headers: {
              Authorization: "Bearer " + storage,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });
          const chatData = await chatRes.json();
          if (chatData.Data && Array.isArray(chatData.Data)) {
            setinfochat(chatData.Data);
            await AsyncStorage.setItem("chatCache", JSON.stringify(chatData.Data));
          } else {
            setinfochat([]);
          }
        })(),
        (async () => {
          const ticketRes = await fetch(BASE_URL + `/support/client/tickets`, {
            headers: {
              Authorization: "Bearer " + storage,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });
          const ticketData = await ticketRes.json();
          const sorted = (ticketData.Data || []).sort(
            (a: any, b: any) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime()
          );
          setinfotikets(sorted);
        })(),
      ]);
    } catch (e: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const localChatRaw = await AsyncStorage.getItem("chatCache");
        if (localChatRaw) {
          setinfochat(JSON.parse(localChatRaw));
        }
        fetchData();
      } catch (e) {
      }
    };
    loadLocal();
  }, []);

  useEffect(() => {
    Getinforide();
    GetData();
  }, []);

  // Remonter le FAB au-dessus du clavier sur iOS
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  // ✅ Gestion de la connexion WebSocket
  useEffect(() => {
    if (rideId && activeTab === "Chauffeurs") {
      if (ws.current) {
        ws.current.close();
      }
      const wsUrl = CONVERSATION_URL + `${rideId}/`;
      ws.current = new WebSocket(wsUrl);
      ws.current.onopen = () => {};
      ws.current.onerror = () => {};
      ws.current.onclose = () => {};
    }
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [rideId, activeTab]);

  const showModalInfo = () => {
    if (activeTab === "Chauffeurs") {
      setModalInfoVisible(true);
    } else {
      setmodalsupport(true);
    }
  };

  const GetData = async () => {
    try {
      const test = await AsyncStorage.getItem("Info");
      if (!test) return;
      const data = JSON.parse(test);
      if (!data?.Data) return;
      setId(data.Data.id);
      await AsyncStorage.setItem("userId", data.Data.id);
    } catch (error) {
    }
  };

  const Getinforide = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("rideInfo");
      if (!jsonValue) return;
      const data = JSON.parse(jsonValue);
      setDriverid(data.Ride.driver_id || "");
      setDriverFirstName(data.Driver.first_name || "");
      setDriverLastName(data.Driver.lastname || "");
      setDriverProfilePicture(data.Driver.profile_picture || null);
      setRideId(data.Ride.ride_id || "");
    } catch (error) {
    }
  };

  const sendMessage = () => {
    if (!ws.current) {
      alert("Connexion non établie");
      return;
    }
    if (ws.current.readyState !== WebSocket.OPEN) {
      alert("Connexion en cours, veuillez réessayer dans un instant");
      return;
    }
    if (!message.trim()) return;

    const payload = {
      message: message,
      sender_id: id,
      receiver_id: driverid,
      rides_id: rideId,
    };
    try {
      ws.current.send(JSON.stringify(payload));
      setmessage("");
      setModalInfoVisible(false);
      fetchData();
      showToast(t("message_sent_success"));
    } catch (error) {
      alert("Erreur lors de l'envoi du message");
    }
  };

  const sendtikets = async () => {
    setIsSendingTicket(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const json: any = { issue_description: message };
      if (rideId) json.ride_id = rideId;
      const storage = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + "/support/client/contact", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + storage,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        setmodalsupport(false);
        setmessage("");
        fetchData();
        showToast(t("ticket_created_success"));
      } else {
        Alert.alert(t("connection_error"));
      }
    } catch {
      clearTimeout(timeoutId);
      Alert.alert(t("connection_error"));
    } finally {
      setIsSendingTicket(false);
    }
  };

  // ✅ Supprimer une conversation
  const deleteConversation = async (ridesId: string) => {
    Alert.alert(
      t("delete_conversation_title"),
      t("delete_conversation_message"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("authToken");
              const response = await fetch(BASE_URL + `/conversation/${ridesId}/delete`, {
                method: "DELETE",
                headers: {
                  Authorization: "Bearer " + token,
                  "Content-Type": "application/json",
                },
              });
              if (response.ok) {
                setinfochat((prev) => prev.filter((c) => c.ride_id !== ridesId));
              } else {
                Alert.alert(t("connection_error"));
              }
            } catch {
              Alert.alert(t("connection_error"));
            }
          },
        },
      ]
    );
  };

  // ✅ Supprimer toutes les conversations
  const confirmDeleteAll = async () => {
    setShowDeleteAllModal(false);
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + `/conversation/delete-all`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        setinfochat([]);
      } else {
        Alert.alert(t("connection_error"));
      }
    } catch {
      Alert.alert(t("connection_error"));
    }
  };

  // ✅ Supprimer un ticket support (uniquement si fermé)
  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setTicketToDelete(null);
    try {
      const res = await authFetch(`/support/tickets/${ticketToDelete}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        setinfotikets((prev: any[]) => prev.filter((t) => (t.ticket_id || t.id) !== ticketToDelete));
        showToast(t("ticket_deleted_success"));
      } else if (res.status === 403) {
        showToast(t("ticket_delete_forbidden"), "error");
      }
    } catch {
      Alert.alert(t("connection_error"));
    }
  };

  // ✅ Formater la date relative
  const formatRelativeTime = (timestamp: string): string => {
    if (!timestamp) return "";
    const now = new Date();
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) return "";
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return "à l'instant";
    if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;
    if (diffInHours < 24) return `il y a ${diffInHours} h`;
    if (diffInDays === 1) return "hier";
    if (diffInDays <= 3) return `il y a ${diffInDays} jours`;
    const hours = String(messageDate.getHours()).padStart(2, "0");
    const minutes = String(messageDate.getMinutes()).padStart(2, "0");
    return messageDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + `, ${hours}:${minutes}`;
  };

  const isRideActive = (status: string) =>
    status === "in_progress" || status === "accepted_by_driver";

  // ✅ Ouvrir une conversation — uniquement si la course est en cours
  const handleChatPress = (conversation: Conversation) => {
    if (!isRideActive(conversation.ride_status)) {
      showToast(t("chat_unavailable") || "Chat disponible uniquement pendant une course active", "error");
      return;
    }
    const enhancedItem = {
      conversation_id: conversation.conversation_id,
      ride_id: conversation.ride_id,
      ride_status: conversation.ride_status,
      other_user: conversation.other_user,
      last_message: conversation.last_message,
      unread_count: conversation.unread_count,
      driver_id: conversation.other_user.user_id,
    };
    navigation.navigate("chatcontent", { paramName: enhancedItem });
  };

  // ✅ Rendu d'un élément de conversation
  const renderChatItem = ({ item }: { item: Conversation }) => {
    const profilePicture = item.other_user?.profile_picture || "";
    const fullName = item.other_user?.full_name || "Inconnu";
    const lastMessage = item.last_message?.text || "Aucun message";
    const timestamp = item.last_message?.timestamp;
    const unreadCount = item.unread_count || 0;
    const isLastMessageFromMe = item.last_message?.sender === "you";

    const imageSource =
      profilePicture && profilePicture.trim() !== ""
        ? { uri: profilePicture }
        : require("../assets/images/profile.jpg");

    const active = isRideActive(item.ride_status);

    return (
      <View style={[styles.chatItem, !active && { opacity: 0.45 }]}>
        <TouchableOpacity
          style={styles.chatItemContent}
          onPress={() => handleChatPress(item)}
        >
          <View style={styles.avatarContainer}>
            <Image style={styles.avatar} source={imageSource} />
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={styles.name} numberOfLines={1}>
                {fullName}
              </Text>
              {timestamp && (
                <Text style={styles.time}>
                  {formatRelativeTime(timestamp)}
                </Text>
              )}
            </View>
            <View style={styles.messagePreview}>
              {isLastMessageFromMe && (
                <Text style={styles.messagePrefix}>Vous: </Text>
              )}
              <Text style={styles.lastMessage} numberOfLines={1}>
                {lastMessage}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteConversation(item.ride_id)}
        >
          <Icon source="trash-can-outline" size={20} color="#e53935" />
        </TouchableOpacity>
      </View>
    );
  };

  // ✅ Ouvrir un ticket support
  const handleTicketPress = (ticket: any) => {
    navigation.navigate("chatcontent", {
      paramName: {
        ticket_id: ticket.ticket_id || ticket.id,
        issue_description: ticket.issue_description,
        status: ticket.status,
        "Receiver Data": ticket["Receiver Data"] || {},
      },
    });
  };

  // ✅ Rendu d'un ticket support
  const renderSupportItem = ({ item }: { item: any }) => {
    const date = item.created_at || item.timestamp || "";
    const isClosed = item.status === "closed" || item.status === "resolved";
    const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
      open:        { label: t("status_open"),     bg: "#e6f4ea", color: "#2e7d32" },
      pending:     { label: t("status_pending"),  bg: "#fff3e0", color: "#e65100" },
      in_progress: { label: t("status_progress"), bg: "#e3f2fd", color: "#1565c0" },
      closed:      { label: t("status_closed"),   bg: "#f5f5f5", color: "#757575" },
      resolved:    { label: t("status_resolved"), bg: "#f5f5f5", color: "#757575" },
    };
    const st = statusConfig[item.status] ?? { label: item.status ?? "", bg: "#f5f5f5", color: "#757575" };
    return (
      <View style={styles.chatItem}>
        <TouchableOpacity style={styles.chatItemContent} onPress={() => handleTicketPress(item)}>
          <View style={styles.avatarContainer}>
            <View style={styles.supportAvatar}>
              <Icon source="headset" size={24} color="#fff" />
            </View>
          </View>
          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}>
                <Text style={[styles.name, { flex: 0 }]}>Support Toya</Text>
                {!!item.status && (
                  <View style={{ backgroundColor: st.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: st.color }}>{st.label}</Text>
                  </View>
                )}
              </View>
              {date !== "" && (
                <Text style={styles.time}>{formatRelativeTime(date)}</Text>
              )}
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.issue_description || "Ticket de support"}
            </Text>
          </View>
        </TouchableOpacity>
        {isClosed && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setTicketToDelete(item.ticket_id || item.id)}
          >
            <Icon source="trash-can-outline" size={20} color="#e53935" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const chats = activeTab === "Chauffeurs" ? infochat : infotikets;

  return (
    <View style={styles.container}>
      {/* Header violet avec titre + onglets */}
      <View style={{ paddingTop: insets.top, backgroundColor: "#fff" }}>
        <Text style={styles.messageSectionTitle}>{t("message_section")}</Text>
      </View>
      <View style={styles.headerSection}>
        <Text style={styles.headerText}>{t("chat_list")}</Text>

        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity onPress={() => setActiveTab("Chauffeurs")} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === "Chauffeurs" && styles.activeTabText]}>
                {t("drivers")}
              </Text>
              {activeTab === "Chauffeurs" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab("Support")} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === "Support" && styles.activeTabText]}>
                {t("support")}
              </Text>
              {activeTab === "Support" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
          {activeTab === "Chauffeurs" && infochat.length > 1 && (
            <TouchableOpacity style={styles.deleteAllBtn} onPress={() => setShowDeleteAllModal(true)}>
              <Icon source="trash-can-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Liste */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : chats && chats.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 16, color: "#888" }}>
            {activeTab === "Chauffeurs" ? t("no_driver_chats") : t("no_support_tickets")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={activeTab === "Chauffeurs" ? renderChatItem : renderSupportItem}
          keyExtractor={(item, index) =>
            activeTab === "Chauffeurs"
              ? (item as Conversation).conversation_id || index.toString()
              : item.id?.toString() || index.toString()
          }
          contentContainerStyle={[styles.chatList, { paddingBottom: 120 }]}
          style={styles.chatListContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.tint]}
              tintColor={Colors.light.tint}
            />
          }
        />
      )}

      {/* Modal message chauffeur */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalinfoVisible}
        onRequestClose={() => setModalInfoVisible(false)}
      >
        <View style={styles.modalAddCreditContainer}>
          <Animated.View style={styles.modalAddCreditContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalInfoVisible(false)}>
              <Icon source="close" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Image
                style={styles.headerImage}
                source={
                  driverProfilePicture && driverProfilePicture.trim() !== ""
                    ? { uri: driverProfilePicture }
                    : require("../assets/images/profile.jpg")
                }
              />
              <Text style={styles.modalHeaderText}>
                {driverFirstName} {driverLastName}
              </Text>
            </View>
            <Text style={styles.messageLabelText}>Message</Text>
            <TextInput
              style={styles.input}
              placeholder={t("message_placeholder")}
              placeholderTextColor="#999"
              onChangeText={setmessage}
              value={message}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={[styles.closeInfo, { marginTop: "10%" }]} onPress={sendMessage}>
              <Text style={styles.textButtonAddCredit}>{t("send")}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal support */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalsupport}
        onRequestClose={() => setmodalsupport(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalAddCreditContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
            <Animated.View style={styles.modalAddCreditContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setmodalsupport(false)}>
                <Icon source="close" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Image
                  style={styles.toyaLogoModal}
                  source={require("../assets/images/toyalogo.png")}
                />
                <Text style={styles.modalHeaderText}>{t("create_ticket")}</Text>
              </View>
              <Text style={styles.messageLabelText}>Message</Text>
              <TextInput
                style={styles.input}
                placeholder={t("message_placeholder")}
                placeholderTextColor="#999"
                onChangeText={setmessage}
                value={message}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={[styles.closeInfo, { marginTop: 20 }, isSendingTicket && { opacity: 0.7 }]}
                onPress={sendtikets}
                disabled={isSendingTicket}
              >
                {isSendingTicket
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.textButtonAddCredit}>{t("send")}</Text>
                }
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal confirmation suppression ticket support */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={ticketToDelete !== null}
        onRequestClose={() => setTicketToDelete(null)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>{t("delete_ticket_title")}</Text>
            <Text style={styles.confirmModalMessage}>{t("delete_ticket_message")}</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalBtn, styles.confirmCancelBtn]}
                onPress={() => setTicketToDelete(null)}
              >
                <Text style={styles.confirmCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalBtn, styles.confirmDeleteBtn]}
                onPress={confirmDeleteTicket}
              >
                <Text style={styles.confirmDeleteText}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal confirmation suppression toutes conversations */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteAllModal}
        onRequestClose={() => setShowDeleteAllModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>{t("delete_all_conversations_title")}</Text>
            <Text style={styles.confirmModalMessage}>{t("delete_all_conversations_message")}</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalBtn, styles.confirmCancelBtn]}
                onPress={() => setShowDeleteAllModal(false)}
              >
                <Text style={styles.confirmCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalBtn, styles.confirmDeleteBtn]}
                onPress={confirmDeleteAll}
              >
                <Text style={styles.confirmDeleteText}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB chauffeur — actif uniquement si une course existe */}
      {activeTab === "Chauffeurs" && (
        <TouchableOpacity
          style={[styles.newChatButton, driverid === "" && { backgroundColor: "#ccc" }, keyboardHeight > 0 && { bottom: keyboardHeight + 16 }]}
          onPress={() => {
            if (!rideId || !driverid) {
              showToast(t("no_active_ride") || "Aucune course active en cours", "error");
              return;
            }
            navigation.navigate("chatcontent", {
              paramName: { ride_id: rideId, driver_id: driverid },
            });
          }}
          disabled={driverid === ""}
        >
          <Icon source="message-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* FAB support — toujours actif */}
      {activeTab === "Support" && (
        <TouchableOpacity
          style={[styles.newChatButton, keyboardHeight > 0 && { bottom: keyboardHeight + 16 }]}
          onPress={() => setmodalsupport(true)}
        >
          <Icon source="message-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Toast */}
      <Animated.View
        style={[styles.toast, { opacity: toastOpacity, backgroundColor: toastType === "error" ? "#c62828" : "#2e7d32" }]}
        pointerEvents="none"
      >
        <Icon source={toastType === "error" ? "alert-circle" : "check-circle"} size={18} color="#fff" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  textButtonAddCredit: {
    color: "#fff",
    fontSize: 16,
  },
  closeInfo: {
    borderRadius: 10,
    marginHorizontal: 15,
    paddingVertical: 20,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
  },
  messageLabelText: {
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 15,
  },
  headerImage: {
    borderColor: Colors.light.tint,
    borderWidth: 5,
    marginTop: 25,
    width: 80,
    height: 80,
    borderRadius: 100,
  },
  toyaLogoModal: {
    marginTop: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: "cover",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  modalAddCreditContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalAddCreditContent: {
    height: 450,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    margin: 15,
  },
  input: {
    height: 50,
    borderColor: "transparent",
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerSection: {
    backgroundColor: "#6D56F2",
  },
  backBtn: { padding: 4, width: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    color: "#fff",
  },
  messageSectionTitle: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 15,
    color: "#6D56F2",
  },
  modalHeaderText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 15,
    color: "#000",
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.3)",
    marginTop: 20,
  },
  deleteAllBtn: {
    paddingLeft: 8,
    paddingRight: 30,
    paddingVertical: 8,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  tab: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.7)",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  activeTabIndicator: {
    height: 2,
    backgroundColor: "#fff",
    marginTop: 4,
  },
  chatListContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatList: {
    padding: 16,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  chatItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  supportAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  nameUnread: {
    fontWeight: "700",
  },
  time: {
    fontSize: 11,
    color: "#999",
    marginLeft: 8,
  },
  timeUnread: {
    color: "#6D56F2",
    fontWeight: "500",
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  messagePrefix: {
    fontSize: 13,
    color: "#999",
    marginRight: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: "#888",
  },
  lastMessageUnread: {
    color: "#000",
    fontWeight: "500",
  },
  newChatButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#8f5eff",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2e7d32",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  confirmModalContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 32,
    width: "85%",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmModalMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmCancelBtn: {
    backgroundColor: "#f0f0f0",
  },
  confirmCancelText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 15,
  },
  confirmDeleteBtn: {
    backgroundColor: "#e53935",
  },
  confirmDeleteText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});