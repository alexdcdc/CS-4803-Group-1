import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface CreditBadgeProps {
  amount: number;
  size?: 'small' | 'large';
}

export function CreditBadge({ amount, size = 'small' }: CreditBadgeProps) {
  const isLarge = size === 'large';
  return (
    <View style={[styles.badge, isLarge && styles.badgeLarge]}>
      <IconSymbol name="dollarsign.circle.fill" size={isLarge ? 20 : 14} color="#f59e0b" />
      <ThemedText
        style={[styles.text, isLarge && styles.textLarge, { color: '#fff' }]}>
        {amount.toLocaleString()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: { fontSize: 13, fontWeight: '600' },
  textLarge: { fontSize: 18 },
});
