import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { API_BASE } from "../context/AuthContext";

interface College {
  id: string;
  name: string;
  location: string;
  state?: string;
  district?: string;
  managementType?: string;
  aisheCode?: string;
  rank?: number;
}

interface CollegeSearchInputProps {
  onSelect: (college: College) => void;
  selectedCollege: College | null;
  placeholder?: string;
}

const DEBOUNCE_MS = 300;

export default function CollegeSearchInput({ onSelect, selectedCollege, placeholder = "Search your college..." }: CollegeSearchInputProps) {
  const [query, setQuery] = useState(selectedCollege?.name || "");
  const [results, setResults] = useState<College[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/colleges/search?q=${encodeURIComponent(q)}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      }
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedCollege && query === selectedCollege.name) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search, selectedCollege]);

  function handleSelect(college: College) {
    setQuery(college.name);
    setShowDropdown(false);
    setResults([]);
    onSelect(college);
  }

  return (
    <View className="mb-3">
      <View className="relative">
        <TextInput
          className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 pr-10"
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={(t) => { setQuery(t); if (selectedCollege) onSelect(null as any); }}
          autoCorrect={false}
        />
        {loading && (
          <View className="absolute right-3 top-3">
            <ActivityIndicator size="small" color="#818cf8" />
          </View>
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <View className="bg-slate-800 rounded-xl mt-1 border border-slate-700 max-h-48 overflow-hidden">
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {results.map((c) => (
              <TouchableOpacity
                key={c.id}
                className="px-4 py-3 border-b border-slate-700/50 active:bg-slate-700"
                onPress={() => handleSelect(c)}
              >
                <Text className="text-white font-medium text-sm">{c.name}</Text>
                <View className="flex-row items-center mt-0.5">
                  {c.state && <Text className="text-slate-400 text-xs">{c.state}</Text>}
                  {c.district && <Text className="text-slate-500 text-xs"> • {c.district}</Text>}
                  {c.managementType && (
                    <View className="bg-slate-700 px-1.5 py-0.5 rounded ml-2">
                      <Text className="text-slate-300 text-[10px]">{c.managementType}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {selectedCollege && (
        <Text className="text-emerald-400 text-xs mt-1 ml-1">✓ {selectedCollege.name}</Text>
      )}
    </View>
  );
}
