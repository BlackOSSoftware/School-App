import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon.js';
import { useAppTheme } from '../../theme/ThemeContext';

function formatClassList(item) {
  const classes = Array.isArray(item?.classIds) ? item.classIds : [];
  if (!classes.length) return 'School Wide';
  const labels = classes
    .map(classItem => {
      const name = String(classItem?.name ?? '').trim();
      const section = String(classItem?.section ?? '').trim();
      return section ? `${name}-${section}` : name;
    })
    .filter(Boolean);
  return labels.length ? labels.join(', ') : 'School Wide';
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function audienceLabel(item) {
  const audience = String(item?.targetAudience ?? '').toLowerCase();
  if (['teacher_only', 'teachers_only'].includes(audience)) return 'Teachers Only';
  if (['teacher_only', 'teachers_only'].includes(String(item?.announcementType ?? '').toLowerCase())) {
    return 'Teachers Only';
  }
  return String(item?.announcementType ?? '').toLowerCase() === 'class_wise'
    ? 'Class Wise'
    : 'School Wide';
}

export default function NotificationDetailsModal({
  visible,
  onClose,
  item,
  variant = 'admin',
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <AppIcon name="notifications-outline" size={16} color={styles.title.color} />
              <Text style={styles.title}>Notification Details</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <AppIcon name="close" size={15} color={styles.title.color} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.itemTitle}>{item?.title || '-'}</Text>
            <Text style={styles.description}>{item?.description || '-'}</Text>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Audience</Text>
                <Text style={styles.metaValue}>{audienceLabel(item)}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Date & Time</Text>
                <Text style={styles.metaValue}>{formatDateTime(item?.createdAt)}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Related Class</Text>
                <Text style={styles.metaValue}>{formatClassList(item)}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Posted By</Text>
                <Text style={styles.metaValue}>{item?.createdByName || item?.createdByRole || 'System'}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function paletteByVariant(colors, variant) {
  if (variant === 'teacher') {
    return colors.teacher;
  }
  if (variant === 'student') {
    return colors.student;
  }
  return colors.admin;
}

const createStyles = (colors, variant) => {
  const palette = paletteByVariant(colors, variant);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: palette.modalBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    card: {
      width: '100%',
      maxHeight: '78%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      padding: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    title: {
      color: palette.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.surfaceStrong,
    },
    itemTitle: {
      color: palette.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      lineHeight: 24,
    },
    description: {
      marginTop: 8,
      color: palette.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
    },
    metaGrid: {
      marginTop: 14,
      gap: 8,
    },
    metaCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      backgroundColor: palette.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    metaLabel: {
      color: palette.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
    },
    metaValue: {
      marginTop: 3,
      color: palette.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
    },
  });
};
