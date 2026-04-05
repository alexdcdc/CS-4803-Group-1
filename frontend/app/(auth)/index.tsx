import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AuthEntryScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <IconSymbol name="play.fill" size={48} color="#fff" />
        </View>
        <ThemedText type="title" style={styles.appName}>
          QuickStarter
        </ThemedText>
        <ThemedText style={styles.tagline}>
          Fund creativity. Share your vision.
        </ThemedText>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}>
          <ThemedText style={styles.primaryText}>Create Account</ThemedText>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}>
          <ThemedText style={styles.secondaryText}>Log In</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 16,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 17,
  },
});
