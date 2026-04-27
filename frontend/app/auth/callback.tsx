import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/services/api-client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    type?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    const isRecovery = { current: params.type === 'recovery' };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') isRecovery.current = true;
    });

    (async () => {
      try {
        if (params.error_description) {
          router.replace({
            pathname: '/(auth)/login',
            params: { error: String(params.error_description) },
          });
          return;
        }
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
          if (error) {
            router.replace({ pathname: '/(auth)/login', params: { error: error.message } });
            return;
          }
        }
        // Give onAuthStateChange a tick to deliver PASSWORD_RECOVERY before we route.
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (isRecovery.current) {
          router.replace('/reset-password');
        } else {
          router.replace('/(tabs)');
        }
      } finally {
        subscription.unsubscribe();
      }
    })();
  }, [params.code, params.type, params.error_description, router]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={Brand.primary} />
      <ThemedText style={styles.text}>Signing you in…</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  text: {
    opacity: 0.6,
    fontSize: 15,
  },
});
