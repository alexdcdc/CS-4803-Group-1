import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const PACKAGES = [
  { credits: 100, price: '$1.00' },
  { credits: 500, price: '$5.00' },
  { credits: 1000, price: '$10.00' },
  { credits: 2500, price: '$25.00' },
];

export default function RechargeScreen() {
  const { user, rechargeCredits } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState(500);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleRecharge = async () => {
    setStatus('loading');
    await rechargeCredits(selected);
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <ThemedView style={styles.container}>
        <IconSymbol name="checkmark.circle.fill" size={64} color="#22c55e" />
        <ThemedText type="title" style={{ marginTop: 12 }}>
          Credits Added!
        </ThemedText>
        <ThemedText style={styles.sub}>
          {selected} credits have been added to your wallet.
        </ThemedText>
        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <ThemedText style={styles.doneText}>Done</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <IconSymbol name="plus.circle.fill" size={48} color="#22c55e" />
      <ThemedText type="title" style={{ marginTop: 12 }}>
        Recharge Credits
      </ThemedText>
      <ThemedText style={styles.sub}>
        Current balance: {user?.creditBalance.toLocaleString() ?? 0} credits
      </ThemedText>

      <View style={styles.packages}>
        {PACKAGES.map((pkg) => (
          <Pressable
            key={pkg.credits}
            style={[styles.packageCard, selected === pkg.credits && styles.packageSelected]}
            onPress={() => setSelected(pkg.credits)}>
            <ThemedText style={[styles.packageCredits, selected === pkg.credits && styles.packageCreditsSelected]}>
              {pkg.credits}
            </ThemedText>
            <ThemedText style={styles.packageLabel}>credits</ThemedText>
            <ThemedText style={[styles.packagePrice, selected === pkg.credits && styles.packagePriceSelected]}>
              {pkg.price}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.buyButton, status === 'loading' && { opacity: 0.6 }]}
        onPress={handleRecharge}
        disabled={status === 'loading'}>
        <ThemedText style={styles.buyText}>
          {status === 'loading'
            ? 'Processing...'
            : `Buy ${selected} Credits for ${PACKAGES.find((p) => p.credits === selected)?.price}`}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  sub: { opacity: 0.6, marginTop: 4 },
  packages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 32,
    justifyContent: 'center',
  },
  packageCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.2)',
    alignItems: 'center',
    gap: 2,
  },
  packageSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  packageCredits: { fontSize: 28, fontWeight: 'bold' },
  packageCreditsSelected: { color: '#22c55e' },
  packageLabel: { fontSize: 13, opacity: 0.5 },
  packagePrice: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  packagePriceSelected: { color: '#22c55e' },
  buyButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  buyText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  doneButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
