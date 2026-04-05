import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function UploadContentScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { uploadContent } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle');

  const handleUpload = async () => {
    if (!campaignId || !title.trim()) return;
    setStatus('uploading');
    await uploadContent(campaignId, title.trim());
    setStatus('done');
    setTimeout(() => router.back(), 800);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Video picker placeholder */}
      <Pressable style={styles.videoPicker}>
        <IconSymbol name="arrow.up.doc.fill" size={40} color="rgba(128,128,128,0.5)" />
        <ThemedText style={styles.pickerText}>Tap to select video</ThemedText>
        <ThemedText style={styles.pickerHint}>(simulated for wireframe)</ThemedText>
      </Pressable>

      <ThemedText type="subtitle" style={styles.label}>
        Video Title
      </ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="e.g., Project Update #3"
        placeholderTextColor={textColor + '40'}
        value={title}
        onChangeText={setTitle}
      />

      {status === 'done' ? (
        <View style={styles.successRow}>
          <IconSymbol name="checkmark.circle.fill" size={24} color="#22c55e" />
          <ThemedText style={styles.successText}>Uploaded successfully!</ThemedText>
        </View>
      ) : (
        <Pressable
          style={[styles.uploadButton, (status === 'uploading' || !title.trim()) && { opacity: 0.5 }]}
          onPress={handleUpload}
          disabled={status === 'uploading' || !title.trim()}>
          <IconSymbol name="arrow.up.doc.fill" size={20} color="#fff" />
          <ThemedText style={styles.uploadText}>
            {status === 'uploading' ? 'Uploading...' : 'Upload Video'}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  videoPicker: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pickerText: { fontSize: 16, opacity: 0.5 },
  pickerHint: { fontSize: 12, opacity: 0.3 },
  label: { marginTop: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginTop: 6,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  uploadText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    justifyContent: 'center',
  },
  successText: { color: '#22c55e', fontWeight: '600', fontSize: 16 },
});
