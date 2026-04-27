import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Skeleton, SkeletonText } from '@/components/skeleton';
import { Brand, Colors, Fonts, Radius } from '@/constants/theme';
import { Project, Reward } from '@/data/types';
import * as api from '@/services/api-client';

const AMOUNTS = [10, 25, 50, 100];
const MIN_DONATION = 1;

export default function DonateScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user, projects, donate } = useApp();
  const router = useRouter();

  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const fromContext = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const [project, setProject] = useState<Project | null>(fromContext ?? null);
  const [selected, setSelected] = useState(25);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [view, setView] = useState<'pick' | 'success'>('pick');
  const [predictedUnlocks, setPredictedUnlocks] = useState<Reward[]>([]);

  const balance = user?.creditBalance ?? 0;

  const customCredits = useMemo(() => {
    const parsed = parseInt(customInput, 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [customInput]);

  const customValid =
    customMode && Number.isFinite(customCredits) && customCredits >= MIN_DONATION && customCredits <= balance;

  const amount = customMode ? (customValid ? customCredits : 0) : selected;

  // Re-sync from context (e.g. after donations reconcile reward list).
  useEffect(() => {
    if (fromContext) setProject(fromContext);
  }, [fromContext]);

  // Background fetch in case the project isn't in context yet.
  useEffect(() => {
    if (!projectId || fromContext) return;
    let cancelled = false;
    api.getProject(projectId).then((p) => {
      if (!cancelled && p) setProject(p);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, fromContext]);

  const insufficient = amount > 0 && balance < amount;
  const priorBackingTotal = useMemo(() => {
    if (!project || !user) return 0;
    return user.transactions
      .filter((t) => t.type === 'donation' && t.label.includes(project.title))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [project, user]);
  const cantSubmit = amount <= 0 || insufficient;

  const handleDonate = async () => {
    if (!projectId || !project || cantSubmit) return;

    // Predict the rewards the user will unlock so we can show them on the
    // success screen immediately. The server is authoritative; on response
    // we replace this with the real list.
    const predicted = project.rewards.filter((r) => r.minDonation <= amount);
    setPredictedUnlocks(predicted);
    setView('success');

    // Fire and forget: context applies optimistic balance/raisedCredits and
    // reverts on failure (with toast).
    donate(projectId, amount).then((result) => {
      if (result.success && result.rewardsUnlocked.length > 0) {
        setPredictedUnlocks(result.rewardsUnlocked);
      }
    });
  };

  if (view === 'success') {
    return (
      <ThemedView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <IconSymbol name="checkmark.circle.fill" size={64} color={Brand.success} />
        </View>
        <ThemedText type="title" style={styles.successTitle}>
          Thank you!
        </ThemedText>
        <ThemedText style={styles.successSub}>
          You donated {amount} credits to {project?.title ?? 'this project'}
        </ThemedText>

        {predictedUnlocks.length > 0 && (
          <View style={styles.rewardsSection}>
            <ThemedText type="subtitle" style={styles.rewardsTitle}>
              Rewards Unlocked!
            </ThemedText>
            {predictedUnlocks.map((r) => (
              <View key={r.id} style={styles.rewardItem}>
                <IconSymbol name="gift.fill" size={18} color={Brand.warning} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.rewardName}>{r.title}</ThemedText>
                  <ThemedText style={styles.rewardDesc}>{r.description}</ThemedText>
                  {r.fileName && (
                    <ThemedText style={styles.rewardFile}>{r.fileName}</ThemedText>
                  )}
                </View>
                <Pressable
                  style={styles.downloadBtn}
                  onPress={() => alert(`Downloading ${r.fileName ?? r.title}...`)}>
                  <IconSymbol name="arrow.down.circle.fill" size={22} color={Brand.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <ThemedText style={styles.doneText}>Done</ThemedText>
        </Pressable>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
      <View style={styles.heartCircle}>
        <IconSymbol name="heart.fill" size={36} color="#fff" />
      </View>
      <ThemedText type="title" style={{ marginTop: 12 }}>
        Back this project
      </ThemedText>
      {project ? (
        <ThemedText style={styles.projectName}>{project.title}</ThemedText>
      ) : (
        <SkeletonText width={160} style={{ marginTop: 6 }} />
      )}

      <View style={styles.balanceRow}>
        <ThemedText style={styles.balanceLabel}>Your balance:</ThemedText>
        <ThemedText style={styles.balanceValue}>
          {user?.creditBalance.toLocaleString() ?? 0} credits
        </ThemedText>
      </View>

      {priorBackingTotal > 0 && (
        <View style={styles.priorBackingNote}>
          <IconSymbol name="heart.fill" size={16} color={Brand.accent} />
          <ThemedText style={styles.priorBackingText}>
            You&apos;ve already backed {priorBackingTotal.toLocaleString()} credits to this project
          </ThemedText>
        </View>
      )}

      <ThemedText type="subtitle" style={styles.selectLabel}>
        Select amount
      </ThemedText>

      <View style={styles.amountRow}>
        {AMOUNTS.map((amt) => {
          const isSelected = !customMode && selected === amt;
          return (
            <Pressable
              key={amt}
              style={[styles.amountBtn, isSelected && styles.amountBtnSelected]}
              onPress={() => {
                setCustomMode(false);
                setSelected(amt);
              }}>
              <ThemedText style={[styles.amountText, isSelected && styles.amountTextSelected]}>
                {amt}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.amountBtn, customMode && styles.amountBtnSelected]}
          onPress={() => setCustomMode(true)}>
          <IconSymbol
            name="pencil"
            size={22}
            color={customMode ? Brand.accent : palette.icon}
          />
          <ThemedText
            style={[styles.amountCustomLabel, customMode && styles.amountTextSelected]}>
            Custom
          </ThemedText>
        </Pressable>
      </View>

      {customMode && (
        <View style={styles.customRow}>
          <TextInput
            value={customInput}
            onChangeText={(t) => setCustomInput(t.replace(/[^0-9]/g, ''))}
            placeholder="Enter credits"
            placeholderTextColor={palette.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            autoFocus
            style={[
              styles.customInput,
              {
                color: palette.text,
                backgroundColor: palette.surface,
                borderColor: customValid ? Brand.accent : palette.border,
              },
            ]}
          />
          <ThemedText style={styles.customHint}>
            {customInput.length === 0
              ? `You have ${balance.toLocaleString()} credits available`
              : !Number.isFinite(customCredits) || customCredits < MIN_DONATION
                ? `Minimum donation is ${MIN_DONATION} credit`
                : customCredits > balance
                  ? `Only ${balance.toLocaleString()} credits available`
                  : `Donating ${customCredits.toLocaleString()} credits`}
          </ThemedText>
        </View>
      )}

      {project ? (
        amount > 0 && project.rewards.filter((r) => r.minDonation <= amount).length > 0 && (
          <View style={styles.rewardPreview}>
            <ThemedText style={styles.rewardPreviewTitle}>{"You'll unlock:"}</ThemedText>
            {project.rewards
              .filter((r) => r.minDonation <= amount)
              .map((r) => (
                <ThemedText key={r.id} style={styles.rewardPreviewItem}>
                  • {r.title}
                </ThemedText>
              ))}
          </View>
        )
      ) : (
        <View style={[styles.rewardPreview, { opacity: 0.4 }]}>
          <SkeletonText width="40%" />
          <Skeleton height={10} width="80%" />
        </View>
      )}

      {insufficient && (
        <ThemedText style={styles.error}>
          Insufficient credits. Please recharge first.
        </ThemedText>
      )}

      <Pressable
        style={[styles.confirmButton, (cantSubmit || !project) && { opacity: 0.5 }]}
        onPress={handleDonate}
        disabled={cantSubmit || !project}>
        <ThemedText style={styles.confirmText}>
          {amount > 0 ? `Donate ${amount.toLocaleString()} Credits` : 'Enter an amount'}
        </ThemedText>
      </Pressable>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  heartCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: Brand.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16,211,156,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectName: { fontFamily: Fonts.sans, fontSize: 16, opacity: 0.65, marginTop: 6 },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
    alignItems: 'center',
  },
  balanceLabel: { fontFamily: Fonts.sans, fontSize: 15, opacity: 0.6 },
  balanceValue: { fontFamily: Fonts.displayBold, fontSize: 15, fontWeight: '700' },
  priorBackingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,79,163,0.3)',
    width: '100%',
  },
  priorBackingText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    flex: 1,
  },
  selectLabel: { marginTop: 26, marginBottom: 14, alignSelf: 'flex-start' },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  amountBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBtnSelected: {
    borderColor: Brand.accent,
    backgroundColor: Brand.accentSoft,
  },
  amountText: { fontFamily: Fonts.displayBold, fontSize: 19, fontWeight: '700' },
  amountCustomLabel: { fontFamily: Fonts.sansMedium, fontSize: 11, marginTop: 2, opacity: 0.7 },
  amountTextSelected: { color: Brand.accent, opacity: 1 },
  customRow: {
    width: '100%',
    marginTop: 18,
    gap: 8,
    alignItems: 'center',
  },
  customInput: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 2,
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  customHint: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.6 },
  error: { color: Brand.error, marginTop: 12 },
  confirmButton: {
    backgroundColor: Brand.accent,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 999,
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: Brand.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
  successTitle: { marginTop: 16 },
  successSub: { fontFamily: Fonts.sans, opacity: 0.65, marginTop: 6, textAlign: 'center' },
  rewardsSection: { marginTop: 24, width: '100%', gap: 10 },
  rewardsTitle: { marginBottom: 4 },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.warningSoft,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  rewardName: { fontFamily: Fonts.displayBold, fontWeight: '700', fontSize: 14 },
  rewardDesc: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.55 },
  rewardFile: { fontFamily: Fonts.sansMedium, fontSize: 11, color: Brand.primary, marginTop: 2 },
  downloadBtn: { padding: 4 },
  rewardPreview: {
    marginTop: 18,
    width: '100%',
    backgroundColor: Brand.secondarySoft,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  rewardPreviewTitle: { fontFamily: Fonts.displayBold, fontWeight: '700', marginBottom: 4, color: Brand.secondary },
  rewardPreviewItem: { fontFamily: Fonts.sans, fontSize: 14, opacity: 0.8 },
  doneButton: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 999,
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  doneText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
});
