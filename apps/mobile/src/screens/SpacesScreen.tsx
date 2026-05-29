import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";

interface Space { id: string; name: string; category: string; }

export default function SpacesScreen() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSpaces(); }, []);

  async function fetchSpaces() {
    try {
      const res = await fetch(`${API_BASE}/feed/spaces/${(user as any)?.collegeId || ""}`);
      if (res.ok) setSpaces(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const grouped = spaces.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, Space[]>);

  const categoryIcons: Record<string, string> = {
    Social: "🎉", Academic: "📚", Career: "💼", Announcements: "📢", Sports: "⚽",
  };

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
        <Text className="text-2xl font-bold text-content-darkPrimary tracking-tight">🏠 Spaces</Text>
        <Text className="text-content-darkSecondary text-sm mt-1">Your college channels</Text>
      </View>

      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item: [category, categorySpaces] }) => (
          <View className="mb-6">
            <Text className="text-content-darkSecondary text-xs font-bold uppercase tracking-wider mb-2">
              {categoryIcons[category] || "📌"} {category}
            </Text>
            {categorySpaces.map((space) => (
              <TouchableOpacity
                key={space.id}
                className={`px-4 py-3 rounded-input mb-1 min-h-[48px] justify-center ${selected === space.id ? "bg-brand-academic/20 border border-brand-academic" : "bg-neutral-800"}`}
                onPress={() => setSelected(space.id)}
              >
                <Text className={`font-medium ${selected === space.id ? "text-brand-academic" : "text-content-darkPrimary"}`}>
                  {space.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">🏗️</Text>
            <Text className="text-content-darkSecondary">No spaces found for your college</Text>
          </View>
        }
      />
    </View>
  );
}
