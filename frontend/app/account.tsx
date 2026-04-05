import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AccountScreen() {
  const { user, logout, updateAccount, deleteAccount, toggleUserRole } = useApp();
  const textColor = useThemeColor({}, 'text');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    setMessage('');
    const data: Parameters<typeof updateAccount>[0] = {};

    if (name.trim() && name.trim() !== user?.name) data.name = name.trim();
    if (email.trim() && email.trim() !== user?.email) data.email = email.trim();
    if (newPassword) {
      data.currentPassword = currentPassword;
      data.newPassword = newPassword;
    }

    if (Object.keys(data).length === 0) {
      setMessage('No changes to save');
      return;
    }

    setSaving(true);
    const result = await updateAccount(data);
    setSaving(false);

    if (result.success) {
      setMessage('Account updated');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setError(result.error ?? 'Update failed');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Profile Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Profile</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Name</ThemedText>
            <View style={styles.inputRow}>
              <IconSymbol name="person.fill" size={18} color="rgba(128,128,128,0.6)" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="rgba(128,128,128,0.5)"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <View style={styles.inputRow}>
              <IconSymbol name="envelope.fill" size={18} color="rgba(128,128,128,0.6)" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="rgba(128,128,128,0.5)"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
        </View>

        {/* Role Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Dashboard Mode</ThemedText>
          <Pressable style={styles.roleRow} onPress={toggleUserRole}>
            <View>
              <ThemedText style={styles.roleLabel}>
                {user?.role === 'creator' ? 'Creator Mode' : 'Backer Mode'}
              </ThemedText>
              <ThemedText style={styles.roleDesc}>
                Tap to switch to {user?.role === 'creator' ? 'backer' : 'creator'} view
              </ThemedText>
            </View>
            <IconSymbol name="arrow.left.arrow.right" size={20} color={textColor} />
          </Pressable>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Change Password</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Current Password</ThemedText>
            <View style={styles.inputRow}>
              <IconSymbol name="lock.fill" size={18} color="rgba(128,128,128,0.6)" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="rgba(128,128,128,0.5)"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>New Password</ThemedText>
            <View style={styles.inputRow}>
              <IconSymbol name="lock.fill" size={18} color="rgba(128,128,128,0.6)" />
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor="rgba(128,128,128,0.5)"
              />
            </View>
          </View>
        </View>

        {message ? <ThemedText style={styles.success}>{message}</ThemedText> : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveText}>Save Changes</ThemedText>
          )}
        </Pressable>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#ef4444" />
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <IconSymbol name="trash.fill" size={20} color="#ef4444" />
            <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 28,
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 4,
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
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleDesc: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  success: {
    color: '#22c55e',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  dangerZone: {
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },
});
