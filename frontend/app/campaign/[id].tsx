import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    // Re-read from context when projects change (after upload/reward add)
    const found = projects.find((p) => p.id === id);
    if (found) setProject(found);
  }, [id, projects]);

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
        {/* Stats header */}
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
          <ProgressBar progress={progress} trackColor={textColor + '15'} fillColor="#22c55e" />
          <ThemedText style={styles.goalText}>
            Goal: {project.goalCredits.toLocaleString()} credits
          </ThemedText>
        </View>

        {/* Description */}
        <ThemedText style={styles.description}>{project.description}</ThemedText>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              router.push({ pathname: '/upload-content', params: { campaignId: project.id } })
            }>
            <IconSymbol name="arrow.up.doc.fill" size={22} color="#fff" />
            <ThemedText style={styles.actionText}>Upload Content</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
            onPress={() =>
              router.push({ pathname: '/add-reward', params: { campaignId: project.id } })
            }>
            <IconSymbol name="gift.fill" size={22} color="#fff" />
            <ThemedText style={styles.actionText}>Add Reward</ThemedText>
          </Pressable>
        </View>

        {/* Content list */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Content ({project.videos.length})
        </ThemedText>
        {project.videos.length === 0 ? (
          <ThemedText style={styles.empty}>No content yet. Upload your first video!</ThemedText>
        ) : (
          project.videos.map((video) => (
            <View key={video.id} style={styles.contentRow}>
              <View style={[styles.contentThumb, { backgroundColor: video.placeholderColor }]}>
                <IconSymbol name="play.fill" size={16} color="rgba(255,255,255,0.7)" />
              </View>
              <ThemedText style={styles.contentTitle}>{video.title}</ThemedText>
            </View>
          ))
        )}

        {/* Rewards list */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Rewards ({project.rewards.length})
        </ThemedText>
        {project.rewards.length === 0 ? (
          <ThemedText style={styles.empty}>No rewards yet. Add rewards for your backers!</ThemedText>
        ) : (
          project.rewards.map((reward) => (
            <View key={reward.id} style={[styles.rewardCard, { borderColor: textColor + '15' }]}>
              <View style={styles.rewardHeader}>
                <IconSymbol name="gift.fill" size={16} color="#f59e0b" />
                <ThemedText style={styles.rewardTitle}>{reward.title}</ThemedText>
              </View>
              <ThemedText style={styles.rewardDesc}>{reward.description}</ThemedText>
              {reward.fileName && (
                <View style={styles.rewardFile}>
                  <IconSymbol name="arrow.down.circle.fill" size={14} color="#0a7ea4" />
                  <ThemedText style={styles.rewardFileName}>{reward.fileName}</ThemedText>
                </View>
              )}
              <ThemedText style={styles.rewardMin}>Min. {reward.minDonation} credits</ThemedText>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 12,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  divider: { width: 1, backgroundColor: 'rgba(128,128,128,0.2)' },
  progressRow: { gap: 4 },
  goalText: { fontSize: 13, opacity: 0.5 },
  description: { fontSize: 15, lineHeight: 22, opacity: 0.7 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0a7ea4',
    padding: 14,
    borderRadius: 10,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { marginTop: 8 },
  empty: { opacity: 0.4, fontSize: 14 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  contentThumb: {
    width: 60,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTitle: { fontSize: 14, flex: 1 },
  rewardCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardTitle: { fontWeight: '600', fontSize: 14 },
  rewardDesc: { fontSize: 13, opacity: 0.6 },
  rewardFile: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardFileName: { fontSize: 12, color: '#0a7ea4' },
  rewardMin: { fontSize: 12, opacity: 0.4 },
});
