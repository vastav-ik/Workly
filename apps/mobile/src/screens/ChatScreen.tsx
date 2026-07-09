import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null };
}

interface Conversation {
  partner: { id: string; name: string; avatar: string | null; branch: string };
  lastMessage: { content: string; createdAt: string; fromMe: boolean };
}

export default function ChatScreen() {
  const { token, user } = useAuth();
  const { sendDM, onDM } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  // Search user state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_BASE}/chat/search-users?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  useEffect(() => {
    if (!onDM) return;
    const unsub = onDM((msg: any) => {
      if (activePartner && msg.from === activePartner.id) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), content: msg.content, senderId: msg.from, createdAt: msg.timestamp, sender: { id: msg.from, name: activePartner.name, avatar: null } }]);
      }
    });
    return unsub;
  }, [onDM, activePartner]);

  async function fetchConversations() {
    try {
      const res = await fetch(`${API_BASE}/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setConversations(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function openChat(partner: any) {
    setActivePartner(partner);
    try {
      const res = await fetch(`${API_BASE}/chat/messages/${partner.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMessages(await res.json());
    } catch { /* silent */ }
  }

  async function send() {
    if (!input.trim() || !activePartner) return;
    const content = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), content, senderId: user!.id, createdAt: new Date().toISOString(), sender: { id: user!.id, name: user!.name, avatar: null } }]);
    sendDM(activePartner.id, content);
    try {
      await fetch(`${API_BASE}/chat/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ receiverId: activePartner.id, content }) });
    } catch { /* silent */ }
  }

  if (activePartner) {
    return (
      <KeyboardAvoidingView className="flex-1 bg-neutral-900" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center px-4 pt-14 pb-3 border-b border-neutral-700 bg-neutral-900">
          <TouchableOpacity onPress={() => setActivePartner(null)} className="mr-3 min-h-[48px] justify-center">
            <Text className="text-brand-academic text-lg">← Back</Text>
          </TouchableOpacity>
          <View className="w-8 h-8 rounded-full bg-brand-academic items-center justify-center mr-2">
            <Text className="text-content-darkPrimary font-bold text-sm">{activePartner.name[0]}</Text>
          </View>
          <Text className="text-content-darkPrimary font-semibold text-lg">{activePartner.name}</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: "flex-end" }}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View className={`mb-2 max-w-[80%] ${isMe ? "self-end" : "self-start"}`}>
                <View className={`px-4 py-2 rounded-card ${isMe ? "bg-brand-academic rounded-br-sm" : "bg-neutral-800 rounded-bl-sm"}`}>
                  <Text className="text-content-darkPrimary">{item.content}</Text>
                </View>
              </View>
            );
          }}
        />

        <View className="flex-row items-center px-4 py-3 border-t border-neutral-700 bg-neutral-800">
          <TextInput
            className="flex-1 bg-neutral-900 text-content-darkPrimary px-4 py-2 rounded-full mr-2 min-h-[44px] border border-neutral-700"
            placeholder="Type a message..."
            placeholderTextColor="#aaaaaa"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
          />
          <TouchableOpacity onPress={send} className="bg-brand-academic w-11 h-11 rounded-full items-center justify-center">
            <Text className="text-content-darkPrimary text-lg">↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center">
        <ActivityIndicator size="large" color="#7289da" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-900">
      <View className="px-4 pt-14 pb-4 border-b border-neutral-700">
        <Text className="text-2xl font-bold text-content-darkPrimary tracking-tight mb-2">💬 Chats</Text>
        <TextInput
          className="bg-neutral-800 text-content-darkPrimary px-4 py-2 rounded-xl text-sm border border-neutral-700 min-h-[40px]"
          placeholder="🔍 Search users to chat..."
          placeholderTextColor="#7f8c8d"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {searchQuery.trim().length >= 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-b border-neutral-800 min-h-[64px]"
              onPress={() => {
                setSearchQuery("");
                openChat(item);
              }}
            >
              <View className="w-12 h-12 rounded-full bg-brand-academic items-center justify-center mr-3">
                <Text className="text-content-darkPrimary font-bold text-lg">{item.name[0]}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-content-darkPrimary font-semibold">{item.name}</Text>
                <Text className="text-content-darkSecondary text-xs mt-1">
                  {item.branch} {item.college ? `• ${item.college.name}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              {searchLoading ? (
                <ActivityIndicator size="small" color="#7289da" />
              ) : (
                <>
                  <Text className="text-2xl mb-2">🔍</Text>
                  <Text className="text-content-darkSecondary">No users found</Text>
                </>
              )}
            </View>
          }
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.partner.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-neutral-800 min-h-[64px]" onPress={() => openChat(item.partner)}>
              <View className="w-12 h-12 rounded-full bg-brand-academic items-center justify-center mr-3">
                <Text className="text-content-darkPrimary font-bold text-lg">{item.partner.name[0]}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-content-darkPrimary font-semibold">{item.partner.name}</Text>
                <Text className="text-content-darkSecondary text-sm" numberOfLines={1}>
                  {item.lastMessage.fromMe ? "You: " : ""}{item.lastMessage.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-content-darkSecondary">No conversations yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
