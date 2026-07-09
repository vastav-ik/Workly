import React from "react";
import { View, Text, Image, TouchableOpacity, Linking, Alert } from "react-native";

interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
}

interface AdBannerProps {
  ad: Ad;
}

export default function AdBanner({ ad }: AdBannerProps) {
  const handlePress = async () => {
    try {
      const supported = await Linking.canOpenURL(ad.linkUrl);
      if (supported) {
        await Linking.openURL(ad.linkUrl);
      } else {
        Alert.alert("Error", `Cannot open link: ${ad.linkUrl}`);
      }
    } catch {
      Alert.alert("Error", "Failed to open link.");
    }
  };

  return (
    <View className="bg-amber-950/20 mx-4 mb-4 rounded-card border border-amber-500/20 overflow-hidden">
      {/* Sponsored Header */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/10">
        <View className="flex-row items-center">
          <Text className="text-amber-500 text-xs font-bold tracking-widest uppercase">
            📢 Sponsored
          </Text>
        </View>
        <Text className="text-slate-500 text-[10px]">Partner Offer</Text>
      </View>

      {/* Banner Image */}
      {ad.imageUrl && (
        <View className="w-full aspect-[21/9] bg-neutral-900 overflow-hidden">
          <Image
            source={{ uri: ad.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Details */}
      <View className="p-4">
        <Text className="text-amber-400 font-bold text-base mb-1">{ad.title}</Text>
        <Text className="text-slate-300 text-sm leading-relaxed mb-3">{ad.description}</Text>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handlePress}
          className="bg-amber-600 rounded-xl py-2.5 px-4 justify-center items-center"
        >
          <Text className="text-white font-bold text-sm">Learn More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
