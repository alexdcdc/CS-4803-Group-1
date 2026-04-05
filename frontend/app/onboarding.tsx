import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UserRole } from '@/data/types';

export default function OnboardingScreen() {
  const { setUserRole } = useApp();
  const router = useRouter();

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
        <Pressable style={styles.card} onPress={() => handleSelect('backer')}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
            <IconSymbol name="heart.fill" size={36} color="#3b82f6" />
          </View>
          <ThemedText style={styles.cardTitle}>{"I'm a Backer"}</ThemedText>
          <ThemedText style={styles.cardDesc}>
            Discover and support creative projects you love
          </ThemedText>
        </Pressable>

        <Pressable style={styles.card} onPress={() => handleSelect('creator')}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <IconSymbol name="paintbrush.fill" size={36} color="#22c55e" />
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
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 32,
    fontSize: 16,
  },
  cards: {
    gap: 16,
  },
  card: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    opacity: 0.4,
    fontSize: 13,
    marginTop: 24,
  },
});
