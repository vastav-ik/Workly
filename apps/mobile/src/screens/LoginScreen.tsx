import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import CollegeSearchInput from "../components/CollegeSearchInput";

interface College { id: string; name: string; location: string; state?: string; managementType?: string; }

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [stream, setStream] = useState("Engineering");
  const [semester, setSemester] = useState("1");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      if (isRegister) {
        if (!selectedCollege) { Alert.alert("Error", "Please select a college"); setLoading(false); return; }
        await register({ name, email, password, collegeId: selectedCollege.id, stream, branch, semester: parseInt(semester) });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
      <ScrollView className="flex-1 bg-neutral-900" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <View className="items-center mb-8">
          <Text className="text-4xl font-bold text-content-darkPrimary mb-2 tracking-tight">🎓 CampusConnect</Text>
          <Text className="text-content-darkSecondary text-base">Your College, Your Community</Text>
        </View>

        <View className="bg-neutral-800 rounded-card p-6 border border-neutral-700">
          <Text className="text-2xl font-bold text-content-darkPrimary mb-6 text-center tracking-tight">
            {isRegister ? "Create Account" : "Welcome Back"}
          </Text>

          {isRegister && (
            <TextInput
              className="bg-neutral-900 text-content-darkPrimary px-4 py-3 rounded-input mb-3 border border-neutral-700 min-h-[48px]"
              placeholder="Full Name"
              placeholderTextColor="#aaaaaa"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            className="bg-neutral-900 text-content-darkPrimary px-4 py-3 rounded-input mb-3 border border-neutral-700 min-h-[48px]"
            placeholder="Email"
            placeholderTextColor="#aaaaaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            className="bg-neutral-900 text-content-darkPrimary px-4 py-3 rounded-input mb-3 border border-neutral-700 min-h-[48px]"
            placeholder="Password"
            placeholderTextColor="#aaaaaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {isRegister && (
            <>
              <CollegeSearchInput selectedCollege={selectedCollege} onSelect={setSelectedCollege} />

              <TextInput
                className="bg-neutral-900 text-content-darkPrimary px-4 py-3 rounded-input mb-3 border border-neutral-700 min-h-[48px]"
                placeholder="Branch (e.g. CSE, ECE)"
                placeholderTextColor="#aaaaaa"
                value={branch}
                onChangeText={setBranch}
              />

              <View className="flex-row gap-3 mb-3">
                <TextInput
                  className="bg-neutral-900 text-content-darkPrimary px-4 py-3 rounded-input flex-1 border border-neutral-700 min-h-[48px]"
                  placeholder="Stream"
                  placeholderTextColor="#aaaaaa"
                  value={stream}
                  onChangeText={setStream}
                />
                <TextInput
                  className="bg-neutral-900 text-content-darkPrimary px-4 py-3 rounded-input w-20 border border-neutral-700 min-h-[48px]"
                  placeholder="Sem"
                  placeholderTextColor="#aaaaaa"
                  value={semester}
                  onChangeText={setSemester}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            className={`py-4 rounded-input mt-2 min-h-[48px] justify-center ${loading ? "bg-brand-academic/70" : "bg-brand-academic"}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-content-darkPrimary text-center font-bold text-base">
                {isRegister ? "Sign Up" : "Log In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="mt-4 min-h-[48px] justify-center" onPress={() => setIsRegister(!isRegister)}>
            <Text className="text-brand-academic text-center">
              {isRegister ? "Already have an account? Log In" : "New here? Create Account"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
