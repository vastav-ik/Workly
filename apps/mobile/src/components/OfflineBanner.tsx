import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } else {
      // For mobile devices, do a periodic ping to verify actual endpoint connectivity
      const checkConnection = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          await fetch("https://clients3.google.com/generate_204", {
            method: "GET",
            mode: "no-cors",
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          setIsOffline(false);
        } catch {
          setIsOffline(true);
        }
      };

      checkConnection();
      const interval = setInterval(checkConnection, 8000); // poll every 8 seconds
      return () => clearInterval(interval);
    }
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-red-950 border-b border-red-800 py-2 px-4 items-center justify-center">
      <Text className="text-red-400 text-xs font-semibold">
        ⚠️ No internet connection. Showing cached posts.
      </Text>
    </View>
  );
}
