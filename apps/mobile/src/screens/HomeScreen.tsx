import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useSWRInfinite from "swr/infinite";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  withSpring,
} from "react-native-reanimated";
import { useAuth, API_BASE } from "../context/AuthContext";
import FeedCard from "../components/FeedCard";
import AdBanner from "../components/AdBanner";
import FeedSkeleton from "../components/FeedSkeleton";
import OfflineBanner from "../components/OfflineBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FlashListCast = FlashList as any;

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; branch: string; college?: { name: string }; verified?: boolean };
  comments?: any[];
  _count?: { comments: number };
  isGhost?: boolean;
}

export default function HomeScreen() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"global" | "campus">("global");

  // State for offline caching fallback
  const [cachedPosts, setCachedPosts] = useState<Post[]>([]);

  // Header Search Input State
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Scroll Shared Value for Collapsible Header
  const scrollY = useSharedValue(0);

  // Tab Index for sticky animated underline indicator
  const tabIndex = useSharedValue(0);

  // Load cached posts from AsyncStorage on mount/tab change
  useEffect(() => {
    const loadCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(`@feed_cache_${tab}`);
        if (raw) {
          setCachedPosts(JSON.parse(raw));
        } else {
          setCachedPosts([]);
        }
      } catch { /* ignore */ }
    };
    loadCache();
  }, [tab]);

  // Tab switch spring animator
  useEffect(() => {
    tabIndex.value = withSpring(tab === "global" ? 0 : 1, { damping: 15 });
  }, [tab]);

  // SWR Keys generator for infinite scroll with cursor-based pagination
  const getKey = (pageIndex: number, previousPageData: any) => {
    const params = tab === "campus" && user ? `&collegeId=${(user as any).collegeId || ""}` : "";
    if (previousPageData && !previousPageData.pagination?.nextCursor) return null;
    
    // First page
    if (pageIndex === 0) return `${API_BASE}/feed?limit=10${params}`;
    
    // Cursor page
    return `${API_BASE}/feed?limit=10&cursor=${previousPageData.pagination.nextCursor}${params}`;
  };

  // Custom SWR fetcher passing Authorization headers
  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load feed");
    return res.json();
  };

  const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: false,
    persistSize: true,
  });

  // Save successful SWR pages back to AsyncStorage
  useEffect(() => {
    if (data && data[0]?.posts) {
      const allPosts = data.flatMap((page) => page.posts || []);
      AsyncStorage.setItem(`@feed_cache_${tab}`, JSON.stringify(allPosts.slice(0, 25)));
    }
  }, [data, tab]);

  // Reconcile displayed feed data
  const posts = data ? data.flatMap((page) => page.posts || []) : [];
  const ads = data && data[0]?.ads ? data[0].ads : [];
  const displayPosts = posts.length > 0 ? posts : cachedPosts;

  const isInitialLoading = !data && !error;
  const isRefreshing = isValidating && posts.length > 0;

  const handleRefresh = () => {
    mutate();
  };

  const handleLoadMore = () => {
    // If we're already loading or reached the end
    const lastPage = data ? data[data.length - 1] : null;
    if (isInitialLoading || isValidating || !lastPage?.pagination?.nextCursor) return;
    setSize(size + 1);
  };

  // Haptic FAB click trigger
  const handleOpenFAB = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* ignore */ }
    setCreatePostVisible(true);
  };

  // Submit post with optimistic ghost insertion
  const handleCreatePost = async () => {
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

    // Create optimistic post item
    const ghostPost: Post = {
      id: `ghost-${Date.now()}`,
      content: newContent,
      mediaUrls: mediaUrlsArray,
      tags: tagsArray,
      likesCount: 0,
      createdAt: new Date().toISOString(),
      user: {
        id: user?.id || "temp-id",
        name: user?.name || "Me",
        avatar: (user as any)?.avatar || null,
        branch: (user as any)?.branch || "CSE",
        verified: (user as any)?.verified || false,
      },
      isGhost: true,
    };

    // Optimistically insert post
    mutate(
      (currentData) => {
        if (!currentData) return currentData;
        const updatedFirstPage = {
          ...currentData[0],
          posts: [ghostPost, ...(currentData[0].posts || [])],
        };
        return [updatedFirstPage, ...currentData.slice(1)];
      },
      false // do not revalidate yet
    );

    setCreatePostVisible(false);

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
        const newPost = await res.json();
        // Replace ghost post with actual database response post
        mutate((currentData) => {
          if (!currentData) return currentData;
          const updatedFirstPage = {
            ...currentData[0],
            posts: (currentData[0].posts || []).map((p: any) => (p.id === ghostPost.id ? newPost : p)),
          };
          return [updatedFirstPage, ...currentData.slice(1)];
        }, false);
        setNewContent("");
        setNewTags("");
        setNewMediaUrl("");
      } else {
        // Remove ghost post and alert on failure (e.g. text moderation blocked)
        mutate();
        const err = await res.json();
        Alert.alert("Blocked by Safety Filter", err.error || "Failed to post.");
      }
    } catch {
      mutate();
      Alert.alert("Network Error", "Unable to post content.");
    } finally {
      setPublishing(false);
    }
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

  // Reanimated Scroll Handler
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Reanimated Header Collapse transition styles
  const animatedHeaderStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 60], [0, -56], "clamp");
    const opacity = interpolate(scrollY.value, [0, 40], [1, 0], "clamp");
    return {
      transform: [{ translateY }],
      opacity,
      height: interpolate(scrollY.value, [0, 60], [60, 0], "clamp"),
    };
  });

  // Reanimated Sticky Tab Indicator line translate style
  const animatedUnderlineStyle = useAnimatedStyle(() => {
    const tabWidth = (SCREEN_WIDTH - 32) / 2;
    return {
      transform: [{ translateX: tabIndex.value * tabWidth }],
    };
  });

  // Inject dynamic demographic sponsor banners every 4 posts
  const getFeedItems = () => {
    const items: any[] = [];
    displayPosts.forEach((post, index) => {
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
          mutate((currentData) => {
            if (!currentData) return currentData;
            return currentData.map((page: any) => ({
              ...page,
              posts: (page.posts || []).filter((p: any) => p.id !== postId),
            }));
          }, false);
        }}
      />
    );
  };

  return (
    <View className="flex-1 bg-slate-950">
      <OfflineBanner />

      {/* Collapsible Header app bar */}
      <Animated.View style={animatedHeaderStyle} className="bg-slate-950 border-b border-slate-900/50 justify-center">
        <View className="flex-row justify-between items-center px-4">
          <Text className="text-2xl font-black text-white tracking-tight">🎓 CampusConnect</Text>
          
          {/* Header Action Utilities */}
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={() => setSearchExpanded(!searchExpanded)} className="p-1">
              <Text className="text-lg">🔍</Text>
            </TouchableOpacity>
            
            {/* Notification Bell with red badge */}
            <View className="relative">
              <Text className="text-lg">🔔</Text>
              <View className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-slate-950 animate-pulse" />
            </View>
            
            <TouchableOpacity className="p-1">
              <Text className="text-lg">✉️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Expanded Search bar utility */}
      {searchExpanded && (
        <View className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex-row items-center gap-2">
          <TextInput
            className="flex-1 bg-slate-950 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-800"
            placeholder="Search posts, tags, or keywords..."
            placeholderTextColor="#475569"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => { setSearchExpanded(false); setSearchQuery(""); }} className="px-2">
            <Text className="text-slate-400 font-semibold text-xs">Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sticky Tab Navigation Bar */}
      <View className="px-4 py-2 bg-slate-950 border-b border-slate-900">
        <View className="flex-row bg-slate-900 rounded-xl p-1 relative border border-slate-800">
          
          {/* Spring-based Animated Sliding Indicator Background Tab */}
          <Animated.View
            style={[animatedUnderlineStyle, { width: (SCREEN_WIDTH - 32) / 2 }]}
            className="absolute top-1 bottom-1 left-1 bg-indigo-600 rounded-lg"
          />

          <TouchableOpacity
            className="flex-1 py-2 min-h-[40px] justify-center items-center z-10"
            onPress={() => setTab("global")}
          >
            <Text className={`font-bold text-sm ${tab === "global" ? "text-white" : "text-slate-400"}`}>
              🌍 Global Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-2 min-h-[40px] justify-center items-center z-10"
            onPress={() => setTab("campus")}
          >
            <Text className={`font-bold text-sm ${tab === "campus" ? "text-white" : "text-slate-400"}`}>
              🏫 Campus Feed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* High-Performance 60FPS FlashList rendering */}
      {isInitialLoading && displayPosts.length === 0 ? (
        <FeedSkeleton />
      ) : (
        <FlashListCast
          data={getFeedItems()}
          renderItem={renderFeedItem}
          keyExtractor={(item: any) => item.id}
          estimatedItemSize={380}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2} // Fetch next page when 80% scroll depth is reached
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
          ListHeaderComponent={
            <View className="bg-slate-900 mx-4 mt-3 mb-3 rounded-card p-4 border border-slate-800">
              <Text className="text-white font-bold text-base mb-2">🤖 AI Academic Helper</Text>
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  className="flex-1 bg-slate-950 text-white rounded-xl px-3 py-2 text-sm border border-slate-800"
                  placeholder="Ask anything about your syllabus..."
                  placeholderTextColor="#64748b"
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
            // Quiet Campus Empty State
            <View className="items-center py-20 px-6 bg-slate-950 text-center">
              <Text className="text-6xl mb-4">🏫</Text>
              <Text className="text-white font-bold text-lg text-center mb-2">Quiet Campus</Text>
              <Text className="text-slate-400 text-sm text-center mb-6 max-w-xs">
                Be the first to start the conversation at {user?.college ? (typeof user.college === "string" ? user.college : (user.college as any).name) : "your campus"}! Share notes, PYQs, or ask questions.
              </Text>
              <TouchableOpacity
                onPress={handleOpenFAB}
                className="bg-indigo-600 px-6 py-3 rounded-xl border border-indigo-500/20"
              >
                <Text className="text-white font-bold">Start Conversation</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Centered Creative Content Creation FAB overlay */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpenFAB}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/50 border border-indigo-500/30"
      >
        <Text className="text-white text-3xl font-bold">+</Text>
      </TouchableOpacity>

      {/* Create Post Composition Bottom Sheet Modal */}
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
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-slate-800">
              <Text className="text-white font-bold text-lg">Create Post</Text>
              <TouchableOpacity
                onPress={() => setCreatePostVisible(false)}
                className="p-1 min-h-[40px] justify-center"
              >
                <Text className="text-slate-400 font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Scroll Content */}
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Content text */}
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

              {/* Tags commas list */}
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Hashtags (Comma separated)</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-800 mb-4"
                placeholder="fests, coding, notes"
                placeholderTextColor="#475569"
                value={newTags}
                onChangeText={setNewTags}
              />

              {/* Mock media url for gallery test */}
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Attach Mock Image URL</Text>
              <TextInput
                className="bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-800 mb-6"
                placeholder="https://picsum.photos/600/400"
                placeholderTextColor="#475569"
                value={newMediaUrl}
                onChangeText={setNewMediaUrl}
              />

              {/* Submit trigger */}
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
