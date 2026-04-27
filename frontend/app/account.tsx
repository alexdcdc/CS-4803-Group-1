import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '@/context/app-context';
import { useSettings } from '@/context/settings-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AccountScreen() {
  const { user, logout, updateAccount, deleteAccount, toggleUserRole } = useApp();
  const { doubleTapEnabled, autoDonateAmount, setDoubleTapEnabled, setAutoDonateAmount } =
    useSettings();
  const textColor = useThemeColor({}, 'text');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoDonateInput, setAutoDonateInput] = useState(String(autoDonateAmount));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const commitAutoDonateAmount = () => {
    const parsed = parseInt(autoDonateInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setAutoDonateInput(String(autoDonateAmount));
      return;
    }
    setAutoDonateAmount(parsed);
    setAutoDonateInput(String(parsed));
  };

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

  const handleDeletePress = () => {
    setDeleteError('');
    setDeletePassword('');
    setConfirmingDelete(true);
  };

  const handleDeleteCancel = () => {
    setConfirmingDelete(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      setDeleteError(
        err instanceof Error && /401|incorrect/i.test(err.message)
          ? 'Incorrect password'
          : 'Could not delete account',
      );
    } finally {
      setDeleting(false);
    }
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

        {/* Donation Settings Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Donation Settings</ThemedText>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <ThemedText style={styles.settingLabel}>Double-tap to donate</ThemedText>
              <ThemedText style={styles.settingDesc}>
                Double-tap a video in the feed to instantly donate
              </ThemedText>
            </View>
            <Switch
              value={doubleTapEnabled}
              onValueChange={setDoubleTapEnabled}
              trackColor={{ true: Brand.primary, false: 'rgba(128,128,128,0.4)' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, !doubleTapEnabled && styles.settingDisabled]}>
            <View style={styles.settingTextWrap}>
              <ThemedText style={styles.settingLabel}>Auto-donate amount</ThemedText>
              <ThemedText style={styles.settingDesc}>
                Credits sent on each double-tap donation
              </ThemedText>
            </View>
            <View style={styles.amountInputRow}>
              <TextInput
                style={[styles.amountInput, { color: textColor }]}
                value={autoDonateInput}
                onChangeText={setAutoDonateInput}
                onBlur={commitAutoDonateAmount}
                onSubmitEditing={commitAutoDonateAmount}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor="rgba(128,128,128,0.5)"
                editable={doubleTapEnabled}
                returnKeyType="done"
                maxLength={6}
              />
              <ThemedText style={styles.amountUnit}>credits</ThemedText>
            </View>
          </View>
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
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={Brand.error} />
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </Pressable>

          {confirmingDelete ? (
            <View style={styles.deleteConfirmBox}>
              <ThemedText style={styles.deleteConfirmTitle}>Confirm account deletion</ThemedText>
              <ThemedText style={styles.deleteConfirmDesc}>
                Enter your password to permanently delete your account. This cannot be undone.
              </ThemedText>
              <View style={styles.inputRow}>
                <IconSymbol name="lock.fill" size={18} color="rgba(128,128,128,0.6)" />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  placeholder="Current password"
                  placeholderTextColor="rgba(128,128,128,0.5)"
                  autoFocus
                />
              </View>
              {deleteError ? <ThemedText style={styles.error}>{deleteError}</ThemedText> : null}
              <View style={styles.deleteActionsRow}>
                <Pressable
                  style={[styles.deleteCancelButton, deleting && styles.buttonDisabled]}
                  onPress={handleDeleteCancel}
                  disabled={deleting}>
                  <ThemedText style={styles.deleteCancelText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.deleteConfirmButton, deleting && styles.buttonDisabled]}
                  onPress={handleDeleteConfirm}
                  disabled={deleting}>
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.deleteConfirmText}>Delete Forever</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.deleteButton} onPress={handleDeletePress}>
              <IconSymbol name="trash.fill" size={20} color={Brand.error} />
              <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
            </Pressable>
          )}
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountInput: {
    width: 80,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'right',
  },
  amountUnit: {
    fontSize: 13,
    opacity: 0.6,
  },
  success: {
    color: Brand.success,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  error: {
    color: Brand.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: Brand.primary,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontFamily: Fonts.displayBold,
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.2,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.error,
  },
  logoutText: {
    fontFamily: Fonts.sansMedium,
    color: Brand.error,
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  deleteText: {
    fontFamily: Fonts.sansMedium,
    color: Brand.error,
    fontWeight: '600',
    fontSize: 16,
  },
  deleteConfirmBox: {
    gap: 12,
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.error,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  deleteConfirmTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 16,
    fontWeight: '700',
    color: Brand.error,
  },
  deleteConfirmDesc: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
  deleteActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontFamily: Fonts.sansMedium,
    fontWeight: '600',
    fontSize: 15,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Brand.error,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontFamily: Fonts.displayBold,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
