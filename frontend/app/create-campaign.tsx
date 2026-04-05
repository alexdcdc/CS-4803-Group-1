import { Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function CreateCampaignScreen() {
  const { createCampaign } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = title.trim().length > 0 && description.trim().length > 0 && Number(goal) > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    setLoading(true);
    await createCampaign({
      title: title.trim(),
      description: description.trim(),
      goalCredits: Number(goal),
    });
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
        style={[styles.createButton, (!isValid || loading) && { opacity: 0.5 }]}
        onPress={handleCreate}
        disabled={!isValid || loading}>
        <ThemedText style={styles.createText}>
          {loading ? 'Creating...' : 'Create Campaign'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 4 },
  label: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginTop: 6,
  },
  textArea: { height: 100 },
  createButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  createText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
