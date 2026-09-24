import BASE_URL from "@/constants/api/BASE_URL";
import CONVESATION_URL from "@/constants/api/CONVERSATION_URL";
import SUPPORT_URL from "@/constants/api/SUPPORT_URL";
import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";

export default function Chatcontent({ route, navigation }: any) {
  const { t } = useTranslation();
  const paramName = route.params?.paramName;
  const isClosed =
    paramName?.status === "closed" || paramName?.status === "resolved";

  const [newMessage, setNewMessage] = useState("");
  const [rideOrTicket, setRideOrTicket] = useState("rides_id");
  const [idRide, setIdRide] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [id, setId] = useState("");
  const [chatData, setChatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ws = useRef(null);
  const pendingMessagesRef = useRef(new Map());
  const storageKeyRef = useRef("");
  // Interval de ping WS — gardé en ref pour être nettoyé au démontage (évite fuite).
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (isoString: any) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageTextColor = (sender_id: any) =>
    sender_id === id ? "#333" : "#fff";
  const getTimestampColor = (sender_id: any) =>
    sender_id === id ? "#555" : "#eee";

  // Hash avec timestamp — détecter les doublons dans chatData
  const createMessageHash = (sender_id: string, message: string, timestamp?: string) => {
    return `${sender_id}_${message.trim()}_${timestamp || ""}`;
  };

  // Hash sans timestamp — détecter l'écho WebSocket de nos propres messages
  const createPendingHash = (sender_id: string, message: string) => {
    return `${sender_id}_${message.trim()}`;
  };

  const getMessageUniqueId = (msg: any) => {
    return msg.id || msg._id || `${msg.sender_id}_${msg.message}_${msg.timestamp || msg.created_at}`;
  };

  const loadLocalMessages = async (key: any) => {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setChatData(parsed);
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const saveLocalMessages = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    const initialize = async () => {
      if (!paramName) return;
      const myUserId = await AsyncStorage.getItem("userId");
      setId(myUserId ?? "");

      let storageKey = "";
      let isTicket = false;

      if ("issue_description" in paramName) {
        setRideOrTicket("ticket_id");
        const ticketId = paramName.ticket_id ?? paramName.id;
        setIdRide(ticketId);
        storageKey = `chat_ticket_${ticketId}`;
        isTicket = true;

        const supportReceiverId =
          paramName["Receiver Data"]?.receiver_id ||
          paramName["Receiver Data"]?.id ||
          paramName.receiver_id ||
          null;
        setReceiverId(supportReceiverId);
      } else {
        setRideOrTicket("rides_id");

        const rideId = paramName.ride_id;
        setIdRide(rideId);
        storageKey = `chat_ride_${rideId}`;

        const driverId = paramName.driver_id;
        setReceiverId(driverId);
      }

      storageKeyRef.current = storageKey;

      // 1. Cache local
      const cachedMessages = await loadLocalMessages(storageKey);
      if (cachedMessages && cachedMessages.length > 0) {
        setChatData(cachedMessages);
        setLoading(false);
      }

      // 2. API
      const ticketId = paramName.ticket_id ?? paramName.id;
      if (isTicket) {
        await getSupport(ticketId, storageKey, myUserId);
      } else {
        await getChat(paramName.ride_id, storageKey);
      }

      // 3. WebSocket
      const authToken = await AsyncStorage.getItem("authToken");
      const wsUrl = isTicket
        ? SUPPORT_URL + `${ticketId}/?token=${authToken}`
        : CONVESATION_URL + `${paramName.ride_id}/?token=${authToken}`;

      const connectWs = () => {
        if (!isMounted.current) return;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);
        };

        ws.current.onmessage = (event) => {
          try {
            const newMsg = JSON.parse(event.data);

            if (newMsg.error) return;

            if (!newMsg.message || !newMsg.sender_id) return;

            const pendingHash = createPendingHash(newMsg.sender_id, newMsg.message);
            if (pendingMessagesRef.current.has(pendingHash)) {
              pendingMessagesRef.current.delete(pendingHash);
              return;
            }

            setChatData((prev) => {
              const exists = prev.some(
                (msg) =>
                  msg.sender_id === newMsg.sender_id &&
                  msg.message === newMsg.message &&
                  (msg.timestamp || msg.created_at) === (newMsg.timestamp || newMsg.created_at)
              );
              if (exists) return prev;
              const msgWithTime = {
                ...newMsg,
                timestamp: newMsg.timestamp || newMsg.created_at || new Date().toISOString(),
              };
              const updated = [...prev, msgWithTime];
              saveLocalMessages(storageKeyRef.current, updated);
              return updated;
            });
          } catch {}
        };

        ws.current.onerror = () => {};

        ws.current.onclose = (event) => {
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (event.code !== 1000 && isMounted.current) {
            setTimeout(connectWs, 3000);
          }
        };
      };

      connectWs();
    };

    initialize();

    return () => {
      isMounted.current = false;
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      if (ws.current) { ws.current.close(); ws.current = null; }
    };
  }, []);

  const sendMessage = () => {
    if (!ws.current) return;
    if (ws.current.readyState !== WebSocket.OPEN) return;
    if (!newMessage.trim()) return;

    const timestamp = new Date().toISOString();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const msgHash = createPendingHash(id, newMessage);

    pendingMessagesRef.current.set(msgHash, true);

    const effectiveReceiverId = receiverId ||
      (rideOrTicket !== "rides_id" ? (chatData as any[]).find((m) => m.receiver_id)?.receiver_id : null);

    const payload =
      rideOrTicket === "rides_id"
        ? { message: newMessage, sender_id: id, ...(effectiveReceiverId ? { receiver_id: effectiveReceiverId } : {}), rides_id: idRide }
        : { message: newMessage, sender_id: id, ...(effectiveReceiverId ? { receiver_id: effectiveReceiverId } : {}), ticket_id: idRide };

    const newMsg = { ...payload, timestamp, id: tempId };
    setChatData((prev) => {
      const exists = prev.some(
        (msg) => msg.message === newMessage && msg.sender_id === id && msg.timestamp === timestamp
      );
      if (exists) return prev;
      const updated = [...prev, newMsg];
      saveLocalMessages(storageKeyRef.current, updated);
      return updated;
    });

    ws.current.send(JSON.stringify(payload));
    setNewMessage("");

    setTimeout(() => {
      if (pendingMessagesRef.current.has(msgHash)) {
        pendingMessagesRef.current.delete(msgHash);
      }
    }, 5000);
  };

  const mergeWithTemp = (serverMessages: any[], prev: any[]) => {
    // Conserver les messages temp (optimistes) pas encore confirmés par le serveur
    const tempMsgs = prev.filter(
      m => String(m.id || '').startsWith('temp_') &&
        !serverMessages.some(s => s.message === m.message && s.sender_id === m.sender_id)
    );
    return [...serverMessages, ...tempMsgs];
  };

  const getChat = async (idRide, storageKey) => {
    try {
      const storage = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + `/conversation/${idRide}`, {
        headers: { Authorization: `Bearer ${storage}`, Accept: "application/json" },
      });
      const data = await response.json();
      if (data.Data && Array.isArray(data.Data)) {
        setChatData(prev => {
          const merged = mergeWithTemp(data.Data, prev);
          saveLocalMessages(storageKey, merged);
          return merged;
        });
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getSupport = async (idSupport: any, storageKey: any, myUserId?: string) => {
    try {
      const storage = await AsyncStorage.getItem("authToken");
      const response = await fetch(BASE_URL + `/support/${idSupport}`, {
        headers: { Authorization: `Bearer ${storage}`, Accept: "application/json" },
      });
      const data = await response.json();
      if (data.Data && Array.isArray(data.Data)) {
        const msgWithReceiver = data.Data.find((m: any) => m.receiver_id);
        if (msgWithReceiver?.receiver_id) {
          setReceiverId(msgWithReceiver.receiver_id);
        }
        setChatData(prev => {
          const merged = mergeWithTemp(data.Data, prev);
          saveLocalMessages(storageKey, merged);
          return merged;
        });
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (rideOrTicket === "rides_id") {
      await getChat(idRide, storageKeyRef.current);
    } else {
      await getSupport(idRide, storageKeyRef.current);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {paramName?.ticket_id ? (
        <View style={ccNavStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ccNavStyles.backBtn}>
            <Icon source="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <View style={ccNavStyles.titleRow}>
            <Image source={require("../assets/images/toyalogo.png")} style={ccNavStyles.logo} />
            <Text style={ccNavStyles.title} numberOfLines={1}>{t("support_chat_title")}</Text>
          </View>
          <View style={ccNavStyles.spacer} />
        </View>
      ) : (
        <View style={ccNavStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ccNavStyles.backBtn}>
            <Icon source="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={ccNavStyles.titleSimple} numberOfLines={1}>{t("driver_chat_title")}</Text>
          <View style={ccNavStyles.spacer} />
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
      {isClosed && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>{t("ticket_closed")}</Text>
        </View>
      )}

      {loading && chatData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={chatData}
          keyExtractor={(item, index) => getMessageUniqueId(item) || `msg_${index}`}
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ flexDirection: "column-reverse" }}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => {
            const isMine = item.sender_id === id;
            return (
              <View
                style={[
                  styles.messageContainer,
                  isMine ? styles.sentMessage : styles.receivedMessage,
                ]}
              >
                <Text style={[styles.messageText, { color: getMessageTextColor(item.sender_id) }]}>
                  {item.message}
                </Text>
                <Text style={[styles.timestampText, { color: getTimestampColor(item.sender_id) }]}>
                  {formatTime(item.timestamp || item.created_at)}
                </Text>
              </View>
            );
          }}
        />
      )}

      {!isClosed && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={t("message_placeholder")}
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Icon
              source="send"
              size={40}
              color={newMessage.trim() ? Colors.light.tint : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  closedBanner: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  closedBannerText: {
    color: "#888",
    fontSize: 14,
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
    marginHorizontal: 10,
  },
  sentMessage: { alignSelf: "flex-end", backgroundColor: "#e0e0e0" },
  receivedMessage: {
    alignSelf: "flex-start",
    backgroundColor: Colors.light.tint,
  },
  messageText: { fontSize: 16 },
  timestampText: { fontSize: 12, marginTop: 5, alignSelf: "flex-end" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 10,
  },
  sendButton: { padding: 10 },
});

const ccNavStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  backBtn: { padding: 4 },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 16 },
  title: { fontSize: 17, fontWeight: "600", color: "#333" },
  titleSimple: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: "#333" },
  spacer: { width: 32 },
});
