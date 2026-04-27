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
    return (
      <View style={styles.txRow}>
        <View style={[styles.txIcon, { backgroundColor: isPositive ? '#22c55e20' : '#ef444420' }]}>
          <IconSymbol
            name={item.type === 'recharge' ? 'plus.circle.fill' : item.type === 'payout' ? 'arrow.down.circle.fill' : 'heart.fill'}
            size={18}
            color={isPositive ? '#22c55e' : '#ef4444'}
          />
        </View>
        <View style={styles.txInfo}>
          <ThemedText style={styles.txLabel} numberOfLines={1}>
            {item.label}
          </ThemedText>
          <ThemedText style={styles.txDate}>{item.date}</ThemedText>
        </View>
        <ThemedText style={[styles.txAmount, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
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
        <ThemedText style={styles.balanceLabel}>Credit Balance</ThemedText>
        <View style={styles.balanceRow}>
          <IconSymbol name="dollarsign.circle.fill" size={32} color="#f59e0b" />
          {user ? (
            <ThemedText style={styles.balanceAmount}>
              {user.creditBalance.toLocaleString()}
            </ThemedText>
          ) : (
            <SkeletonText size="title" width={120} />
          )}
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
          style={styles.rechargeButton}
          onPress={() => router.push('/recharge')}>
          <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
          <ThemedText style={styles.rechargeText}>Recharge Credits</ThemedText>
        </Pressable>
      </View>

      {ownedCampaigns.length > 0 && (
        earnings && connectStatus ? (
          <View style={styles.payoutCard}>
            <View style={styles.payoutHeader}>
              <ThemedText style={styles.payoutLabel}>Creator Earnings</ThemedText>
              <ThemedText style={styles.payoutAmount}>
                {earnings.available.toLocaleString()} credits
              </ThemedText>
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
  heading: { paddingHorizontal: 16, marginBottom: 16 },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(245,158,11,0.08)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  balanceLabel: { fontSize: 14, opacity: 0.6 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold' },
  checkoutHint: { fontSize: 12, opacity: 0.6 },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 10,
  },
  rechargeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  payoutCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(10,126,164,0.08)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutLabel: { fontSize: 14, opacity: 0.6 },
  payoutAmount: { fontSize: 18, fontWeight: 'bold' },
  payoutRate: { fontSize: 12, opacity: 0.4 },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a7ea4',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  payoutButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: '#ef4444', fontSize: 12 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingBottom: 40, paddingHorizontal: 16 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 12, opacity: 0.4 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
