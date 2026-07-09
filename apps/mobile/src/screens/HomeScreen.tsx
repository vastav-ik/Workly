import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; branch: string; college?: { name: string } };
  _count?: { comments: number };
}

export default function HomeScreen() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "campus">("global");

  // AI Helper state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState("");

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await fetch(`${API_BASE}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: aiQuestion })
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data.answer);
        setAiSource(data.source);
      } else {
        setAiAnswer("Failed to get response from AI assistant.");
      }
    } catch {
      setAiAnswer("Network error trying to contact AI assistant.");
    } finally {
      setAiLoading(false);
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      const params = tab === "campus" && user ? `?collegeId=${(user as any).collegeId || ""}` : "";
      const res = await fetch(`${API_BASE}/feed${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tab, user]);

  useEffect(() => { setLoading(true); fetchPosts(); }, [fetchPosts]);

  const onRefresh = async () => { setRefreshing(true); await fetchPosts(); setRefreshing(false); };

  const likePost = async (postId: string) => {
    try {
      await fetch(`${API_BASE}/feed/${postId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p));
    } catch { /* silent */ }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View className="bg-neutral-800 mx-4 mb-3 rounded-card p-4 border border-neutral-700">
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-brand-social items-center justify-center mr-3">
          <Text className="text-content-darkPrimary font-bold">{item.user.name[0]}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-content-darkPrimary font-semibold">{item.user.name}</Text>
          <Text className="text-content-darkSecondary text-xs">
            {item.user.branch} {item.user.college ? `• ${item.user.college.name}` : ""} • {timeAgo(item.createdAt)}
          </Text>
        </View>
      </View>

      <Text className="text-content-darkPrimary mb-3 leading-relaxed">{item.content}</Text>

      {item.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mb-3">
          {item.tags.map((tag, i) => (
            <View key={i} className="bg-brand-social/10 px-2 py-1 rounded-lg">
              <Text className="text-brand-social text-xs">#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-center pt-2 border-t border-neutral-700">
        <TouchableOpacity className="flex-row items-center mr-6 min-h-[48px] justify-center" onPress={() => likePost(item.id)}>
          <Text className="text-content-darkSecondary mr-1">❤️</Text>
          <Text className="text-content-darkSecondary">{item.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center min-h-[48px] justify-center">
          <Text className="text-content-darkSecondary mr-1">💬</Text>
          <Text className="text-content-darkSecondary">{item._count?.comments || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-neutral-900">
      <View className="px-4 pt-14 pb-4 bg-neutral-900 border-b border-neutral-700">
        <Text className="text-2xl font-bold text-content-darkPrimary mb-3 tracking-tight">🎓 CampusConnect</Text>
        <View className="flex-row bg-neutral-800 rounded-input p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg min-h-[40px] justify-center ${tab === "global" ? "bg-brand-social" : ""}`}
            onPress={() => setTab("global")}
          >
            <Text className={`text-center font-medium ${tab === "global" ? "text-content-darkPrimary" : "text-content-darkSecondary"}`}>
              🌍 Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg min-h-[40px] justify-center ${tab === "campus" ? "bg-brand-social" : ""}`}
            onPress={() => setTab("campus")}
          >
            <Text className={`text-center font-medium ${tab === "campus" ? "text-content-darkPrimary" : "text-content-darkSecondary"}`}>
              🏫 My Campus
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e1306c" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e1306c" />}
          ListHeaderComponent={
            <View className="bg-neutral-800 mx-4 mt-2 mb-3 rounded-card p-4 border border-neutral-700">
              <Text className="text-content-darkPrimary font-bold text-base mb-2">🤖 AI Academic Helper</Text>
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  className="flex-1 bg-neutral-900 text-content-darkPrimary rounded-input px-3 py-2 text-sm border border-neutral-700"
                  placeholder="Ask anything about your syllabus..."
                  placeholderTextColor="#7f8c8d"
                  value={aiQuestion}
                  onChangeText={setAiQuestion}
                />
                <TouchableOpacity
                  className="bg-brand-social rounded-lg px-4 py-2 justify-center min-h-[40px]"
                  onPress={askAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-content-darkPrimary font-bold">Ask</Text>
                  )}
                </TouchableOpacity>
              </View>
              {aiAnswer ? (
                <View className="bg-neutral-900 rounded-lg p-3 mt-1 border border-neutral-700">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-brand-social text-xs font-bold">Answer</Text>
                    <Text className="text-content-darkSecondary text-[10px] uppercase">
                      {aiSource === "cache" ? "⚡ Cached" : "✨ Gemini"}
                    </Text>
                  </View>
                  <Text className="text-content-darkPrimary text-sm leading-5">{aiAnswer}</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-4xl mb-3">📝</Text>
              <Text className="text-content-darkSecondary text-base">No posts yet. Be the first!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
