import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, danger ? styles.confirmDanger : null]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 16,
      shadowColor: '#0f243d',
      shadowOpacity: 0.24,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 10,
    },
    title: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    message: {
      marginTop: 8,
      color: colors.admin.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    cancelButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingHorizontal: 16,
      paddingVertical: 9,
      backgroundColor: colors.admin.surfaceStrong,
    },
    cancelText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    confirmButton: {
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.brand.secondary,
    },
    confirmDanger: {
      backgroundColor: colors.state.error,
    },
    confirmText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '700',
    },
  });
