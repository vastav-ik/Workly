import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Clipboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAuth, API_BASE } from "../context/AuthContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; branch: string; college?: { name: string }; verified?: boolean };
  comments?: Comment[];
  _count?: { comments: number };
  isGhost?: boolean;
}

interface FeedCardProps {
  item: Post;
  onPostDeleted?: (postId: string) => void;
}

export default function FeedCard({ item, onPostDeleted }: FeedCardProps) {
  const { user, token } = useAuth();

  // Like State
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likesCount);

  // Comments Sheet State
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>(item.comments || []);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || item.comments?.length || 0);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Options Sheet State (Report/Mute/Delete)
  const [optionsVisible, setOptionsVisible] = useState(false);

  // Share Sheet State
  const [shareVisible, setShareVisible] = useState(false);

  // Carousel & Double-Tap Animation State
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const heartScale = useSharedValue(0);
  let lastTapTime = 0;

  // Read More state for text truncation
  const [expanded, setExpanded] = useState(false);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Handle Like
  const handleLike = async () => {
    // Trigger subtle physical vibration
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`${API_BASE}/feed/${item.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLikesCount(data.likesCount);
      } else {
        setLiked(wasLiked);
        setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    }
  };

  // Double Tap gesture detection
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapTime < DOUBLE_PRESS_DELAY) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch { /* ignore */ }

      // Trigger like if not already liked
      if (!liked) {
        handleLike();
      }
      // Reanimated spring pop animation
      heartScale.value = withSequence(
        withSpring(1.5, { damping: 4 }),
        withTiming(0, { duration: 300 })
      );
    }
    lastTapTime = now;
  };

  // Open comments
  const handleOpenComments = async () => {
    setCommentsVisible(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_BASE}/feed/${item.id}`);
      if (res.ok) {
        const postData = await res.json();
        setComments(postData.comments || []);
        setCommentsCount(postData.comments?.length || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Post new comment
  const handleSubmitComment = async () => {
    if (!commentInput.trim()) return;
    const content = commentInput.trim();
    setCommentInput("");

    try {
      const res = await fetch(`${API_BASE}/feed/${item.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentsCount((prev) => prev + 1);
      } else {
        Alert.alert("Error", "Failed to post comment. Check content moderation.");
      }
    } catch {
      Alert.alert("Error", "Network error posting comment.");
    }
  };

  // Delete Post
  const handleDeletePost = () => {
    setOptionsVisible(false);
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/feed/${item.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                if (onPostDeleted) onPostDeleted(item.id);
              } else {
                Alert.alert("Error", "Unauthorized or failed to delete post.");
              }
            } catch {
              Alert.alert("Error", "Failed to delete post.");
            }
          },
        },
      ]
    );
  };

  const handleShareWhatsApp = async () => {
    setShareVisible(false);
    const message = `Check out this post on Workly (CampusConnect): "${item.content.substring(0, 60)}..." Download Workly for study notes & campus updates!`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("WhatsApp Not Installed", "Unable to open WhatsApp on this device.");
      }
    } catch {
      Alert.alert("Error", "Failed to open WhatsApp.");
    }
  };

  const handleCopyLink = () => {
    setShareVisible(false);
    const postLink = `https://campusconnect.in/post/${item.id}`;
    if (Clipboard && typeof Clipboard.setString === "function") {
      Clipboard.setString(postLink);
    }
    Alert.alert("Copied!", "Link copied to clipboard.");
  };

  // Smart hashtag & mention text highlighting
  const renderSmartText = (text: string) => {
    if (!text) return null;
    const words = text.split(" ");
    return words.map((word, i) => {
      const isHashtag = word.startsWith("#");
      const isMention = word.startsWith("@");
      if (isHashtag || isMention) {
        return (
          <Text key={i} className="text-indigo-400 font-semibold">
            {word}{" "}
          </Text>
        );
      }
      return <Text key={i} className="text-content-darkPrimary">{word} </Text>;
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    // Format to short date if older than 7 days
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const isOwner = user?.id === item.user.id;

  return (
    <View
      style={{ opacity: item.isGhost ? 0.6 : 1 }}
      className="bg-slate-900 mx-4 mb-4 rounded-2xl border border-slate-800 overflow-hidden"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <View className="flex-row items-center flex-1">
          {/* Avatar with Online indicator */}
          <View className="relative mr-3">
            <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center border border-slate-700">
              <Text className="text-white font-bold text-base">
                {item.user.name?.[0] || "?"}
              </Text>
            </View>
            {/* Green Online Dot */}
            <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </View>
          
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-content-darkPrimary font-bold text-sm mr-1">{item.user.name}</Text>
              {item.user.verified && (
                <Text className="text-indigo-400 text-xs font-bold">✓</Text>
              )}
            </View>
            <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
              {item.user.branch} {item.user.college ? `• ${item.user.college.name}` : ""}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {item.isGhost ? (
            <Text className="text-indigo-400 font-bold text-xs uppercase tracking-wider">Posting...</Text>
          ) : (
            <>
              <Text className="text-slate-500 text-[11px]">{timeAgo(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => setOptionsVisible(true)} className="p-1 min-h-[36px] justify-center">
                <Text className="text-slate-400 font-bold text-lg">⋮</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Content Text with Truncation */}
      <View className="px-4 pt-3 pb-2">
        <View>
          <Text
            className="text-slate-200 text-sm leading-relaxed"
            numberOfLines={expanded ? undefined : 3}
          >
            {renderSmartText(item.content)}
          </Text>
          {item.content.length > 120 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} className="mt-1">
              <Text className="text-indigo-400 font-bold text-xs">
                {expanded ? "Show less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.tags && item.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-3">
            {item.tags.map((tag, i) => (
              <View key={i} className="bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-900/30">
                <Text className="text-indigo-400 text-[11px] font-medium">#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Double-Tap to Like Media Container */}
      {item.mediaUrls && item.mediaUrls.length > 0 && (
        <View className="my-2 bg-slate-950 border-y border-slate-800 relative">
          <TouchableOpacity activeOpacity={0.9} onPress={handleDoubleTap}>
            <FlatList
              data={item.mediaUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const slideWidth = e.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH;
                const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                setActiveMediaIndex(index);
              }}
              keyExtractor={(url, index) => `${url}-${index}`}
              renderItem={({ item: url }) => {
                const isLocalPath = url.startsWith("/uploads");
                const fullUrl = isLocalPath ? `${API_BASE.replace("/api", "")}${url}` : url;
                return (
                  <View style={{ width: SCREEN_WIDTH - 32 }} className="aspect-square items-center justify-center overflow-hidden">
                    <Image
                      source={{ uri: fullUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                );
              }}
            />
          </TouchableOpacity>

          {/* Animated Heart Overlay */}
          <View className="absolute top-0 bottom-0 left-0 right-0 items-center justify-center pointer-events-none">
            <Animated.Text style={[{ fontSize: 72 }, heartStyle]}>❤️</Animated.Text>
          </View>

          {/* Dots Indicator */}
          {item.mediaUrls.length > 1 && (
            <View className="flex-row justify-center gap-1.5 py-2 absolute bottom-3 left-0 right-0">
              {item.mediaUrls.map((_, i) => (
                <View
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeMediaIndex === i ? "bg-indigo-500" : "bg-neutral-500/80"
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row items-center px-4 py-2 border-t border-slate-800 bg-slate-900/30">
        <TouchableOpacity
          className="flex-row items-center mr-6 min-h-[44px] justify-center"
          onPress={handleLike}
        >
          <Text className="text-lg mr-1.5">{liked ? "❤️" : "🤍"}</Text>
          <Text className="text-slate-400 font-medium text-xs">{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center mr-6 min-h-[44px] justify-center"
          onPress={handleOpenComments}
        >
          <Text className="text-lg mr-1.5">💬</Text>
          <Text className="text-slate-400 font-medium text-xs">{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center min-h-[44px] justify-center"
          onPress={() => setShareVisible(true)}
        >
          <Text className="text-lg">📤</Text>
        </TouchableOpacity>
      </View>

      {/* Options Menu Bottom Sheet Modal */}
      <Modal
        visible={optionsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOptionsVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 p-4 pb-8">
            <Text className="text-slate-400 text-center font-bold text-xs uppercase tracking-widest mb-4">
              Post Options
            </Text>
            
            <TouchableOpacity
              onPress={() => {
                setOptionsVisible(false);
                Alert.alert("Reported", "Thank you. This post has been reported to the moderators.");
              }}
              className="py-3.5 border-b border-slate-850"
            >
              <Text className="text-amber-500 font-bold text-center text-base">⚠️ Report Post</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOptionsVisible(false);
                Alert.alert("Muted", "You will no longer see posts from this student.");
              }}
              className="py-3.5 border-b border-slate-850"
            >
              <Text className="text-white font-semibold text-center text-base">🔇 Mute Student</Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity onPress={handleDeletePost} className="py-3.5 border-b border-slate-850">
                <Text className="text-red-500 font-bold text-center text-base">🗑️ Delete Post</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setOptionsVisible(false)}
              className="py-3.5 bg-slate-800 rounded-xl mt-4"
            >
              <Text className="text-white text-center font-bold text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Bottom Sheet Modal */}
      <Modal
        visible={shareVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShareVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 p-4 pb-8">
            <Text className="text-slate-400 text-center font-bold text-xs uppercase tracking-widest mb-4">
              Share Content
            </Text>

            <TouchableOpacity onPress={handleShareWhatsApp} className="py-3.5 border-b border-slate-850 flex-row justify-center items-center gap-2">
              <Text className="text-lg">💬</Text>
              <Text className="text-emerald-400 font-bold text-base">Share to WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopyLink} className="py-3.5 border-b border-slate-850 flex-row justify-center items-center gap-2">
              <Text className="text-lg">🔗</Text>
              <Text className="text-white font-semibold text-base">Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShareVisible(false)}
              className="py-3.5 bg-slate-800 rounded-xl mt-4"
            >
              <Text className="text-white text-center font-bold text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Slide-Up Comments Modal */}
      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 h-[70%] overflow-hidden">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-slate-800">
              <Text className="text-white font-bold text-lg">Comments ({commentsCount})</Text>
              <TouchableOpacity
                onPress={() => setCommentsVisible(false)}
                className="p-1 min-h-[40px] justify-center"
              >
                <Text className="text-slate-400 font-bold text-base">Close</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loadingComments ? (
              <View className="flex-1 items-center justify-center bg-slate-900">
                <ActivityIndicator size="large" color="#6366f1" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(comment) => comment.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item: comment }) => (
                  <View className="flex-row items-start mb-4">
                    <View className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center mr-3 border border-slate-650">
                      <Text className="text-white font-bold text-xs">
                        {comment.user.name?.[0] || "?"}
                      </Text>
                    </View>
                    <View className="flex-1 bg-slate-805 rounded-2xl p-3 border border-slate-800">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-200 font-semibold text-xs">
                          {comment.user.name}
                        </Text>
                        <Text className="text-slate-500 text-[10px]">
                          {timeAgo(comment.createdAt)}
                        </Text>
                      </View>
                      <Text className="text-slate-300 text-sm leading-relaxed">
                        {comment.content}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View className="items-center py-20">
                    <Text className="text-4xl mb-3">💬</Text>
                    <Text className="text-slate-500">No comments yet. Write the first!</Text>
                  </View>
                }
              />
            )}

            {/* Comment Input Footer */}
            <View className="flex-row items-center px-4 py-3 border-t border-slate-800 bg-slate-850">
              <TextInput
                className="flex-1 bg-slate-950 text-white px-4 py-2 rounded-xl mr-2 min-h-[44px] border border-slate-800"
                placeholder="Write a comment..."
                placeholderTextColor="#7f8c8d"
                value={commentInput}
                onChangeText={setCommentInput}
                onSubmitEditing={handleSubmitComment}
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                className="bg-indigo-600 rounded-lg px-4 py-2 justify-center min-h-[44px]"
              >
                <Text className="text-white font-bold">Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
