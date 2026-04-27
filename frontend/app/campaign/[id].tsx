import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MockVideoPlayer } from '@/components/mock-video-player';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PendingIndicator } from '@/components/pending-indicator';
import { RewardSkeleton, Skeleton, SkeletonText, VideoTileSkeleton } from '@/components/skeleton';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { isTempId } from '@/utils/optimistic';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects, pending } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const project = id ? projects.find((p) => p.id === id) : undefined;
  const pendingRewardIds = (id && pending.newRewards[id]) || [];

  if (!project) {
    return <CampaignDetailSkeleton />;
  }

  const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;
  const isProjectPending = pending.newProjects.includes(project.id);

  return (
    <ScrollView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{project.raisedCredits.toLocaleString()}</ThemedText>
            <ThemedText style={styles.statLabel}>Credits Raised</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{project.backerCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Backers</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{Math.round(progress * 100)}%</ThemedText>
            <ThemedText style={styles.statLabel}>Funded</ThemedText>
          </View>
        </View>

        <View style={styles.progressRow}>
          <ProgressBar progress={progress} trackColor={Brand.primarySoft} fillColor={Brand.primary} height={6} />
          <ThemedText style={styles.goalText}>
            Goal: {project.goalCredits.toLocaleString()} credits
          </ThemedText>
        </View>

        <ThemedText style={styles.description}>{project.description}</ThemedText>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, isProjectPending && styles.actionDisabled]}
            disabled={isProjectPending}
            onPress={() =>
              router.push({ pathname: '/upload-content', params: { campaignId: project.id } })
            }>
            <IconSymbol name="arrow.up.doc.fill" size={22} color="#fff" />
            <ThemedText style={styles.actionText}>Upload Content</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: Brand.warning, shadowColor: Brand.warning }, isProjectPending && styles.actionDisabled]}
            disabled={isProjectPending}
            onPress={() =>
              router.push({ pathname: '/add-reward', params: { campaignId: project.id } })
            }>
            <IconSymbol name="gift.fill" size={22} color="#fff" />
            <ThemedText style={styles.actionText}>Add Reward</ThemedText>
          </Pressable>
        </View>

        {isProjectPending ? (
          <View style={styles.pendingBanner}>
            <PendingIndicator size={12} />
            <ThemedText style={styles.pendingText}>Saving campaign…</ThemedText>
          </View>
        ) : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Content ({project.videos.length})
        </ThemedText>
        {project.videos.length === 0 ? (
          <ThemedText style={styles.empty}>No content yet. Upload your first video!</ThemedText>
        ) : (
          <>
            <MockVideoPlayer
              color={project.videos[0].placeholderColor}
              videoUrl={project.videos[0].videoUrl}
              thumbnailUrl={project.videos[0].thumbnailUrl}
              status={project.videos[0].status}
              height={200}
            />
            {project.videos.map((video) => (
              <View key={video.id} style={styles.contentRow}>
                {video.thumbnailUrl ? (
                  <Image source={{ uri: video.thumbnailUrl }} style={styles.contentThumb} />
                ) : (
                  <View style={[styles.contentThumb, { backgroundColor: video.placeholderColor }]}>
                    <IconSymbol name="play.fill" size={16} color="rgba(255,255,255,0.7)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.contentTitle}>{video.title}</ThemedText>
                  {video.status !== 'ready' && (
                    <ThemedText style={styles.statusText}>{video.status}</ThemedText>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Rewards ({project.rewards.length})
        </ThemedText>
        {project.rewards.length === 0 && pendingRewardIds.length === 0 ? (
          <ThemedText style={styles.empty}>No rewards yet. Add rewards for your backers!</ThemedText>
        ) : (
          project.rewards.map((reward) => {
            const isPending =
              isTempId(reward.id) || pendingRewardIds.includes(reward.id);
            return (
              <View key={reward.id} style={[styles.rewardCard, { borderColor: textColor + '15' }]}>
                <View style={styles.rewardHeader}>
                  <IconSymbol name="gift.fill" size={16} color={Brand.warning} />
                  <ThemedText style={styles.rewardTitle}>{reward.title}</ThemedText>
                  {isPending ? <PendingIndicator size={10} /> : null}
                </View>
                <ThemedText style={styles.rewardDesc}>{reward.description}</ThemedText>
                {reward.fileName && (
                  <View style={styles.rewardFile}>
                    <IconSymbol name="arrow.down.circle.fill" size={14} color={Brand.primary} />
                    <ThemedText style={styles.rewardFileName}>{reward.fileName}</ThemedText>
                  </View>
                )}
                <ThemedText style={styles.rewardMin}>Min. {reward.minDonation} credits</ThemedText>
              </View>
            );
          })
        )}
      </ThemedView>
    </ScrollView>
  );
}

function CampaignDetailSkeleton() {
  return (
    <ScrollView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <SkeletonText size="title" width={80} />
            <SkeletonText size="small" width={90} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <SkeletonText size="title" width={60} />
            <SkeletonText size="small" width={70} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <SkeletonText size="title" width={70} />
            <SkeletonText size="small" width={60} />
          </View>
        </View>
        <View style={styles.progressRow}>
          <Skeleton height={6} radius={3} />
          <SkeletonText size="small" width="40%" />
        </View>
        <SkeletonText width="95%" />
        <SkeletonText width="80%" />
        <View style={styles.actionRow}>
          <Skeleton width="48%" height={48} radius={10} />
          <Skeleton width="48%" height={48} radius={10} />
        </View>
        <SkeletonText size="title" width="40%" style={{ marginTop: 8 }} />
        <VideoTileSkeleton />
        <VideoTileSkeleton />
        <SkeletonText size="title" width="40%" style={{ marginTop: 8 }} />
        <RewardSkeleton />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Brand.primarySoft,
    borderRadius: Radius.lg,
    padding: 18,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: Fonts.displayBold, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { fontFamily: Fonts.sansMedium, fontSize: 12, opacity: 0.6, marginTop: 2 },
  divider: { width: 1, backgroundColor: 'rgba(109,94,249,0.25)' },
  progressRow: { gap: 6 },
  goalText: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.55 },
  description: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, opacity: 0.75 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Brand.primary,
    padding: 14,
    borderRadius: Radius.md,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  actionDisabled: { opacity: 0.5 },
  actionText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.primarySoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
  },
  pendingText: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.75 },
  sectionTitle: { marginTop: 8 },
  empty: { fontFamily: Fonts.sans, opacity: 0.45, fontSize: 14 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  contentThumb: {
    width: 60,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTitle: { fontFamily: Fonts.sansMedium, fontSize: 14 },
  statusText: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.55, marginTop: 2, textTransform: 'capitalize' },
  rewardCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 4,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardTitle: { fontFamily: Fonts.displayBold, fontWeight: '700', fontSize: 14, flex: 1 },
  rewardDesc: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.65 },
  rewardFile: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardFileName: { fontFamily: Fonts.sansMedium, fontSize: 12, color: Brand.primary },
  rewardMin: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.45 },
});
