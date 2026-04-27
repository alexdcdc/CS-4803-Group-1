import { Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function CreateCampaignScreen() {
  const { createCampaign } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');

  const isValid = title.trim().length > 0 && description.trim().length > 0 && Number(goal) > 0;

  const handleCreate = () => {
    if (!isValid) return;
    // Fire and forget — AppContext inserts the campaign optimistically and
    // surfaces a toast on failure, so we close the modal immediately.
    createCampaign({
      title: title.trim(),
      description: description.trim(),
      goalCredits: Number(goal),
    }).catch(() => {});
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.label}>
        Campaign Title
      </ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="e.g., My Awesome Project"
        placeholderTextColor={textColor + '40'}
        value={title}
        onChangeText={setTitle}
      />

      <ThemedText type="subtitle" style={styles.label}>
        Description
      </ThemedText>
      <TextInput
        style={[styles.input, styles.textArea, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="Tell backers about your project..."
        placeholderTextColor={textColor + '40'}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <ThemedText type="subtitle" style={styles.label}>
        Funding Goal (credits)
      </ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="e.g., 5000"
        placeholderTextColor={textColor + '40'}
        value={goal}
        onChangeText={setGoal}
        keyboardType="numeric"
      />

      <Pressable
        style={[styles.createButton, !isValid && { opacity: 0.5 }]}
        onPress={handleCreate}
        disabled={!isValid}>
        <ThemedText style={styles.createText}>Create Campaign</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 4 },
  label: { marginTop: 16 },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 16,
    marginTop: 6,
  },
  textArea: { height: 100 },
  createButton: {
    backgroundColor: Brand.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  createText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
});
