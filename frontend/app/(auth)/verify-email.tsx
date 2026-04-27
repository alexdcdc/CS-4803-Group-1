import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import * as api from '@/services/api-client';
import { useToast } from '@/components/toast/toast-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const result = await api.resendSignupEmail(email);
    setResending(false);
    if (result.success) {
      toast.show('Verification email sent', 'success');
    } else {
      toast.show(result.error ?? 'Could not resend email', 'error');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <IconSymbol name="envelope.fill" size={48} color="#0a7ea4" />
        </View>
        <ThemedText type="title" style={styles.successTitle}>
          Check Your Email
        </ThemedText>
        <ThemedText style={styles.successDesc}>
          {"We've sent a verification link to "}
          {email ? <ThemedText style={styles.emailHighlight}>{email}</ThemedText> : null}
          {'. Click the link to activate your account, then log in.'}
        </ThemedText>

        <Pressable style={styles.submitButton} onPress={() => router.replace('/(auth)/login')}>
          <ThemedText style={styles.submitText}>Back to Login</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleResend}
          disabled={resending || !email}
          style={styles.resendButton}>
          {resending ? (
            <ActivityIndicator color="#0a7ea4" />
          ) : (
            <ThemedText style={styles.resendText}>Resend email</ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  successCircle: {
    marginBottom: 8,
  },
  successTitle: {
    textAlign: 'center',
  },
  successDesc: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    fontWeight: '600',
    opacity: 1,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  resendButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  resendText: {
    color: '#0a7ea4',
    fontWeight: '600',
    fontSize: 15,
  },
});
