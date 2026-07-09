import "./global.css";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AuthProvider, useAuth, API_BASE } from "./src/context/AuthContext";
import { ThemeProvider, useTheme, resolveModuleFromRoute } from "./src/components/ThemeProvider";
import * as Sentry from "@sentry/react-native";
import { PostHogProvider } from "posthog-react-native";
import * as Haptics from "expo-haptics";
import { mutate } from "swr";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
  debug: __DEV__,
});

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import SpacesScreen from "./src/screens/SpacesScreen";
import ChatScreen from "./src/screens/ChatScreen";
import MarketScreen from "./src/screens/MarketScreen";
import MatchmakerScreen from "./src/screens/MatchmakerScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

type TabKey = "home" | "spaces" | "market" | "profile";

const TABS: { key: TabKey | "create"; icon: string; label: string }[] = [
  { key: "home", icon: "🏠", label: "Feed" },
  { key: "spaces", icon: "💬", label: "Spaces" },
  { key: "create", icon: "+", label: "Create" },
  { key: "market", icon: "🎒", label: "Market" },
  { key: "profile", icon: "👤", label: "Profile" },
];

function MainTabs() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("home");
  const { setModule, accentText } = useTheme();
  const { token } = useAuth();

  // Global Content Creation Modal State
  const [createPostVisible, setCreatePostVisible] = React.useState(false);
  const [newContent, setNewContent] = React.useState("");
  const [newTags, setNewTags] = React.useState("");
  const [newMediaUrl, setNewMediaUrl] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);

  React.useEffect(() => {
    setModule(resolveModuleFromRoute(activeTab));
  }, [activeTab, setModule]);

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen />;
      case "spaces":
        return <SpacesScreen />;
      case "market":
        return <MarketScreen />;
      case "profile":
        return <ProfileScreen />;
    }
  };

  const handleTabPress = (tabKey: TabKey | "create") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }

    if (tabKey === "create") {
      setCreatePostVisible(true);
    } else {
      setActiveTab(tabKey);
    }
  };

  const handleGlobalCreatePost = async () => {
    if (!newContent.trim()) {
      Alert.alert("Error", "Content cannot be empty.");
      return;
    }
    setPublishing(true);

    const tagsArray = newTags
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
    const mediaUrlsArray = newMediaUrl.trim() ? [newMediaUrl.trim()] : [];

    try {
      const res = await fetch(`${API_BASE}/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newContent,
          tags: tagsArray,
          mediaUrls: mediaUrlsArray,
        }),
      });

      if (res.ok) {
        setCreatePostVisible(false);
        setNewContent("");
        setNewTags("");
        setNewMediaUrl("");
        
        // Navigate back to home feed tab to see result
        setActiveTab("home");

        // Revalidate all active SWR keys starting with GET /feed
        mutate((key) => typeof key === "string" && key.startsWith(`${API_BASE}/feed`));
        
        Alert.alert("Success", "Post created successfully!");
      } else {
        const errData = await res.json();
        Alert.alert("Blocked by Safety Filter", errData.error || "Failed to publish post.");
      }
    } catch {
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-1">{renderScreen()}</View>
      
      {/* Dynamic Bottom Navigation Bar with Center Elevated FAB */}
      <View className="flex-row bg-slate-900 border-t border-slate-800/80 pb-6 pt-2 px-2 items-center justify-around">
        {TABS.map((tab) => {
          if (tab.key === "create") {
            return (
              <TouchableOpacity
                key={tab.key}
                style={{ transform: [{ translateY: -12 }], shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 }}
                className="w-14 h-14 rounded-full bg-indigo-600 items-center justify-center border-4 border-slate-950"
                onPress={() => handleTabPress("create")}
              >
                <Text className="text-white text-3xl font-bold">+</Text>
              </TouchableOpacity>
            );
          }

          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              className="items-center py-1 min-h-[48px] justify-center flex-1"
              onPress={() => handleTabPress(tab.key)}
            >
              <Text className={`text-lg ${isActive ? "" : "opacity-45"}`}>
                {tab.icon}
              </Text>
              <Text
                className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${
                  isActive ? `${accentText} font-black` : "text-slate-500"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Global Composition Slide-Up Bottom Sheet Modal */}
      <Modal
        visible={createPostVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreatePostVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 h-[80%] overflow-hidden">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-slate-800">
              <Text className="text-white font-bold text-lg">Create Post</Text>
              <TouchableOpacity
                onPress={() => setCreatePostVisible(false)}
                className="p-1 min-h-[40px] justify-center"
              >
                <Text className="text-slate-400 font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Scroll Form */}
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Content</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-3 min-h-[120px] text-sm border border-slate-800 mb-4"
                placeholder="What's happening on campus? Type #placements or #exams to auto-tag!"
                placeholderTextColor="#475569"
                multiline
                textAlignVertical="top"
                value={newContent}
                onChangeText={setNewContent}
              />

              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Hashtags (Comma separated)</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-800 mb-4"
                placeholder="fests, exams, placement"
                placeholderTextColor="#475569"
                value={newTags}
                onChangeText={setNewTags}
              />

              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Attach Mock Image URL</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-800 mb-6"
                placeholder="https://picsum.photos/600/400"
                placeholderTextColor="#475569"
                value={newMediaUrl}
                onChangeText={setNewMediaUrl}
              />

              <TouchableOpacity
                onPress={handleGlobalCreatePost}
                disabled={publishing}
                className="bg-indigo-600 rounded-xl py-3 justify-center items-center mb-10"
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">Publish Post</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-400 mt-4">Loading CampusConnect...</Text>
      </View>
    );
  }

  return user ? <MainTabs /> : <LoginScreen />;
}

function AppRoot() {
  return (
    <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY || ""} options={{ host: "https://app.posthog.com" }}>
      <AuthProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}

export default Sentry.wrap(AppRoot);
