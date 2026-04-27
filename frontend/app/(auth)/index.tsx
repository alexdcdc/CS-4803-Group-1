import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';

export default function AuthEntryScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <View style={styles.logoInner}>
            <IconSymbol name="play.fill" size={44} color="#fff" />
          </View>
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
    marginBottom: 56,
  },
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: Brand.accent,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  appName: {
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontFamily: Fonts.sans,
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 16,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Brand.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryText: {
    fontFamily: Fonts.displayBold,
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: Brand.primary,
    paddingVertical: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: Fonts.displayBold,
    color: Brand.primary,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
