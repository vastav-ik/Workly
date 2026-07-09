import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export default function FeedSkeleton() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="px-4 py-2 bg-slate-950">
      {[1, 2, 3].map((key) => (
        <Animated.View
          key={key}
          style={animatedStyle}
          className="bg-slate-900 rounded-card p-4 border border-slate-800 mb-4"
        >
          {/* Header */}
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 rounded-full bg-slate-800 mr-3 border border-slate-700" />
            <View className="flex-1 gap-2">
              <View className="w-24 h-4 bg-slate-800 rounded" />
              <View className="w-40 h-3 bg-slate-800 rounded" />
            </View>
          </View>
          
          {/* Text Content */}
          <View className="w-full h-3 bg-slate-800 rounded mb-2.5" />
          <View className="w-5/6 h-3 bg-slate-800 rounded mb-4" />
          
          {/* Media gallery block */}
          <View className="w-full aspect-video bg-slate-800 rounded-xl mb-4 border border-slate-700" />
          
          {/* Actions bar */}
          <View className="flex-row gap-4">
            <View className="w-14 h-6 bg-slate-800 rounded-full" />
            <View className="w-14 h-6 bg-slate-800 rounded-full" />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
