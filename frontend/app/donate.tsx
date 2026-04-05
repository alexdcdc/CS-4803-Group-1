import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Project, Reward } from '@/data/types';
import * as api from '@/services/api-client';

const AMOUNTS = [10, 25, 50, 100];

export default function DonateScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user, donate } = useApp();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState(25);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'insufficient'>('idle');
  const [unlockedRewards, setUnlockedRewards] = useState<Reward[]>([]);

  useEffect(() => {
    if (projectId) {
      api.getProject(projectId).then((p) => p && setProject(p));
    }
  }, [projectId]);

  const handleDonate = async () => {
    if (!projectId) return;
    setStatus('loading');
    const result = await donate(projectId, selected);
    if (result.success) {
      setUnlockedRewards(result.rewardsUnlocked);
      setStatus('success');
    } else {
      setStatus('insufficient');
    }
  };

  if (status === 'success') {
    return (
      <ThemedView style={styles.container}>
        <IconSymbol name="checkmark.circle.fill" size={64} color="#22c55e" />
        <ThemedText type="title" style={styles.successTitle}>
          Thank you!
        </ThemedText>
        <ThemedText style={styles.successSub}>
          You donated {selected} credits to {project?.title ?? 'this project'}
        </ThemedText>

        {unlockedRewards.length > 0 && (
          <View style={styles.rewardsSection}>
            <ThemedText type="subtitle" style={styles.rewardsTitle}>
              Rewards Unlocked!
            </ThemedText>
            {unlockedRewards.map((r) => (
              <View key={r.id} style={styles.rewardItem}>
                <IconSymbol name="gift.fill" size={18} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.rewardName}>{r.title}</ThemedText>
                  <ThemedText style={styles.rewardDesc}>{r.description}</ThemedText>
                  {r.fileName && (
                    <ThemedText style={styles.rewardFile}>{r.fileName}</ThemedText>
                  )}
                </View>
                <Pressable style={styles.downloadBtn} onPress={() => alert(`Downloading ${r.fileName ?? r.title}...`)}>
                  <IconSymbol name="arrow.down.circle.fill" size={22} color="#0a7ea4" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <ThemedText style={styles.doneText}>Done</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <IconSymbol name="heart.fill" size={48} color="#e11d48" />
      <ThemedText type="title" style={{ marginTop: 12 }}>
        Back this project
      </ThemedText>
      {project && (
        <ThemedText style={styles.projectName}>{project.title}</ThemedText>
      )}

      <View style={styles.balanceRow}>
        <ThemedText style={styles.balanceLabel}>Your balance:</ThemedText>
        <ThemedText style={styles.balanceValue}>
          {user?.creditBalance.toLocaleString() ?? 0} credits
        </ThemedText>
      </View>

      <ThemedText type="subtitle" style={styles.selectLabel}>
        Select amount
      </ThemedText>

      <View style={styles.amountRow}>
        {AMOUNTS.map((amt) => (
          <Pressable
            key={amt}
            style={[styles.amountBtn, selected === amt && styles.amountBtnSelected]}
            onPress={() => setSelected(amt)}>
            <ThemedText
              style={[styles.amountText, selected === amt && styles.amountTextSelected]}>
              {amt}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Available rewards preview */}
      {project && project.rewards.filter((r) => r.minDonation <= selected).length > 0 && (
        <View style={styles.rewardPreview}>
          <ThemedText style={styles.rewardPreviewTitle}>{"You'll unlock:"}</ThemedText>
          {project.rewards
            .filter((r) => r.minDonation <= selected)
            .map((r) => (
              <ThemedText key={r.id} style={styles.rewardPreviewItem}>
                • {r.title}
              </ThemedText>
            ))}
        </View>
      )}

      {status === 'insufficient' && (
        <ThemedText style={styles.error}>
          Insufficient credits. Please recharge first.
        </ThemedText>
      )}

      <Pressable
        style={[styles.confirmButton, status === 'loading' && { opacity: 0.6 }]}
        onPress={handleDonate}
        disabled={status === 'loading'}>
        <ThemedText style={styles.confirmText}>
          {status === 'loading' ? 'Processing...' : `Donate ${selected} Credits`}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  projectName: { fontSize: 16, opacity: 0.6, marginTop: 4 },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 15, opacity: 0.6 },
  balanceValue: { fontSize: 15, fontWeight: '700' },
  selectLabel: { marginTop: 24, marginBottom: 12 },
  amountRow: { flexDirection: 'row', gap: 12 },
  amountBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBtnSelected: {
    borderColor: '#e11d48',
    backgroundColor: 'rgba(225,29,72,0.1)',
  },
  amountText: { fontSize: 18, fontWeight: '600' },
  amountTextSelected: { color: '#e11d48' },
  error: { color: '#ef4444', marginTop: 12 },
  confirmButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  successTitle: { marginTop: 12 },
  successSub: { opacity: 0.6, marginTop: 4, textAlign: 'center' },
  rewardsSection: { marginTop: 24, width: '100%', gap: 8 },
  rewardsTitle: { marginBottom: 4 },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    padding: 12,
    borderRadius: 10,
  },
  rewardName: { fontWeight: '600', fontSize: 14 },
  rewardDesc: { fontSize: 12, opacity: 0.5 },
  rewardFile: { fontSize: 11, color: '#0a7ea4', marginTop: 2 },
  downloadBtn: { padding: 4 },
  rewardPreview: {
    marginTop: 16,
    width: '100%',
    backgroundColor: 'rgba(34,197,94,0.08)',
    padding: 12,
    borderRadius: 10,
  },
  rewardPreviewTitle: { fontWeight: '600', marginBottom: 4 },
  rewardPreviewItem: { fontSize: 14, opacity: 0.7 },
  doneButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
