import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
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

  const isValid = title.trim().length > 0 && description.trim().length > 0 && Number(minDonation) > 0;

  const handlePickFile = () => {
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

  const handleAdd = () => {
    if (!isValid || !campaignId) return;
    // Fire and forget — context appends a temp reward immediately, swaps in
    // the real one once the API resolves, and shows a toast on failure.
    addReward(campaignId, {
      title: title.trim(),
      description: description.trim(),
      minDonation: Number(minDonation),
      fileName: fileName || undefined,
    }).catch(() => {});
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
            <IconSymbol name="checkmark.circle.fill" size={20} color={Brand.success} />
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
              <IconSymbol name="xmark" size={16} color={Brand.error} />
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
        style={[styles.addButton, !isValid && { opacity: 0.5 }]}
        onPress={handleAdd}
        disabled={!isValid}>
        <ThemedText style={styles.addText}>Add Reward</ThemedText>
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
  textArea: { height: 80 },
  filePicker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    marginTop: 6,
    overflow: 'hidden',
  },
  fileEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    gap: 6,
  },
  filePickerText: { fontFamily: Fonts.sansMedium, fontSize: 15, opacity: 0.6 },
  filePickerHint: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.4 },
  fileAttached: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontFamily: Fonts.sansMedium, fontSize: 15, fontWeight: '600' },
  fileHint: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.4 },
  removeFile: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: Brand.warning,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: Brand.warning,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  addText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
});
