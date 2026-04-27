import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PendingIndicator } from '@/components/pending-indicator';
import { EarningsSkeleton, SkeletonText, TransactionRowSkeleton } from '@/components/skeleton';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ConnectStatus, CreatorEarnings, Transaction } from '@/data/types';

export default function WalletScreen() {
  const {
    user,
    projects,
    convertCredits,
    getConnectStatus,
    getCreatorEarningsSummary,
    startCreatorOnboarding,
    refresh,
    pending,
  } = useApp();
  const router = useRouter();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const ownedCampaigns = projects.filter((p) => p.isOwned);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const loadPayoutState = useCallback(async () => {
    if (ownedCampaigns.length === 0) return;
    const [earningsSummary, status] = await Promise.all([
      getCreatorEarningsSummary(),
      getConnectStatus(),
    ]);
    setEarnings(earningsSummary);
    setConnectStatus(status);
  }, [ownedCampaigns.length, getCreatorEarningsSummary, getConnectStatus]);

  useEffect(() => {
    loadPayoutState();
  }, [loadPayoutState]);

  // Web only: when this page loads as the Stripe success/cancel landing in
  // the popup window, notify the original tab (whose recharge modal is
  // listening) and close ourselves. WebBrowser's URL polling can't see the
  // redirect because Stripe sets COOP, severing the popup handle.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('status');
    if (stripeStatus !== 'success' && stripeStatus !== 'cancelled') return;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('stripe-checkout');
        channel.postMessage({ status: stripeStatus });
        channel.close();
      } catch {}
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('status');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.pathname + url.search);

    setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 100);
  }, []);

  const handleOnboarding = async () => {
    setPayoutStatus('loading');
    setPayoutError(null);
    try {
      const returnUrl = Linking.createURL('/wallet');
      const { url } = await startCreatorOnboarding();
      await WebBrowser.openAuthSessionAsync(url, returnUrl);
      await loadPayoutState();
      setPayoutStatus('idle');
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Payout setup failed.');
      setPayoutStatus('error');
    }
  };

  const handleCashout = async () => {
    if (!earnings || earnings.available < 100) return;
    setPayoutStatus('loading');
    setPayoutError(null);
    try {
      const { dollarAmount } = await convertCredits(earnings.available);
      await Promise.all([refresh(), loadPayoutState()]);
      setPayoutStatus('idle');
      alert(`Cashout started for $${dollarAmount.toFixed(2)}.`);
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Cashout failed.');
      setPayoutStatus('error');
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isPositive = item.amount > 0;
    const tone = isPositive ? Brand.success : Brand.accent;
    return (
      <View style={[styles.txRow, { borderBottomColor: border }]}>
        <View style={[styles.txIcon, { backgroundColor: tone + '22' }]}>
          <IconSymbol
            name={item.type === 'recharge' ? 'plus.circle.fill' : item.type === 'payout' ? 'arrow.down.circle.fill' : 'heart.fill'}
            size={18}
            color={tone}
          />
        </View>
        <View style={styles.txInfo}>
          <ThemedText style={styles.txLabel} numberOfLines={1}>
            {item.label}
          </ThemedText>
          <ThemedText style={styles.txDate}>{item.date}</ThemedText>
        </View>
        <ThemedText style={[styles.txAmount, { color: tone }]}>
          {isPositive ? '+' : ''}{item.amount}
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Wallet
      </ThemedText>

      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <ThemedText style={styles.balanceLabel}>Credit Balance</ThemedText>
          <View style={styles.balanceChip}>
            <IconSymbol name="bolt.fill" size={12} color="#fff" />
            <ThemedText style={styles.balanceChipText}>Live</ThemedText>
          </View>
        </View>
        <View style={styles.balanceRow}>
          {user ? (
            <ThemedText style={styles.balanceAmount}>
              {user.creditBalance.toLocaleString()}
            </ThemedText>
          ) : (
            <SkeletonText size="title" width={120} />
          )}
          <ThemedText style={styles.balanceUnit}>credits</ThemedText>
          {pending.checkout ? (
            <PendingIndicator size={16} style={{ marginLeft: 8 }} />
          ) : null}
        </View>
        {pending.checkout ? (
          <ThemedText style={styles.checkoutHint}>
            Waiting for Stripe — {pending.checkout.credits.toLocaleString()} credits will appear shortly.
          </ThemedText>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.rechargeButton, pressed && { opacity: 0.92 }]}
          onPress={() => router.push('/recharge')}>
          <IconSymbol name="plus.circle.fill" size={20} color={Brand.primary} />
          <ThemedText style={styles.rechargeText}>Recharge Credits</ThemedText>
        </Pressable>
      </View>

      {ownedCampaigns.length > 0 && (
        earnings && connectStatus ? (
          <View style={[styles.payoutCard, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.payoutHeader}>
              <View>
                <ThemedText style={styles.payoutLabel}>Creator Earnings</ThemedText>
                <ThemedText style={styles.payoutAmount}>
                  {earnings.available.toLocaleString()} <ThemedText style={styles.payoutUnit}>credits</ThemedText>
                </ThemedText>
              </View>
              <View style={[styles.payoutBadge, { backgroundColor: Brand.secondarySoft }]}>
                <IconSymbol name="dollarsign.circle.fill" size={20} color={Brand.secondary} />
              </View>
            </View>
            <ThemedText style={styles.payoutRate}>
              Conversion rate: 100 credits = $1.00
            </ThemedText>
            {earnings.paidOut > 0 ? (
              <ThemedText style={styles.payoutRate}>
                Paid out: {earnings.paidOut.toLocaleString()} credits
              </ThemedText>
            ) : null}
            <Pressable
              style={[styles.payoutButton, payoutStatus === 'loading' && { opacity: 0.6 }]}
              onPress={connectStatus.status === 'active' ? handleCashout : handleOnboarding}
              disabled={payoutStatus === 'loading' || (connectStatus.status === 'active' && earnings.available < 100)}>
              <IconSymbol name="creditcard.fill" size={18} color="#fff" />
              <ThemedText style={styles.payoutButtonText}>
                {payoutStatus === 'loading'
                  ? 'Working...'
                  : connectStatus.status === 'active'
                    ? 'Cash Out'
                    : 'Set Up Payouts'}
              </ThemedText>
            </Pressable>
            {connectStatus.status !== 'active' ? (
              <ThemedText style={styles.payoutRate}>
                Stripe payouts are {connectStatus.status.replace('_', ' ')}.
              </ThemedText>
            ) : null}
            {payoutStatus === 'error' ? (
              <ThemedText style={styles.error}>{payoutError ?? 'Payout setup failed. Check Stripe and try again.'}</ThemedText>
            ) : null}
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <EarningsSkeleton />
          </View>
        )
      )}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Transaction History
      </ThemedText>

      {user === null ? (
        <View style={styles.list}>
          <TransactionRowSkeleton />
          <TransactionRowSkeleton />
          <TransactionRowSkeleton />
        </View>
      ) : (
        <FlatList
          data={user.transactions ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText style={styles.empty}>No transactions yet.</ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  heading: { paddingHorizontal: 16, marginBottom: 18 },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: Brand.primary,
    padding: 22,
    borderRadius: Radius.lg,
    marginBottom: 16,
    gap: 14,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 10,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontFamily: Fonts.sansMedium, color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  balanceChipText: { fontFamily: Fonts.sansMedium, color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  balanceAmount: { fontFamily: Fonts.displayBold, fontSize: 44, fontWeight: '700', color: '#fff', letterSpacing: -1 },
  balanceUnit: { fontFamily: Fonts.sansMedium, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  checkoutHint: { fontFamily: Fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  rechargeText: { fontFamily: Fonts.displayBold, color: Brand.primary, fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  payoutCard: {
    marginHorizontal: 16,
    padding: 18,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutLabel: { fontFamily: Fonts.sansMedium, fontSize: 13, opacity: 0.6 },
  payoutAmount: { fontFamily: Fonts.displayBold, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  payoutUnit: { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '400', opacity: 0.6 },
  payoutRate: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.5 },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.secondary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  payoutButtonText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  error: { color: Brand.error, fontSize: 12 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingBottom: 40, paddingHorizontal: 16 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { flex: 1 },
  txLabel: { fontFamily: Fonts.sansMedium, fontSize: 14, fontWeight: '600' },
  txDate: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.5 },
  txAmount: { fontFamily: Fonts.displayBold, fontSize: 16, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
