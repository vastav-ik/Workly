import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Animated } from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";

interface Ticket {
  id: string;
  projectTitle: string;
  description: string;
  requiredSkills: string[];
  lookingFor: string;
  matchScore?: number;
  user: { id: string; name: string; skills: string[]; branch: string; avatar: string | null; college?: { name: string } };
}

export default function MatchmakerScreen() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mode, setMode] = useState<"browse" | "match">("match");

  useEffect(() => { fetchTickets(); }, [mode]);

  async function fetchTickets() {
    try {
      const endpoint = mode === "match" ? "/ai/matchmaking/match" : "/ai/matchmaking/tickets";
      const res = await fetch(`${API_BASE}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTickets(await res.json());
    } catch { /* silent */ }
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4 border-b border-slate-800">
        <Text className="text-2xl font-bold text-white">🤝 Matchmaker</Text>
        <Text className="text-slate-400 text-sm mt-1">Find your hackathon dream team</Text>
        <View className="flex-row mt-3 bg-slate-900 rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg ${mode === "match" ? "bg-indigo-600" : ""}`}
            onPress={() => setMode("match")}
          >
            <Text className={`text-center font-medium ${mode === "match" ? "text-white" : "text-slate-400"}`}>
              🎯 For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg ${mode === "browse" ? "bg-indigo-600" : ""}`}
            onPress={() => setMode("browse")}
          >
            <Text className={`text-center font-medium ${mode === "browse" ? "text-white" : "text-slate-400"}`}>
              🔍 Browse All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="bg-slate-900 rounded-2xl p-5 mb-4 border border-slate-800">
            {/* Match Score Badge */}
            {item.matchScore !== undefined && (
              <View className={`self-start px-3 py-1 rounded-full mb-3 ${item.matchScore >= 70 ? "bg-emerald-900/50" : item.matchScore >= 40 ? "bg-amber-900/50" : "bg-slate-800"}`}>
                <Text className={`text-xs font-bold ${item.matchScore >= 70 ? "text-emerald-400" : item.matchScore >= 40 ? "text-amber-400" : "text-slate-400"}`}>
                  {item.matchScore}% Match
                </Text>
              </View>
            )}

            <Text className="text-white font-bold text-lg mb-1">{item.projectTitle}</Text>
            <Text className="text-slate-300 text-sm mb-3">{item.description}</Text>

            <Text className="text-slate-500 text-xs font-bold uppercase mb-1">Looking for</Text>
            <Text className="text-indigo-300 mb-3">{item.lookingFor}</Text>

            <Text className="text-slate-500 text-xs font-bold uppercase mb-1">Required Skills</Text>
            <View className="flex-row flex-wrap gap-1 mb-3">
              {item.requiredSkills.map((skill, i) => (
                <View key={i} className="bg-indigo-900/40 px-2 py-1 rounded-lg">
                  <Text className="text-indigo-300 text-xs">{skill}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row items-center pt-3 border-t border-slate-800">
              <View className="w-8 h-8 rounded-full bg-purple-600 items-center justify-center mr-2">
                <Text className="text-white font-bold text-sm">{item.user.name[0]}</Text>
              </View>
              <View>
                <Text className="text-white text-sm font-medium">{item.user.name}</Text>
                <Text className="text-slate-500 text-xs">{item.user.branch} {item.user.college ? `• ${item.user.college.name}` : ""}</Text>
              </View>
              <TouchableOpacity className="ml-auto bg-indigo-600 px-4 py-2 rounded-xl">
                <Text className="text-white font-medium text-sm">Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">🤝</Text>
            <Text className="text-slate-400">No matching tickets found</Text>
          </View>
        }
      />
    </View>
  );
}
