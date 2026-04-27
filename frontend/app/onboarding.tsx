import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { UserRole } from '@/data/types';

export default function OnboardingScreen() {
  const { setUserRole } = useApp();
  const router = useRouter();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const handleSelect = async (role: UserRole) => {
    await setUserRole(role);
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Welcome!
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        How do you plan to use the platform?
      </ThemedText>

      <View style={styles.cards}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: surface, borderColor: border },
            pressed && styles.cardPressed,
          ]}
          onPress={() => handleSelect('backer')}>
          <View style={[styles.iconCircle, { backgroundColor: Brand.accent }]}>
            <IconSymbol name="heart.fill" size={32} color="#fff" />
          </View>
          <ThemedText style={styles.cardTitle}>{"I'm a Backer"}</ThemedText>
          <ThemedText style={styles.cardDesc}>
            Discover and support creative projects you love
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: surface, borderColor: border },
            pressed && styles.cardPressed,
          ]}
          onPress={() => handleSelect('creator')}>
          <View style={[styles.iconCircle, { backgroundColor: Brand.primary }]}>
            <IconSymbol name="paintbrush.fill" size={32} color="#fff" />
          </View>
          <ThemedText style={styles.cardTitle}>{"I'm a Creator"}</ThemedText>
          <ThemedText style={styles.cardDesc}>
            Launch campaigns and share your work with the world
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.hint}>
        You can change this anytime from your dashboard.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 36,
    fontSize: 16,
  },
  cards: {
    gap: 14,
  },
  card: {
    alignItems: 'center',
    padding: 26,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    opacity: 0.65,
    textAlign: 'center',
  },
  hint: {
    fontFamily: Fonts.sans,
    textAlign: 'center',
    opacity: 0.45,
    fontSize: 13,
    marginTop: 28,
  },
});
