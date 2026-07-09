import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useAuth, API_BASE } from "../context/AuthContext";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const [isPremium, setIsPremium] = useState((user as any)?.isPremium || false);
  const [walletBalance, setWalletBalance] = useState(0);
  const posthog = usePostHog();

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    try {
      const res = await fetch(`${API_BASE}/billing/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.walletBalance);
      }
    } catch (err) {
      console.warn("Failed to fetch wallet:", err);
    }
  }

  async function addFunds(amount: number) {
    try {
      const res = await fetch(`${API_BASE}/billing/wallet/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.walletBalance);
        Alert.alert("Success", data.message);
      }
    } catch {
      Alert.alert("Error", "Failed to add funds");
    }
  }

  function triggerCrash() {
    posthog?.capture("test_crash_initiated");
    throw new Error("Test Sentry Crash");
  }

  async function togglePremium() {
    try {
      const res = await fetch(`${API_BASE}/billing/premium/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsPremium(data.isPremium);
        Alert.alert("Success", data.message);
      }
    } catch { Alert.alert("Error", "Failed to toggle premium"); }
  }

  async function exportData() {
    try {
      const res = await fetch(`${API_BASE}/auth/data-export`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) Alert.alert("Data Export", "Your personal data has been exported. Check the response in developer tools.");
      else Alert.alert("Error", "Failed to export data");
    } catch { Alert.alert("Error", "Export failed"); }
  }

  async function deleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently erase all your data per DPDP Act. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/auth/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
              if (res.ok) { Alert.alert("Account Deleted", "All data has been erased."); logout(); }
            } catch { Alert.alert("Error", "Deletion failed"); }
          },
        },
      ]
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      {/* Profile Header */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-indigo-600 items-center justify-center mb-3">
          <Text className="text-white text-3xl font-bold">{user?.name?.[0] || "?"}</Text>
        </View>
        <Text className="text-white text-xl font-bold">{user?.name}</Text>
        <Text className="text-slate-400">{user?.email}</Text>
        {isPremium && (
          <View className="bg-amber-900/50 px-3 py-1 rounded-full mt-2">
            <Text className="text-amber-400 text-xs font-bold">⭐ Premium Member</Text>
          </View>
        )}
      </View>

      {/* Info Cards */}
      <View className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800">
        <Text className="text-slate-400 text-xs font-bold uppercase mb-3">Profile Info</Text>
        <InfoRow label="College" value={typeof user?.college === "object" ? (user.college as any)?.name : (user?.college || "—")} />
        <InfoRow label="Branch" value={user?.branch || "—"} />
        <InfoRow label="Semester" value={String(user?.semester || "—")} />
        <InfoRow label="Verified" value={user?.verified ? "✅ Yes" : "❌ Not yet"} />
      </View>

      {/* Wallet Card */}
      <View className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800">
        <Text className="text-slate-400 text-xs font-bold uppercase mb-2">My Wallet</Text>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-2xl font-bold">₹{walletBalance}</Text>
          <Text className="text-slate-500 text-xs">For study notes & marketplace</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 py-2 bg-emerald-600 rounded-xl"
            onPress={() => addFunds(100)}
          >
            <Text className="text-white text-center font-bold">+ Add ₹100</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-2 bg-emerald-700 rounded-xl"
            onPress={() => addFunds(500)}
          >
            <Text className="text-white text-center font-bold">+ Add ₹500</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800">
        <Text className="text-slate-400 text-xs font-bold uppercase mb-3">Subscription</Text>
        <TouchableOpacity
          className={`py-3 rounded-xl ${isPremium ? "bg-slate-800" : "bg-amber-600"}`}
          onPress={togglePremium}
        >
          <Text className="text-white text-center font-bold">
            {isPremium ? "Cancel Premium" : "🚀 Upgrade to Premium"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DPDP Compliance */}
      <View className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800">
        <Text className="text-slate-400 text-xs font-bold uppercase mb-3">🔒 Data & Privacy (DPDP)</Text>
        <TouchableOpacity className="py-3 bg-slate-800 rounded-xl mb-2" onPress={exportData}>
          <Text className="text-indigo-400 text-center font-medium">📥 Download My Data</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-3 bg-red-950/50 rounded-xl border border-red-900/50" onPress={deleteAccount}>
          <Text className="text-red-400 text-center font-medium">🗑️ Delete Account & Data</Text>
        </TouchableOpacity>
      </View>

      {/* Developer Tools */}
      <View className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800">
        <Text className="text-slate-400 text-xs font-bold uppercase mb-3">🛠️ Developer Options</Text>
        <TouchableOpacity className="py-3 bg-red-900/80 rounded-xl" onPress={triggerCrash}>
          <Text className="text-white text-center font-medium">💥 Trigger Test Crash</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity className="py-4 bg-slate-800 rounded-xl mt-2 mb-10" onPress={logout}>
        <Text className="text-slate-300 text-center font-medium">Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-slate-800">
      <Text className="text-slate-400">{label}</Text>
      <Text className="text-white font-medium">{value}</Text>
    </View>
  );
}
