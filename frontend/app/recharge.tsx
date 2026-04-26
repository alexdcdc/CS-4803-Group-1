import { Pressable, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';

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
  const { user, startCreditCheckout, beginCheckoutPolling } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState(500);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleRecharge = async () => {
    try {
      setStatus('loading');
      const returnUrl = Linking.createURL('/recharge');
      const { url } = await startCreditCheckout(selected, returnUrl);
      await WebBrowser.openAuthSessionAsync(url, returnUrl);
      // Hand off polling to AppContext: it will hit /users/me until the
      // balance reflects this purchase, or time out after 60s. The Wallet
      // screen renders the spinner overlay.
      beginCheckoutPolling(selected);
      router.back();
    } catch {
      setStatus('error');
    }
  };

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
            ? 'Opening Stripe Checkout...'
            : `Buy ${selected} Credits for ${PACKAGES.find((p) => p.credits === selected)?.price}`}
        </ThemedText>
      </Pressable>
      {status === 'error' ? (
        <ThemedText style={styles.error}>
          Checkout could not be started. Check your Stripe configuration and try again.
        </ThemedText>
      ) : null}
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
  error: { color: '#ef4444', marginTop: 16, textAlign: 'center' },
});
