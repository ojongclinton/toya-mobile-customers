import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export default function NetworkToast() {
  const [status, setStatus] = useState<"offline" | "restored" | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const hide = (delay = 0) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -80,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setStatus(null));
    }, delay);
  };

  useEffect(() => {
    let isFirstCheck = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;

      if (isFirstCheck) {
        isFirstCheck = false;
        if (!connected) {
          setStatus("offline");
          show();
        }
        return;
      }

      if (!connected) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setStatus("offline");
        show();
      } else {
        setStatus("restored");
        show();
        hide(2000);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!status) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        status === "offline" ? styles.offline : styles.restored,
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>
        {status === "offline" ? "Pas de connexion internet" : "Connexion rétablie"}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  offline: {
    backgroundColor: "#333",
  },
  restored: {
    backgroundColor: "#4CAF50",
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
