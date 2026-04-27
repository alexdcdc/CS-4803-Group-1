import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MockVideoPlayer } from '@/components/mock-video-player';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RewardSkeleton, Skeleton, SkeletonText, VideoTileSkeleton } from '@/components/skeleton';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';
import * as api from '@/services/api-client';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { projects } = useApp();
  const textColor = useThemeColor({}, 'text');
  const isFocused = useIsFocused();

  const fromContext = id ? projects.find((p) => p.id === id) : undefined;
  const [project, setProject] = useState<Project | null>(fromContext ?? null);

  // Stay in sync with context (e.g. after a donation reconciles).
  useEffect(() => {
    if (fromContext) setProject(fromContext);
  }, [fromContext]);

  // Always refetch in the background so the detail screen ends up canonical
  // even if context only had the summary version.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getProject(id).then((p) => {
      if (!cancelled && p) setProject(p);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const openFeedAtIndex = (index: number) => {
    if (!project) return;
    if (!project.videos[index]) return;
    router.push({
      pathname: '/project-feed',
      params: { projectId: project.id, videoIndex: String(index) },
    });
  };

  if (!project) {
    return <ProjectDetailSkeleton textColor={textColor} />;
  }

  const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;
  const moreVideos = project.videos.slice(1);

  return (
    <ScrollView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <Pressable onPress={() => project.videos[0] && openFeedAtIndex(0)}>
          <MockVideoPlayer
            color={project.videos[0]?.placeholderColor ?? '#333'}
            height={240}
            videoUrl={project.videos[0]?.videoUrl}
            thumbnailUrl={project.videos[0]?.thumbnailUrl}
            status={project.videos[0]?.status}
            controls={false}
            active={isFocused}
          />
        </Pressable>

        <View style={styles.content}>
          <ThemedText type="title">{project.title}</ThemedText>
          <ThemedText style={styles.creator}>by {project.creatorName}</ThemedText>

          <View style={styles.progressSection}>
            <ProgressBar progress={progress} trackColor={Brand.primarySoft} fillColor={Brand.primary} height={6} />
            <View style={styles.statsRow}>
              <ThemedText style={styles.stat}>
                <ThemedText style={styles.statBold}>{project.raisedCredits.toLocaleString()}</ThemedText>
                {' / '}{project.goalCredits.toLocaleString()} credits
              </ThemedText>
              <ThemedText style={styles.stat}>
                <ThemedText style={styles.statBold}>{project.backerCount}</ThemedText> backers
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.description}>{project.description}</ThemedText>

          {project.rewards.length > 0 && (
            <View style={styles.rewardsSection}>
              <ThemedText type="subtitle">Rewards</ThemedText>
              {project.rewards.map((reward) => (
                <View key={reward.id} style={[styles.rewardCard, { borderColor: textColor + '15' }]}>
                  <View style={styles.rewardHeader}>
                    <IconSymbol name="gift.fill" size={18} color={Brand.warning} />
                    <ThemedText style={styles.rewardTitle}>{reward.title}</ThemedText>
                  </View>
                  <ThemedText style={styles.rewardDesc}>{reward.description}</ThemedText>
                  {reward.fileName && (
                    <View style={styles.rewardFile}>
                      <IconSymbol name="arrow.down.circle.fill" size={14} color={Brand.primary} />
                      <ThemedText style={styles.rewardFileName}>{reward.fileName}</ThemedText>
                    </View>
                  )}
                  <ThemedText style={styles.rewardMin}>Min. donation: {reward.minDonation} credits</ThemedText>
                </View>
              ))}
            </View>
          )}

          {moreVideos.length > 0 && (
            <View style={styles.videosSection}>
              <ThemedText type="subtitle">More Videos</ThemedText>
              {moreVideos.map((video, idx) => (
                <Pressable
                  key={video.id}
                  style={styles.videoRow}
                  onPress={() => openFeedAtIndex(idx + 1)}>
                  {video.thumbnailUrl ? (
                    <Image source={{ uri: video.thumbnailUrl }} style={styles.videoThumb} />
                  ) : (
                    <View style={[styles.videoThumb, styles.videoThumbFallback, { backgroundColor: video.placeholderColor }]}>
                      <IconSymbol name="play.fill" size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                  <ThemedText style={styles.videoTitle}>{video.title}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.donateButton}
            onPress={() => router.push({ pathname: '/donate', params: { projectId: project.id } })}>
            <IconSymbol name="heart.fill" size={20} color="#fff" />
            <ThemedText style={styles.donateText}>Back This Project</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

function ProjectDetailSkeleton({ textColor }: { textColor: string }) {
  return (
    <ScrollView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <Skeleton width="100%" height={240} radius={0} />
        <View style={styles.content}>
          <SkeletonText size="title" width="80%" />
          <SkeletonText size="small" width="40%" />
          <View style={styles.progressSection}>
            <Skeleton height={6} radius={3} />
            <View style={styles.statsRow}>
              <SkeletonText size="small" width="35%" />
              <SkeletonText size="small" width="25%" />
            </View>
          </View>
          <SkeletonText width="100%" />
          <SkeletonText width="92%" />
          <SkeletonText width="60%" />
          <View style={styles.rewardsSection}>
            <SkeletonText size="title" width="35%" />
            <RewardSkeleton />
            <RewardSkeleton />
          </View>
          <View style={styles.videosSection}>
            <SkeletonText size="title" width="40%" />
            <VideoTileSkeleton />
            <VideoTileSkeleton />
          </View>
          <Skeleton height={56} radius={28} style={{ marginTop: 16, backgroundColor: Brand.accentSoft, borderColor: textColor + '00' }} />
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  creator: { fontSize: 15, opacity: 0.6 },
  progressSection: { gap: 6, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { fontSize: 13, opacity: 0.6 },
  statBold: { fontWeight: '700', opacity: 1 },
  description: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  rewardsSection: { gap: 8, marginTop: 8 },
  rewardCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    gap: 4,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardTitle: { fontFamily: Fonts.displayBold, fontWeight: '700', fontSize: 15, letterSpacing: -0.2 },
  rewardDesc: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.6 },
  rewardFile: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardFileName: { fontFamily: Fonts.sansMedium, fontSize: 12, color: Brand.primary },
  rewardMin: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.45 },
  videosSection: { gap: 8, marginTop: 8 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoThumb: {
    width: 60,
    height: 40,
    borderRadius: 8,
  },
  videoThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: { fontFamily: Fonts.sansMedium, fontSize: 14 },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.accent,
    padding: 18,
    borderRadius: 999,
    marginTop: 16,
    shadowColor: Brand.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  donateText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
});
