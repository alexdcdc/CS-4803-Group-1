import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors, Fonts, Radius } from '@/constants/theme';

const PACKAGES = [
  { credits: 100, price: '$1.00' },
  { credits: 500, price: '$5.00' },
  { credits: 1000, price: '$10.00' },
  { credits: 2500, price: '$25.00' },
];

const MIN_CREDITS = 50;
const MAX_CREDITS = 100_000;

const formatPrice = (credits: number) => `$${(credits / 100).toFixed(2)}`;

export default function RechargeScreen() {
  const { user, startCreditCheckout, beginCheckoutPolling } = useApp();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selected, setSelected] = useState<number>(500);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const customCredits = useMemo(() => {
    const parsed = parseInt(customInput, 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [customInput]);

  const customValid =
    customMode && Number.isFinite(customCredits) && customCredits >= MIN_CREDITS && customCredits <= MAX_CREDITS;

  const effectiveCredits = customMode ? (customValid ? customCredits : 0) : selected;

  // On web, Stripe sets Cross-Origin-Opener-Policy which severs the parent's
  // handle on the popup, so WebBrowser's URL-poll never resolves. The popup
  // posts to this BroadcastChannel from the wallet screen on its way back,
  // and we use that as the cue to close the modal.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('stripe-checkout');
    channel.onmessage = (event) => {
      if (event.data?.status === 'success' && effectiveCredits > 0) {
        beginCheckoutPolling(effectiveCredits);
      }
      router.dismissTo('/(tabs)/wallet');
    };
    return () => channel.close();
  }, [effectiveCredits, beginCheckoutPolling, router]);

  const handleRecharge = async () => {
    if (effectiveCredits <= 0) return;
    try {
      setStatus('loading');
      const returnUrl = Linking.createURL('/wallet');
      const { url } = await startCreditCheckout(effectiveCredits, returnUrl);
      await WebBrowser.openAuthSessionAsync(url, returnUrl);
      // Hand off polling to AppContext: it will hit /users/me until the
      // balance reflects this purchase, or time out after 60s. The Wallet
      // screen renders the spinner overlay.
      beginCheckoutPolling(effectiveCredits);
      router.dismissTo('/(tabs)/wallet');
    } catch {
      setStatus('error');
    }
  };

  const buyDisabled = status === 'loading' || effectiveCredits <= 0;
  const buyLabel =
    status === 'loading'
      ? 'Opening Stripe Checkout...'
      : effectiveCredits > 0
        ? `Buy ${effectiveCredits.toLocaleString()} Credits for ${formatPrice(effectiveCredits)}`
        : 'Enter an amount';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
      <View style={styles.heroIcon}>
        <IconSymbol name="plus.circle.fill" size={36} color="#fff" />
      </View>
      <ThemedText type="title" style={{ marginTop: 12 }}>
        Recharge Credits
      </ThemedText>
      <ThemedText style={styles.sub}>
        Current balance: {user?.creditBalance.toLocaleString() ?? 0} credits
      </ThemedText>

      <View style={styles.packages}>
        {PACKAGES.map((pkg) => {
          const isSelected = !customMode && selected === pkg.credits;
          return (
            <Pressable
              key={pkg.credits}
              style={[styles.packageCard, isSelected && styles.packageSelected]}
              onPress={() => {
                setCustomMode(false);
                setSelected(pkg.credits);
              }}>
              <ThemedText style={[styles.packageCredits, isSelected && styles.packageCreditsSelected]}>
                {pkg.credits}
              </ThemedText>
              <ThemedText style={styles.packageLabel}>credits</ThemedText>
              <ThemedText style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                {pkg.price}
              </ThemedText>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.packageCard, customMode && styles.packageSelected]}
          onPress={() => setCustomMode(true)}>
          <IconSymbol
            name="pencil"
            size={26}
            color={customMode ? Brand.secondary : palette.icon}
          />
          <ThemedText style={[styles.packageLabel, { marginTop: 6 }]}>Custom</ThemedText>
          <ThemedText
            style={[styles.packagePrice, customMode && styles.packagePriceSelected]}>
            {customMode && customValid ? formatPrice(customCredits) : 'Any amount'}
          </ThemedText>
        </Pressable>
      </View>

      {customMode && (
        <View style={styles.customRow}>
          <TextInput
            value={customInput}
            onChangeText={(t) => setCustomInput(t.replace(/[^0-9]/g, ''))}
            placeholder={`${MIN_CREDITS}-${MAX_CREDITS.toLocaleString()}`}
            placeholderTextColor={palette.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            autoFocus
            style={[
              styles.customInput,
              {
                color: palette.text,
                backgroundColor: palette.surface,
                borderColor: customValid ? Brand.secondary : palette.border,
              },
            ]}
          />
          <ThemedText style={styles.customHint}>
            {customInput.length === 0
              ? `Enter ${MIN_CREDITS}–${MAX_CREDITS.toLocaleString()} credits`
              : customValid
                ? `${formatPrice(customCredits)} • 1 credit = $0.01`
                : `Amount must be between ${MIN_CREDITS} and ${MAX_CREDITS.toLocaleString()}`}
          </ThemedText>
        </View>
      )}

      <Pressable
        style={[styles.buyButton, buyDisabled && { opacity: 0.5 }]}
        onPress={handleRecharge}
        disabled={buyDisabled}>
        <ThemedText style={styles.buyText}>{buyLabel}</ThemedText>
      </Pressable>
      {status === 'error' ? (
        <ThemedText style={styles.error}>
          Checkout could not be started. Check your Stripe configuration and try again.
        </ThemedText>
      ) : null}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: Brand.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
  },
  sub: { fontFamily: Fonts.sans, opacity: 0.65, marginTop: 6 },
  packages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 32,
    justifyContent: 'center',
  },
  packageCard: {
    width: 144,
    padding: 18,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.18)',
    alignItems: 'center',
    gap: 2,
  },
  packageSelected: {
    borderColor: Brand.secondary,
    backgroundColor: Brand.secondarySoft,
  },
  packageCredits: { fontFamily: Fonts.displayBold, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  packageCreditsSelected: { color: Brand.secondary },
  packageLabel: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.55 },
  packagePrice: { fontFamily: Fonts.displayBold, fontSize: 16, fontWeight: '700', marginTop: 4 },
  packagePriceSelected: { color: Brand.secondary },
  customRow: {
    width: '100%',
    marginTop: 20,
    gap: 8,
    alignItems: 'center',
  },
  customInput: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 2,
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  customHint: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.6 },
  buyButton: {
    backgroundColor: Brand.secondary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 999,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: Brand.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  buyText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
  error: { color: Brand.error, marginTop: 16, textAlign: 'center' },
});
