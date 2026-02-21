import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { changeAdminPassword } from '../../services/authService';
import { useAppTheme } from '../../theme/ThemeContext';
import ConfirmModal from '../common/ConfirmModal';

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function MessageBanner({ text, type, onClose, styles }) {
  if (!text) {
    return null;
  }

  return (
    <View style={[styles.banner, type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={styles.bannerText}>{text}</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.bannerClose}>x</Text>
      </Pressable>
    </View>
  );
}

export default function AdminProfileScreen({ session, onLogout }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });

  const name = session?.user?.name || 'Super Admin';
  const role = String(session?.role || 'admin').toUpperCase();

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2500);
    return () => clearTimeout(timer);
  }, [message.text]);

  const submitPasswordChange = async () => {
    if (!passwordForm.oldPassword.trim() || !passwordForm.newPassword.trim()) {
      setMessage({ type: 'error', text: 'Old and new password are required.' });
      return;
    }

    setIsSavingPassword(true);
    try {
      await changeAdminPassword(passwordForm);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswordModalVisible(false);
      setPasswordForm({ oldPassword: '', newPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to change password.') });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroName}>{name}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{role}</Text>
          </View>
          <Text style={styles.heroSub}>Manage credentials and secure your account access.</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.metricCard}>
          <Ionicons name="shield-checkmark-outline" size={16} style={styles.metricIcon} />
          <Text style={styles.metricLabel}>Security</Text>
          <Text style={styles.metricValue}>Enabled</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="notifications-outline" size={16} style={styles.metricIcon} />
          <Text style={styles.metricLabel}>Announcements</Text>
          <Text style={styles.metricValue}>Active</Text>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Account Actions</Text>
        <Pressable style={styles.actionRowPrimary} onPress={() => setPasswordModalVisible(true)}>
          <View style={styles.actionIconWrap}>
            <Ionicons name="key-outline" size={16} color={colors.brand.primary} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Change Password</Text>
            <Text style={styles.actionSub}>Update admin password securely</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.admin.textSecondary} />
        </Pressable>

        <Pressable style={styles.actionRowDanger} onPress={() => setLogoutVisible(true)}>
          <View style={[styles.actionIconWrap, styles.actionIconDanger]}>
            <Ionicons name="log-out-outline" size={16} color={colors.state.error} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>Logout</Text>
            <Text style={styles.actionSub}>Sign out and return to login</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.state.error} />
        </Pressable>
      </View>

      <MessageBanner
        text={message.text}
        type={message.type}
        onClose={() => setMessage({ type: '', text: '' })}
        styles={styles}
      />

      <ConfirmModal
        visible={logoutVisible}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        danger
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          onLogout?.();
        }}
      />

      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={passwordForm.oldPassword}
                onChangeText={value => setPasswordForm(prev => ({ ...prev, oldPassword: value }))}
                placeholder="Old password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={passwordForm.newPassword}
                onChangeText={value => setPasswordForm(prev => ({ ...prev, newPassword: value }))}
                placeholder="New password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
              />
            </View>
            <View style={styles.rowActions}>
              <Pressable style={styles.cancelButton} onPress={() => setPasswordModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={submitPasswordChange}>
                {isSavingPassword ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 26,
    },
    heroCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    avatarCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.admin.navBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.text.inverse,
      fontSize: 23,
      fontWeight: '900',
    },
    heroBody: {
      flex: 1,
    },
    heroName: {
      color: colors.admin.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    rolePill: {
      marginTop: 4,
      alignSelf: 'flex-start',
      borderRadius: 14,
      backgroundColor: colors.admin.surfaceStrong,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    rolePillText: {
      color: colors.admin.textPrimary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    heroSub: {
      marginTop: 6,
      color: colors.admin.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    gridRow: {
      marginTop: 10,
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
    },
    metricIcon: {
      color: colors.admin.accent,
    },
    metricLabel: {
      marginTop: 7,
      color: colors.admin.textSecondary,
      fontSize: 11.5,
      fontWeight: '600',
    },
    metricValue: {
      marginTop: 2,
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    actionsCard: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
    },
    actionsTitle: {
      color: colors.admin.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 8,
    },
    actionRowPrimary: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginBottom: 8,
    },
    actionRowDanger: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.dangerBorder,
      backgroundColor: colors.admin.dangerBg,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    actionIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.admin.surface,
    },
    actionIconDanger: {
      backgroundColor: colors.admin.surface,
    },
    actionBody: {
      flex: 1,
    },
    actionTitle: {
      color: colors.admin.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
    },
    actionSub: {
      marginTop: 2,
      color: colors.admin.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    banner: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bannerError: {
      backgroundColor: colors.admin.dangerBg,
      borderWidth: 1,
      borderColor: colors.admin.dangerBorder,
    },
    bannerSuccess: {
      backgroundColor: colors.admin.successBg,
      borderWidth: 1,
      borderColor: colors.admin.successBorder,
    },
    bannerText: {
      flex: 1,
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      paddingRight: 8,
    },
    bannerClose: {
      color: colors.admin.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalCard: {
      width: '100%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 14,
    },
    modalTitle: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 10,
    },
    inputRow: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    inputIcon: {
      color: colors.admin.accent,
      marginRight: 8,
    },
    inputWithIcon: {
      flex: 1,
      color: colors.admin.textPrimary,
      paddingVertical: 10,
      fontSize: 13,
    },
    rowActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    cancelButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    cancelButtonText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    saveButton: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      minWidth: 70,
      alignItems: 'center',
    },
    saveButtonText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '700',
    },
  });
