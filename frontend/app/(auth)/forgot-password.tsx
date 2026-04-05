import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setSubmitting(true);
    const result = await forgotPassword(email.trim());
    setSubmitting(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? 'Something went wrong');
    }
  };

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <IconSymbol name="checkmark.circle.fill" size={48} color="#22c55e" />
          </View>
          <ThemedText type="title" style={styles.successTitle}>
            Check Your Email
          </ThemedText>
          <ThemedText style={styles.successDesc}>
            {"We've sent password reset instructions to "}
            <ThemedText style={styles.emailHighlight}>{email}</ThemedText>
          </ThemedText>
          <Pressable style={styles.submitButton} onPress={() => router.replace('/(auth)/login')}>
            <ThemedText style={styles.submitText}>Back to Login</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={textColor} />
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        Reset Password
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        {"Enter your email and we'll send you instructions to reset your password."}
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <View style={styles.inputRow}>
            <IconSymbol name="envelope.fill" size={18} color="rgba(128,128,128,0.6)" />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="you@example.com"
              placeholderTextColor="rgba(128,128,128,0.5)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </View>

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.submitText}>Send Reset Link</ThemedText>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>Remember your password? </ThemedText>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <ThemedText style={styles.footerLink}>Log In</ThemedText>
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
  backButton: {
    marginBottom: 24,
    width: 40,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.5,
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    opacity: 0.5,
    fontSize: 15,
  },
  footerLink: {
    color: '#0a7ea4',
    fontWeight: '600',
    fontSize: 15,
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
  },
  emailHighlight: {
    fontWeight: '600',
    opacity: 1,
  },
});
