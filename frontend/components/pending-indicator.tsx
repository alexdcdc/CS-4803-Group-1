import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';

import { Brand } from '@/constants/theme';

interface PendingIndicatorProps {
  size?: number;
  color?: string;
  style?: ViewStyle | ViewStyle[];
}

export function PendingIndicator({ size = 14, color = Brand.primary, style }: PendingIndicatorProps) {
  return (
    <View style={[styles.host, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }, style]}>
      <ActivityIndicator size="small" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
});
