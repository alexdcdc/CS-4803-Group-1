import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Transaction } from '@/data/types';

export default function WalletScreen() {
  const { user, projects, convertCredits } = useApp();
  const router = useRouter();
  const ownedCampaigns = projects.filter((p) => p.isOwned);
  const totalEarnings = ownedCampaigns.reduce((sum, p) => sum + p.raisedCredits, 0);

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

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <ThemedText style={styles.balanceLabel}>Credit Balance</ThemedText>
        <View style={styles.balanceRow}>
          <IconSymbol name="dollarsign.circle.fill" size={32} color="#f59e0b" />
          <ThemedText style={styles.balanceAmount}>
            {user?.creditBalance.toLocaleString() ?? '0'}
          </ThemedText>
        </View>
        <Pressable
          style={styles.rechargeButton}
          onPress={() => router.push('/recharge')}>
          <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
          <ThemedText style={styles.rechargeText}>Recharge Credits</ThemedText>
        </Pressable>
      </View>

      {/* Creator payout section */}
      {ownedCampaigns.length > 0 && (
        <View style={styles.payoutCard}>
          <View style={styles.payoutHeader}>
            <ThemedText style={styles.payoutLabel}>Creator Earnings</ThemedText>
            <ThemedText style={styles.payoutAmount}>
              {totalEarnings.toLocaleString()} credits
            </ThemedText>
          </View>
          <ThemedText style={styles.payoutRate}>
            Conversion rate: 100 credits = $1.00
          </ThemedText>
          <Pressable
            style={styles.payoutButton}
            onPress={async () => {
              if (totalEarnings > 0) {
                const { dollarAmount } = await convertCredits(totalEarnings);
                alert(`Converted to $${dollarAmount.toFixed(2)}!`);
              }
            }}>
            <IconSymbol name="creditcard.fill" size={18} color="#fff" />
            <ThemedText style={styles.payoutButtonText}>Convert to Cash</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Transaction history */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Transaction History
      </ThemedText>

      <FlatList
        data={user?.transactions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>No transactions yet.</ThemedText>
        }
      />
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
