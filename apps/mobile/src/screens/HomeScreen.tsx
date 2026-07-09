import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";
import FeedCard from "../components/FeedCard";
import AdBanner from "../components/AdBanner";

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
  const [ads, setAds] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "campus">("global");

  // AI Helper state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState("");

  // Create Post Modal State
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const params = tab === "campus" && user ? `?collegeId=${(user as any).collegeId || ""}` : "";
      // Pass JWT authorization header to enable backend demographic ad targeting
      const res = await fetch(`${API_BASE}/feed${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setAds(data.ads || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tab, user, token]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await fetch(`${API_BASE}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: aiQuestion }),
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

  const handleCreatePost = async () => {
    if (!newContent.trim()) {
      Alert.alert("Error", "Post content cannot be empty.");
      return;
    }
    setPublishing(true);

    try {
      const tagsArray = newTags
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean);

      const mediaUrlsArray = newMediaUrl.trim() ? [newMediaUrl.trim()] : [];

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
        const newPost = await res.json();
        setPosts((prev) => [newPost, ...prev]);
        setCreatePostVisible(false);
        setNewContent("");
        setNewTags("");
        setNewMediaUrl("");
        Alert.alert("Success", "Post created successfully!");
      } else {
        const errData = await res.json();
        Alert.alert("Content Blocked", errData.error || "Failed to publish post.");
      }
    } catch {
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      setPublishing(false);
    }
  };

  // Dynamically inject dynamic demographic ad banners every 4 posts
  const getFeedItems = () => {
    const items: any[] = [];
    posts.forEach((post, index) => {
      items.push({ type: "post", id: post.id, data: post });
      if ((index + 1) % 4 === 0 && ads.length > 0) {
        const adIndex = Math.floor((index + 1) / 4 - 1) % ads.length;
        items.push({
          type: "ad",
          id: `ad-${index}-${ads[adIndex].id}`,
          data: ads[adIndex],
        });
      }
    });
    return items;
  };

  const renderFeedItem = ({ item }: { item: any }) => {
    if (item.type === "ad") {
      return <AdBanner ad={item.data} />;
    }
    return (
      <FeedCard
        item={item.data}
        onPostDeleted={(postId) => {
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        }}
      />
    );
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Screen Header */}
      <View className="px-4 pt-14 pb-4 bg-slate-950 border-b border-slate-800">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-bold text-white tracking-tight">🎓 CampusConnect</Text>
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center border border-indigo-500/20"
            onPress={() => setCreatePostVisible(true)}
          >
            <Text className="text-white text-2xl font-bold">+</Text>
          </TouchableOpacity>
        </View>

        {/* Global vs Campus Feed Toggle */}
        <View className="flex-row bg-slate-900 rounded-xl p-1 border border-slate-800">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg min-h-[40px] justify-center ${
              tab === "global" ? "bg-indigo-600" : ""
            }`}
            onPress={() => setTab("global")}
          >
            <Text
              className={`text-center font-semibold ${
                tab === "global" ? "text-white" : "text-slate-400"
              }`}
            >
              🌍 Global Feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg min-h-[40px] justify-center ${
              tab === "campus" ? "bg-indigo-600" : ""
            }`}
            onPress={() => setTab("campus")}
          >
            <Text
              className={`text-center font-semibold ${
                tab === "campus" ? "text-white" : "text-slate-400"
              }`}
            >
              🏫 Campus Feed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main feed list */}
      {loading ? (
        <View className="flex-1 items-center justify-center bg-slate-950">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={getFeedItems()}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListHeaderComponent={
            <View className="bg-slate-900 mx-4 mt-2 mb-3 rounded-card p-4 border border-slate-800">
              <Text className="text-white font-bold text-base mb-2">🤖 AI Academic Helper</Text>
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  className="flex-1 bg-slate-950 text-white rounded-xl px-3 py-2 text-sm border border-slate-800"
                  placeholder="Ask anything about your syllabus..."
                  placeholderTextColor="#7f8c8d"
                  value={aiQuestion}
                  onChangeText={setAiQuestion}
                />
                <TouchableOpacity
                  className="bg-indigo-600 rounded-lg px-4 py-2 justify-center min-h-[40px]"
                  onPress={askAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-bold">Ask</Text>
                  )}
                </TouchableOpacity>
              </View>
              {aiAnswer ? (
                <View className="bg-slate-950 rounded-lg p-3 mt-1 border border-slate-800">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-indigo-400 text-xs font-bold">Answer</Text>
                    <Text className="text-slate-500 text-[10px] uppercase">
                      {aiSource === "cache" ? "⚡ Cached" : "✨ Gemini"}
                    </Text>
                  </View>
                  <Text className="text-slate-300 text-sm leading-5">{aiAnswer}</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-20 bg-slate-950">
              <Text className="text-4xl mb-3">📝</Text>
              <Text className="text-slate-400 text-base">No posts yet. Be the first!</Text>
            </View>
          }
        />
      )}

      {/* Create Post Slide-Up Modal */}
      <Modal
        visible={createPostVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreatePostVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
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

            {/* Form */}
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Content Input */}
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Content</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-3 min-h-[120px] text-sm border border-slate-800 mb-4"
                placeholder="What's happening on campus? Type #placements or #internships to auto-tag!"
                placeholderTextColor="#64748b"
                multiline
                textAlignVertical="top"
                value={newContent}
                onChangeText={setNewContent}
              />

              {/* Tags Input */}
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Hashtags (Comma separated)</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-800 mb-4"
                placeholder="fests, exams, tech"
                placeholderTextColor="#64748b"
                value={newTags}
                onChangeText={setNewTags}
              />

              {/* Media URL Input (for mock gallery testing) */}
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Attach Mock Image URL</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-800 mb-6"
                placeholder="https://picsum.photos/600/400"
                placeholderTextColor="#64748b"
                value={newMediaUrl}
                onChangeText={setNewMediaUrl}
              />

              {/* Submit CTA */}
              <TouchableOpacity
                onPress={handleCreatePost}
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
        </View>
      </Modal>
    </View>
  );
}
