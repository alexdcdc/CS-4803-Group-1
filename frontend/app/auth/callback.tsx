import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { supabase } from '@/services/api-client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

// How long to wait after the code exchange for the SDK to dispatch
// PASSWORD_RECOVERY (or for detectSessionInUrl to consume a URL fragment on web).
const EVENT_SETTLE_MS = 150;

function isRecoveryParam(value: unknown): boolean {
  if (value === 'recovery') return true;
  if (Array.isArray(value)) return value.includes('recovery');
  return false;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    type?: string;
    error_description?: string;
  }>();
  // Guard against re-running the (one-time) code exchange if React re-invokes
  // the effect (e.g. due to dep changes from Linking.useURL hydrating late).
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const recovery = { current: isRecoveryParam(params.type) };

    // Backup: re-parse the raw deep-link URL. Covers the case where
    // expo-router fails to surface a query param we set on redirect_to.
    Linking.getInitialURL()
      .then((url) => {
        if (!url || recovery.current) return;
        try {
          const parsed = Linking.parse(url);
          if (isRecoveryParam(parsed.queryParams?.type)) recovery.current = true;
        } catch {
          // Best effort — fall back to event detection.
        }
      })
      .catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') recovery.current = true;
    });

    (async () => {
      try {
        if (params.error_description) {
          if (!cancelled) {
            router.replace({
              pathname: '/(auth)/login',
              params: { error: String(params.error_description) },
            });
          }
          return;
        }
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
          if (error) {
            if (!cancelled) {
              router.replace({ pathname: '/(auth)/login', params: { error: error.message } });
            }
            return;
          }
        }
        // Give the SDK time to emit PASSWORD_RECOVERY (and to finish auto-detecting
        // any URL fragment session on web). A single tick is not reliably enough.
        await new Promise((resolve) => setTimeout(resolve, EVENT_SETTLE_MS));
        if (cancelled) return;
        router.replace(recovery.current ? '/reset-password' : '/(tabs)');
      } finally {
        subscription.unsubscribe();
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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
