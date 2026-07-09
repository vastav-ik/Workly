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
} from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";

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
  user: { id: string; name: string; avatar: string | null; branch: string; college?: { name: string } };
  comments?: Comment[];
  _count?: { comments: number };
}

interface FeedCardProps {
  item: Post;
  onPostDeleted?: (postId: string) => void;
}

export default function FeedCard({ item, onPostDeleted }: FeedCardProps) {
  const { user, token } = useAuth();
  
  // Optimistic Like State
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likesCount);

  // Comments Bottom Sheet State
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>(item.comments || []);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || item.comments?.length || 0);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Carousel State
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Handle Like (Optimistic UI Update)
  const handleLike = async () => {
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
        // Sync with exact server count
        setLikesCount(data.likesCount);
      } else {
        // Revert on failure
        setLiked(wasLiked);
        setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      }
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    }
  };

  // Open comments and fetch all comments
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

  // Submit new comment
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

  // Delete Post (Owner only)
  const handleDeletePost = () => {
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

  // Parse time
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isOwner = user?.id === item.user.id;

  return (
    <View className="bg-neutral-800 mx-4 mb-4 rounded-card border border-neutral-700 overflow-hidden">
      {/* Card Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-neutral-700 bg-neutral-800/50">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-brand-social items-center justify-center mr-3 border border-neutral-600">
            <Text className="text-content-darkPrimary font-bold text-base">
              {item.user.name?.[0] || "?"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-content-darkPrimary font-semibold">{item.user.name}</Text>
            <Text className="text-content-darkSecondary text-xs mt-0.5" numberOfLines={1}>
              {item.user.branch} {item.user.college ? `• ${item.user.college.name}` : ""}
            </Text>
          </View>
        </View>
        
        <View className="flex-row items-center gap-2">
          <Text className="text-content-darkSecondary text-[11px]">{timeAgo(item.createdAt)}</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleDeletePost} className="p-1 min-h-[36px] justify-center">
              <Text className="text-red-400 font-bold text-sm">🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Card Content Text */}
      <View className="px-4 pt-3 pb-2">
        <Text className="text-content-darkPrimary text-sm leading-relaxed">{item.content}</Text>
        
        {/* Dynamic Tag/Hashtag chips */}
        {item.tags && item.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-3">
            {item.tags.map((tag, i) => (
              <View key={i} className="bg-brand-social/10 px-2 py-0.5 rounded-lg border border-brand-social/20">
                <Text className="text-brand-social text-[11px] font-medium">#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Swipeable Media Gallery Carousel */}
      {item.mediaUrls && item.mediaUrls.length > 0 && (
        <View className="my-2 bg-neutral-900 border-y border-neutral-700 relative">
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
              // Renders image carousel item
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

          {/* Dots Indicator */}
          {item.mediaUrls.length > 1 && (
            <View className="flex-row justify-center gap-1.5 py-2 absolute bottom-3 left-0 right-0">
              {item.mediaUrls.map((_, i) => (
                <View
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeMediaIndex === i ? "bg-brand-social" : "bg-neutral-500/80"
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Card Actions bar */}
      <View className="flex-row items-center px-4 py-2 border-t border-neutral-700 bg-neutral-800/30">
        {/* Like Button */}
        <TouchableOpacity
          className="flex-row items-center mr-6 min-h-[44px] justify-center"
          onPress={handleLike}
        >
          <Text className="text-lg mr-1.5">{liked ? "❤️" : "🤍"}</Text>
          <Text className="text-content-darkSecondary font-medium text-xs">{likesCount}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          className="flex-row items-center min-h-[44px] justify-center"
          onPress={handleOpenComments}
        >
          <Text className="text-lg mr-1.5">💬</Text>
          <Text className="text-content-darkSecondary font-medium text-xs">{commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Slide-Up Comments Bottom Sheet Modal */}
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
          <View className="bg-neutral-900 rounded-t-3xl border-t border-neutral-800 h-[70%] overflow-hidden">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-neutral-800">
              <Text className="text-content-darkPrimary font-bold text-lg">Comments ({commentsCount})</Text>
              <TouchableOpacity
                onPress={() => setCommentsVisible(false)}
                className="p-1 min-h-[40px] justify-center"
              >
                <Text className="text-slate-400 font-bold text-base">Close</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loadingComments ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#e1306c" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(comment) => comment.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item: comment }) => (
                  <View className="flex-row items-start mb-4">
                    <View className="w-8 h-8 rounded-full bg-neutral-700 items-center justify-center mr-3 border border-neutral-600">
                      <Text className="text-content-darkPrimary font-bold text-xs">
                        {comment.user.name?.[0] || "?"}
                      </Text>
                    </View>
                    <View className="flex-1 bg-neutral-800 rounded-2xl p-3 border border-neutral-750">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-content-darkPrimary font-semibold text-xs">
                          {comment.user.name}
                        </Text>
                        <Text className="text-content-darkSecondary text-[10px]">
                          {timeAgo(comment.createdAt)}
                        </Text>
                      </View>
                      <Text className="text-content-darkPrimary text-sm leading-relaxed">
                        {comment.content}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View className="items-center py-20">
                    <Text className="text-4xl mb-3">💬</Text>
                    <Text className="text-content-darkSecondary">No comments yet. Write the first!</Text>
                  </View>
                }
              />
            )}

            {/* Comment Input Footer */}
            <View className="flex-row items-center px-4 py-3 border-t border-neutral-800 bg-neutral-800">
              <TextInput
                className="flex-1 bg-neutral-900 text-content-darkPrimary px-4 py-2 rounded-xl mr-2 min-h-[44px] border border-neutral-750"
                placeholder="Write a comment..."
                placeholderTextColor="#7f8c8d"
                value={commentInput}
                onChangeText={setCommentInput}
                onSubmitEditing={handleSubmitComment}
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                className="bg-brand-social rounded-lg px-4 py-2 justify-center min-h-[44px]"
              >
                <Text className="text-content-darkPrimary font-bold">Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
