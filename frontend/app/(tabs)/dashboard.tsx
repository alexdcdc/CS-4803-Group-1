import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';

// ─── Creator Dashboard ──────────────────────────────────────────

function CreatorDashboard() {
  const { projects } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const ownedCampaigns = projects.filter((p) => p.isOwned);
  const totalEarnings = ownedCampaigns.reduce((sum, p) => sum + p.raisedCredits, 0);

  const renderCampaign = ({ item }: { item: Project }) => {
    const progress = item.goalCredits > 0 ? item.raisedCredits / item.goalCredits : 0;
    return (
      <Pressable
        style={styles.campaignCard}
        onPress={() => router.push({ pathname: '/campaign/[id]', params: { id: item.id } })}>
        <View style={[styles.campaignThumb, { backgroundColor: item.videos[0]?.placeholderColor ?? '#333' }]}>
          <ThemedText style={styles.videoCount}>{item.videos.length} videos</ThemedText>
        </View>
        <View style={styles.campaignInfo}>
          <ThemedText style={styles.campaignTitle}>{item.title}</ThemedText>
          <ProgressBar progress={progress} trackColor={textColor + '15'} fillColor="#22c55e" height={4} />
          <ThemedText style={styles.campaignStats}>
            {item.raisedCredits.toLocaleString()} / {item.goalCredits.toLocaleString()} credits · {item.backerCount} backers
          </ThemedText>
          <ThemedText style={styles.rewardCount}>
            {item.rewards.length} reward{item.rewards.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {/* Earnings summary */}
      <View style={styles.earningsCard}>
        <IconSymbol name="dollarsign.circle.fill" size={28} color="#f59e0b" />
        <View>
          <ThemedText style={styles.earningsLabel}>Total Earnings</ThemedText>
          <ThemedText style={styles.earningsAmount}>
            {totalEarnings.toLocaleString()} credits
          </ThemedText>
        </View>
      </View>

      {/* Create campaign button */}
      <Pressable
        style={styles.createButton}
        onPress={() => router.push('/create-campaign')}>
        <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
        <ThemedText style={styles.createText}>Create New Campaign</ThemedText>
      </Pressable>

      {/* Campaigns list */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Your Campaigns ({ownedCampaigns.length})
      </ThemedText>

      <FlatList
        data={ownedCampaigns}
        keyExtractor={(item) => item.id}
        renderItem={renderCampaign}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>
            No campaigns yet. Create one to get started!
          </ThemedText>
        }
      />
    </>
  );
}

// ─── Backer Dashboard ───────────────────────────────────────────

function BackerDashboard() {
  const { projects, user } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const backedProjects = projects.filter((p) => !p.isOwned && p.backerCount > 0);
  const totalDonated = (user?.transactions ?? [])
    .filter((t) => t.type === 'donation')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const renderProject = ({ item }: { item: Project }) => {
    const progress = item.goalCredits > 0 ? item.raisedCredits / item.goalCredits : 0;
    return (
      <Pressable
        style={styles.campaignCard}
        onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}>
        <View style={[styles.campaignThumb, { backgroundColor: item.videos[0]?.placeholderColor ?? '#333' }]}>
          <ThemedText style={styles.videoCount}>{item.videos.length} videos</ThemedText>
        </View>
        <View style={styles.campaignInfo}>
          <ThemedText style={styles.campaignTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.creatorName}>{item.creatorName}</ThemedText>
          <ProgressBar progress={progress} trackColor={textColor + '15'} fillColor="#3b82f6" height={4} />
          <ThemedText style={styles.campaignStats}>
            {item.raisedCredits.toLocaleString()} / {item.goalCredits.toLocaleString()} credits · {item.backerCount} backers
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {/* Backing summary */}
      <View style={[styles.earningsCard, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
        <IconSymbol name="heart.fill" size={28} color="#3b82f6" />
        <View>
          <ThemedText style={styles.earningsLabel}>Total Donated</ThemedText>
          <ThemedText style={styles.earningsAmount}>
            {totalDonated.toLocaleString()} credits
          </ThemedText>
        </View>
      </View>

      {/* Discover button */}
      <Pressable
        style={[styles.createButton, { backgroundColor: '#3b82f6' }]}
        onPress={() => router.push('/(tabs)/discover')}>
        <IconSymbol name="magnifyingglass" size={22} color="#fff" />
        <ThemedText style={styles.createText}>Discover Projects</ThemedText>
      </Pressable>

      {/* Backed projects */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {"Projects You've Backed"} ({backedProjects.length})
      </ThemedText>

      <FlatList
        data={backedProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>
            {"No backed projects yet. Explore and support creators!"}
          </ThemedText>
        }
      />
    </>
  );
}

// ─── Main Dashboard Screen ──────────────────────────────────────

export default function DashboardScreen() {
  const { user, toggleUserRole } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const isCreator = user?.role === 'creator';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="title" style={styles.heading}>
          {isCreator ? 'Creator Dashboard' : 'Backer Dashboard'}
        </ThemedText>
        <View style={styles.headerActions}>
          <Pressable style={styles.toggleButton} onPress={toggleUserRole}>
            <IconSymbol name="arrow.left.arrow.right" size={18} color="#fff" />
            <ThemedText style={styles.toggleText}>
              {isCreator ? 'Backer' : 'Creator'}
            </ThemedText>
          </Pressable>
          <Pressable style={styles.accountButton} onPress={() => router.push('/account')}>
            <IconSymbol name="gearshape.fill" size={22} color={textColor} />
          </Pressable>
        </View>
      </View>

      {isCreator ? <CreatorDashboard /> : <BackerDashboard />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heading: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountButton: {
    padding: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(128,128,128,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(245,158,11,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  earningsLabel: { fontSize: 13, opacity: 0.6 },
  earningsAmount: { fontSize: 22, fontWeight: 'bold' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: '#0a7ea4',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  createText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingBottom: 40 },
  campaignCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  campaignThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCount: { color: '#fff', fontSize: 11, fontWeight: '600' },
  campaignInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  campaignTitle: { fontSize: 16, fontWeight: '600' },
  creatorName: { fontSize: 13, opacity: 0.5 },
  campaignStats: { fontSize: 12, opacity: 0.5 },
  rewardCount: { fontSize: 12, opacity: 0.5 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
