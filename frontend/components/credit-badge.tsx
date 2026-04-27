import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts } from '@/constants/theme';

interface CreditBadgeProps {
  amount: number;
  size?: 'small' | 'large';
}

export function CreditBadge({ amount, size = 'small' }: CreditBadgeProps) {
  const isLarge = size === 'large';
  return (
    <View style={[styles.badge, isLarge && styles.badgeLarge]}>
      <IconSymbol name="dollarsign.circle.fill" size={isLarge ? 20 : 14} color={Brand.warning} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  text: { fontFamily: Fonts.displayBold, fontSize: 13, fontWeight: '700' },
  textLarge: { fontSize: 18 },
});
