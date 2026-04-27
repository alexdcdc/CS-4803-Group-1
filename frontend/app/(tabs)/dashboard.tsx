import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PendingIndicator } from '@/components/pending-indicator';
import { ProjectCardSkeletonList } from '@/components/skeleton';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';
import { isTempId } from '@/utils/optimistic';

// ─── Creator Dashboard ──────────────────────────────────────────

function CreatorDashboard() {
  const { projects, loading, pending } = useApp();
  const router = useRouter();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const ownedCampaigns = projects.filter((p) => p.isOwned);
  const totalEarnings = ownedCampaigns.reduce((sum, p) => sum + p.raisedCredits, 0);
  const showSkeleton = loading && ownedCampaigns.length === 0;

  const renderCampaign = ({ item }: { item: Project }) => {
    const progress = item.goalCredits > 0 ? item.raisedCredits / item.goalCredits : 0;
    const firstVideo = item.videos[0];
    const isPending = isTempId(item.id) || pending.newProjects.includes(item.id);
    return (
      <Pressable
        style={[styles.campaignCard, { backgroundColor: surface, borderColor: border }, isPending && { opacity: 0.7 }]}
        disabled={isPending}
        onPress={() => router.push({ pathname: '/campaign/[id]', params: { id: item.id } })}>
        <View style={[styles.campaignThumb, { backgroundColor: firstVideo?.placeholderColor ?? Brand.primary }]}>
          {firstVideo?.thumbnailUrl && (
            <Image source={{ uri: firstVideo.thumbnailUrl }} style={StyleSheet.absoluteFillObject} />
          )}
          <ThemedText style={styles.videoCount}>{item.videos.length} videos</ThemedText>
        </View>
        <View style={styles.campaignInfo}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.campaignTitle} numberOfLines={1}>
              {item.title}
            </ThemedText>
            {isPending ? <PendingIndicator size={10} /> : null}
          </View>
          <ProgressBar progress={progress} trackColor={Brand.primarySoft} fillColor={Brand.primary} height={5} />
          <ThemedText style={styles.campaignStats}>
            <ThemedText style={styles.campaignStatsHighlight}>{item.raisedCredits.toLocaleString()}</ThemedText>
            {' / '}{item.goalCredits.toLocaleString()} credits · {item.backerCount} backers
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
      <View style={[styles.earningsCard, { backgroundColor: Brand.warningSoft, borderColor: 'rgba(251,191,36,0.35)' }]}>
        <View style={[styles.earningsIcon, { backgroundColor: Brand.warning }]}>
          <IconSymbol name="dollarsign.circle.fill" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.earningsLabel}>Total Earnings</ThemedText>
          <ThemedText style={styles.earningsAmount}>
            {totalEarnings.toLocaleString()} <ThemedText style={styles.earningsUnit}>credits</ThemedText>
          </ThemedText>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
        onPress={() => router.push('/create-campaign')}>
        <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
        <ThemedText style={styles.createText}>Create New Campaign</ThemedText>
      </Pressable>

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Your Campaigns ({ownedCampaigns.length})
      </ThemedText>

      {showSkeleton ? (
        <ProjectCardSkeletonList count={3} />
      ) : (
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
      )}
    </>
  );
}

// ─── Backer Dashboard ───────────────────────────────────────────

function BackerDashboard() {
  const { projects, user, loading } = useApp();
  const router = useRouter();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const backedProjects = projects.filter((p) => !p.isOwned && p.backerCount > 0);
  const totalDonated = (user?.transactions ?? [])
    .filter((t) => t.type === 'donation')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const showSkeleton = loading && backedProjects.length === 0;

  const renderProject = ({ item }: { item: Project }) => {
    const progress = item.goalCredits > 0 ? item.raisedCredits / item.goalCredits : 0;
    return (
      <Pressable
        style={[styles.campaignCard, { backgroundColor: surface, borderColor: border }]}
        onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}>
        <View style={[styles.campaignThumb, { backgroundColor: item.videos[0]?.placeholderColor ?? Brand.secondary }]}>
          {item.videos[0]?.thumbnailUrl && (
            <Image source={{ uri: item.videos[0].thumbnailUrl }} style={StyleSheet.absoluteFillObject} />
          )}
          <ThemedText style={styles.videoCount}>{item.videos.length} videos</ThemedText>
        </View>
        <View style={styles.campaignInfo}>
          <ThemedText style={styles.campaignTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.creatorName}>{item.creatorName}</ThemedText>
          <ProgressBar progress={progress} trackColor={Brand.secondarySoft} fillColor={Brand.secondary} height={5} />
          <ThemedText style={styles.campaignStats}>
            <ThemedText style={[styles.campaignStatsHighlight, { color: Brand.secondary }]}>
              {item.raisedCredits.toLocaleString()}
            </ThemedText>
            {' / '}{item.goalCredits.toLocaleString()} credits · {item.backerCount} backers
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[styles.earningsCard, { backgroundColor: Brand.accentSoft, borderColor: 'rgba(255,79,163,0.32)' }]}>
        <View style={[styles.earningsIcon, { backgroundColor: Brand.accent }]}>
          <IconSymbol name="heart.fill" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.earningsLabel}>Total Donated</ThemedText>
          <ThemedText style={styles.earningsAmount}>
            {totalDonated.toLocaleString()} <ThemedText style={styles.earningsUnit}>credits</ThemedText>
          </ThemedText>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.createButton,
          { backgroundColor: Brand.secondary, shadowColor: Brand.secondary },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
        onPress={() => router.push('/(tabs)/discover')}>
        <IconSymbol name="magnifyingglass" size={22} color="#fff" />
        <ThemedText style={styles.createText}>Discover Projects</ThemedText>
      </Pressable>

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {"Projects You've Backed"} ({backedProjects.length})
      </ThemedText>

      {showSkeleton ? (
        <ProjectCardSkeletonList count={3} />
      ) : (
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
      )}
    </>
  );
}

// ─── Main Dashboard Screen ──────────────────────────────────────

export default function DashboardScreen() {
  const { user, toggleUserRole, pending } = useApp();
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
          <Pressable
            style={[styles.toggleButton, pending.roleSwap && { opacity: 0.7 }]}
            onPress={toggleUserRole}
            disabled={pending.roleSwap}>
            <IconSymbol name="arrow.left.arrow.right" size={16} color="#fff" />
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
    marginBottom: 18,
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
    backgroundColor: Brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  toggleText: { fontFamily: Fonts.sansMedium, color: '#fff', fontSize: 13, fontWeight: '600' },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: Radius.lg,
    marginBottom: 16,
    borderWidth: 1,
  },
  earningsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsLabel: { fontFamily: Fonts.sansMedium, fontSize: 13, opacity: 0.65 },
  earningsAmount: { fontFamily: Fonts.displayBold, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  earningsUnit: { fontFamily: Fonts.sans, fontSize: 14, fontWeight: '400', opacity: 0.6 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: Brand.primary,
    paddingVertical: 16,
    borderRadius: Radius.md,
    marginBottom: 24,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  createText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 10 },
  list: { paddingBottom: 40 },
  campaignCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  campaignThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoCount: { fontFamily: Fonts.sansMedium, color: '#fff', fontSize: 11, fontWeight: '600' },
  campaignInfo: { flex: 1, justifyContent: 'center', gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campaignTitle: { fontFamily: Fonts.displayBold, fontSize: 16, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  creatorName: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.55 },
  campaignStats: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.65 },
  campaignStatsHighlight: { fontFamily: Fonts.sansBold, color: Brand.primary, opacity: 1, fontWeight: '700' },
  rewardCount: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.45 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
