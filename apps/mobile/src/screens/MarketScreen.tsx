import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";

interface Document {
  id: string;
  title: string;
  description: string;
  subjectCode: string;
  semester: number;
  branch: string;
  upvotes: number;
  summary: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; college?: { name: string } };
}

export default function MarketScreen() {
  const { token } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { fetchDocs(); }, [filter]);

  async function fetchDocs() {
    try {
      const params = filter !== "all" ? `?branch=${filter}` : "";
      const res = await fetch(`${API_BASE}/market/documents${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch { /* silent */ }
  }

  async function upvote(id: string) {
    try {
      await fetch(`${API_BASE}/market/documents/${id}/upvote`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, upvotes: d.upvotes + 1 } : d));
    } catch { /* silent */ }
  }

  const onRefresh = async () => { setRefreshing(true); await fetchDocs(); setRefreshing(false); };

  const branches = ["all", "CSE", "ECE", "EEE", "ME", "CE"];

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4 border-b border-slate-800">
        <Text className="text-2xl font-bold text-white">📚 Notes Market</Text>
        <View className="flex-row mt-3 gap-2">
          {branches.map((b) => (
            <TouchableOpacity
              key={b}
              className={`px-3 py-1 rounded-full ${filter === b ? "bg-indigo-600" : "bg-slate-800"}`}
              onPress={() => setFilter(b)}
            >
              <Text className={`text-sm ${filter === b ? "text-white" : "text-slate-400"}`}>
                {b === "all" ? "All" : b}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={docs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
        renderItem={({ item }) => (
          <View className="bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-800">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-white font-semibold text-base">{item.title}</Text>
                <Text className="text-slate-400 text-xs mt-1">
                  {item.subjectCode} • Sem {item.semester} • {item.branch}
                </Text>
              </View>
              <TouchableOpacity className="bg-emerald-900/50 px-3 py-1 rounded-full flex-row items-center" onPress={() => upvote(item.id)}>
                <Text className="text-emerald-400 mr-1">▲</Text>
                <Text className="text-emerald-400 font-bold">{item.upvotes}</Text>
              </TouchableOpacity>
            </View>

            {item.description && (
              <Text className="text-slate-300 text-sm mb-2">{item.description}</Text>
            )}

            {item.summary && (
              <View className="bg-indigo-950/50 rounded-xl p-3 mt-2 border border-indigo-900/50">
                <Text className="text-indigo-300 text-xs font-bold mb-1">🤖 AI Summary</Text>
                <Text className="text-slate-300 text-sm leading-5">{item.summary}</Text>
              </View>
            )}

            <View className="flex-row items-center mt-3 pt-2 border-t border-slate-800">
              <Text className="text-slate-500 text-xs">
                by {item.user.name} {item.user.college ? `• ${item.user.college.name}` : ""}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">📄</Text>
            <Text className="text-slate-400">No documents found</Text>
          </View>
        }
      />
    </View>
  );
}
