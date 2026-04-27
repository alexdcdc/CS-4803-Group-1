import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as api from '@/services/api-client';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

export default function UploadContentScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { refresh } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  const pickVideo = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission to access media library was denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setAsset(result.assets[0]);
      setError(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!campaignId || !title.trim() || !asset) return;
    setPhase('uploading');
    setError(null);
    try {
      const { video, uploadUrl } = await api.createVideoUpload(campaignId, title.trim());
      await api.putVideoFile(uploadUrl, asset.uri, asset.mimeType ?? undefined);

      setPhase('processing');
      const start = Date.now();
      while (Date.now() - start < POLL_TIMEOUT_MS) {
        const current = await api.getProjectVideo(campaignId, video.id);
        if (current.status === 'ready') break;
        if (current.status === 'errored' || current.status === 'cancelled') {
          throw new Error(`Mux reported status: ${current.status}`);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      await refresh();
      setPhase('done');
      setTimeout(() => router.back(), 800);
    } catch (e: unknown) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  }, [asset, campaignId, refresh, router, title]);

  const busy = phase === 'uploading' || phase === 'processing';
  const canUpload = !busy && !!asset && !!title.trim();

  const statusText = (() => {
    if (phase === 'uploading') return 'Uploading to Mux…';
    if (phase === 'processing') return 'Mux is encoding your video…';
    if (phase === 'done') return 'Ready!';
    return null;
  })();

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.videoPicker} onPress={pickVideo} disabled={busy}>
        {asset ? (
          <>
            {/* expo-image-picker returns a `uri` we can render as a poster */}
            <Image source={{ uri: asset.uri }} style={styles.preview} />
            <ThemedText style={styles.pickerHint}>Tap to replace</ThemedText>
          </>
        ) : (
          <>
            <IconSymbol name="arrow.up.doc.fill" size={40} color="rgba(128,128,128,0.5)" />
            <ThemedText style={styles.pickerText}>Tap to select video</ThemedText>
          </>
        )}
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
        editable={!busy}
      />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      {phase === 'done' ? (
        <View style={styles.successRow}>
          <IconSymbol name="checkmark.circle.fill" size={24} color={Brand.success} />
          <ThemedText style={styles.successText}>Uploaded successfully!</ThemedText>
        </View>
      ) : (
        <Pressable
          style={[styles.uploadButton, !canUpload && { opacity: 0.5 }]}
          onPress={handleUpload}
          disabled={!canUpload}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <IconSymbol name="arrow.up.doc.fill" size={20} color="#fff" />
          )}
          <ThemedText style={styles.uploadText}>
            {statusText ?? 'Upload Video'}
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
    borderColor: 'rgba(109,94,249,0.35)',
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    backgroundColor: Brand.primarySoft,
  },
  preview: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  pickerText: { fontFamily: Fonts.sansMedium, fontSize: 16, opacity: 0.6 },
  pickerHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  label: { marginTop: 24 },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 16,
    marginTop: 6,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    marginTop: 32,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  uploadText: { fontFamily: Fonts.displayBold, color: '#fff', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    justifyContent: 'center',
  },
  successText: { fontFamily: Fonts.displayBold, color: Brand.success, fontWeight: '700', fontSize: 16 },
  error: { color: Brand.error, fontSize: 13, marginTop: 12 },
});
