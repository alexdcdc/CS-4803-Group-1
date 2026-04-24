import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MockVideoPlayer } from '@/components/mock-video-player';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';
import * as api from '@/services/api-client';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (id) api.getProject(id).then((p) => p && setProject(p));
  }, [id]);

  if (!project) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;

  return (
    <ScrollView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Hero video */}
        <MockVideoPlayer
          color={project.videos[0]?.placeholderColor ?? '#333'}
          height={240}
          videoUrl={project.videos[0]?.videoUrl}
          thumbnailUrl={project.videos[0]?.thumbnailUrl}
          status={project.videos[0]?.status}
        />

        <View style={styles.content}>
          <ThemedText type="title">{project.title}</ThemedText>
          <ThemedText style={styles.creator}>by {project.creatorName}</ThemedText>

          {/* Progress */}
          <View style={styles.progressSection}>
            <ProgressBar progress={progress} trackColor={textColor + '15'} fillColor="#22c55e" />
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

          {/* Description */}
          <ThemedText style={styles.description}>{project.description}</ThemedText>

          {/* Rewards */}
          {project.rewards.length > 0 && (
            <View style={styles.rewardsSection}>
              <ThemedText type="subtitle">Rewards</ThemedText>
              {project.rewards.map((reward) => (
                <View key={reward.id} style={[styles.rewardCard, { borderColor: textColor + '15' }]}>
                  <View style={styles.rewardHeader}>
                    <IconSymbol name="gift.fill" size={18} color="#f59e0b" />
                    <ThemedText style={styles.rewardTitle}>{reward.title}</ThemedText>
                  </View>
                  <ThemedText style={styles.rewardDesc}>{reward.description}</ThemedText>
                  {reward.fileName && (
                    <View style={styles.rewardFile}>
                      <IconSymbol name="arrow.down.circle.fill" size={14} color="#0a7ea4" />
                      <ThemedText style={styles.rewardFileName}>{reward.fileName}</ThemedText>
                    </View>
                  )}
                  <ThemedText style={styles.rewardMin}>Min. donation: {reward.minDonation} credits</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Videos */}
          {project.videos.length > 1 && (
            <View style={styles.videosSection}>
              <ThemedText type="subtitle">More Videos</ThemedText>
              {project.videos.slice(1).map((video) => (
                <View key={video.id} style={styles.videoRow}>
                  <View style={[styles.videoThumb, { backgroundColor: video.placeholderColor }]}>
                    <IconSymbol name="play.fill" size={16} color="rgba(255,255,255,0.7)" />
                  </View>
                  <ThemedText style={styles.videoTitle}>{video.title}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Donate CTA */}
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
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardTitle: { fontWeight: '600', fontSize: 15 },
  rewardDesc: { fontSize: 13, opacity: 0.6 },
  rewardFile: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardFileName: { fontSize: 12, color: '#0a7ea4' },
  rewardMin: { fontSize: 12, opacity: 0.4 },
  videosSection: { gap: 8, marginTop: 8 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoThumb: {
    width: 60,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: { fontSize: 14 },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e11d48',
    padding: 16,
    borderRadius: 24,
    marginTop: 12,
  },
  donateText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
