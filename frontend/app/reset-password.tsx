import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { supabase } from '@/services/api-client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!password || !confirmPassword) {
      setError('Please fill in both fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Set a New Password
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Choose a new password for your account.
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>New Password</ThemedText>
          <View style={styles.inputRow}>
            <IconSymbol name="lock.fill" size={18} color="rgba(128,128,128,0.6)" />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Enter new password"
              placeholderTextColor="rgba(128,128,128,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <Pressable onPress={() => setShowPassword((s) => !s)}>
              <IconSymbol
                name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                size={18}
                color="rgba(128,128,128,0.6)"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Confirm Password</ThemedText>
          <View style={styles.inputRow}>
            <IconSymbol name="lock.fill" size={18} color="rgba(128,128,128,0.6)" />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Re-enter new password"
              placeholderTextColor="rgba(128,128,128,0.5)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
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
            <ThemedText style={styles.submitText}>Save Password</ThemedText>
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
    color: Brand.error,
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
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
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: Fonts.displayBold,
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
