import "./global.css";
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme, resolveModuleFromRoute } from "./src/components/ThemeProvider";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import SpacesScreen from "./src/screens/SpacesScreen";
import ChatScreen from "./src/screens/ChatScreen";
import MarketScreen from "./src/screens/MarketScreen";
import MatchmakerScreen from "./src/screens/MatchmakerScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

type TabKey = "home" | "spaces" | "chat" | "market" | "match" | "profile";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "home", icon: "🏠", label: "Feed" },
  { key: "spaces", icon: "💬", label: "Spaces" },
  { key: "chat", icon: "✉️", label: "Chat" },
  { key: "market", icon: "📚", label: "Notes" },
  { key: "match", icon: "🤝", label: "Match" },
  { key: "profile", icon: "👤", label: "Profile" },
];

function MainTabs() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("home");
  const { setModule, accentText } = useTheme();

  React.useEffect(() => {
    setModule(resolveModuleFromRoute(activeTab));
  }, [activeTab, setModule]);

  const renderScreen = () => {
    switch (activeTab) {
      case "home": return <HomeScreen />;
      case "spaces": return <SpacesScreen />;
      case "chat": return <ChatScreen />;
      case "market": return <MarketScreen />;
      case "match": return <MatchmakerScreen />;
      case "profile": return <ProfileScreen />;
    }
  };

  return (
    <View className="flex-1 bg-neutral-900">
      <View className="flex-1">{renderScreen()}</View>
      <View className="flex-row bg-neutral-800 border-t border-neutral-700 pb-6 pt-2 px-1">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 items-center py-1 min-h-[48px] justify-center"
            onPress={() => setActiveTab(tab.key)}
          >
            <Text className={`text-lg ${activeTab === tab.key ? "" : "opacity-50"}`}>
              {tab.icon}
            </Text>
            <Text
              className={`text-xs mt-0.5 ${
                activeTab === tab.key ? `${accentText} font-semibold` : "text-content-darkSecondary"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center">
        <ActivityIndicator size="large" color="#7289da" />
        <Text className="text-content-darkSecondary mt-4">Loading CampusConnect...</Text>
      </View>
    );
  }

  return user ? <MainTabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
