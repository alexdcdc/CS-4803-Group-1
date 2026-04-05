import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SignupScreen() {
  const { signup } = useApp();
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields');
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
    const result = await signup(name.trim(), email.trim(), password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Signup failed');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={textColor} />
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        Create Account
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Join the community
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Name</ThemedText>
          <View style={styles.inputRow}>
            <IconSymbol name="person.fill" size={18} color="rgba(128,128,128,0.6)" />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Your name"
              placeholderTextColor="rgba(128,128,128,0.5)"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>
        </View>

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

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <View style={styles.inputRow}>
            <IconSymbol name="lock.fill" size={18} color="rgba(128,128,128,0.6)" />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="At least 6 characters"
              placeholderTextColor="rgba(128,128,128,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <IconSymbol
                name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                size={20}
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
              placeholder="Re-enter password"
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
          onPress={handleSignup}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.submitText}>Sign Up</ThemedText>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
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
  },
  form: {
    gap: 16,
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
    marginTop: 4,
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
    marginTop: 24,
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
});
