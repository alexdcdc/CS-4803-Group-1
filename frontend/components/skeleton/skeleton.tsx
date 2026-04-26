import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const tint = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[styles.host, { width, height, borderRadius: radius }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: tint, opacity: Animated.multiply(opacity, 0.18), borderRadius: radius },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
  },
});
