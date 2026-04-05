import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AddRewardScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { addReward } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minDonation, setMinDonation] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = title.trim().length > 0 && description.trim().length > 0 && Number(minDonation) > 0;

  const handlePickFile = () => {
    // Simulated file picker for wireframe
    const mockFiles = [
      'wallpapers-hd.zip',
      'sheet-music-bundle.pdf',
      'bonus-tracks.zip',
      'exclusive-ebook.pdf',
      'design-assets.zip',
    ];
    const picked = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setFileName(picked);
  };

  const handleAdd = async () => {
    if (!isValid || !campaignId) return;
    setLoading(true);
    await addReward(campaignId, {
      title: title.trim(),
      description: description.trim(),
      minDonation: Number(minDonation),
      fileName: fileName || undefined,
    });
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.label}>
        Reward Title
      </ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="e.g., Desktop Wallpaper Pack"
        placeholderTextColor={textColor + '40'}
        value={title}
        onChangeText={setTitle}
      />

      <ThemedText type="subtitle" style={styles.label}>
        Description
      </ThemedText>
      <TextInput
        style={[styles.input, styles.textArea, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="Describe what the backer will receive..."
        placeholderTextColor={textColor + '40'}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <ThemedText type="subtitle" style={styles.label}>
        Minimum Donation (credits)
      </ThemedText>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: textColor + '30' }]}
        placeholder="e.g., 25"
        placeholderTextColor={textColor + '40'}
        value={minDonation}
        onChangeText={setMinDonation}
        keyboardType="numeric"
      />

      <ThemedText type="subtitle" style={styles.label}>
        Digital Content
      </ThemedText>
      <Pressable
        style={[styles.filePicker, { borderColor: textColor + '30' }]}
        onPress={handlePickFile}>
        {fileName ? (
          <View style={styles.fileAttached}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#22c55e" />
            <View style={styles.fileInfo}>
              <ThemedText style={styles.fileName}>{fileName}</ThemedText>
              <ThemedText style={styles.fileHint}>Tap to change file</ThemedText>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setFileName('');
              }}
              style={styles.removeFile}>
              <IconSymbol name="xmark" size={16} color="#ef4444" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.fileEmpty}>
            <IconSymbol name="arrow.up.doc.fill" size={28} color={textColor + '40'} />
            <ThemedText style={styles.filePickerText}>
              Tap to attach a file
            </ThemedText>
            <ThemedText style={styles.filePickerHint}>
              PDF, ZIP, MP3, images, etc.
            </ThemedText>
          </View>
        )}
      </Pressable>

      <Pressable
        style={[styles.addButton, (!isValid || loading) && { opacity: 0.5 }]}
        onPress={handleAdd}
        disabled={!isValid || loading}>
        <ThemedText style={styles.addText}>
          {loading ? 'Adding...' : 'Add Reward'}
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
  textArea: { height: 80 },
  filePicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  fileEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  filePickerText: { fontSize: 15, opacity: 0.5 },
  filePickerHint: { fontSize: 12, opacity: 0.3 },
  fileAttached: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '600' },
  fileHint: { fontSize: 12, opacity: 0.4 },
  removeFile: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  addText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
