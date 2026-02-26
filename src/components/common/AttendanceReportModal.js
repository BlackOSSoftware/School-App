import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

function toPct(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return '0%';
  }
  return `${num.toFixed(2).replace(/\.00$/, '')}%`;
}

export default function AttendanceReportModal({
  visible,
  onClose,
  loading,
  report,
  studentName = 'Student',
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      animation.setValue(0);
      return;
    }
    Animated.timing(animation, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animation, visible]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  const daily = Array.isArray(report?.daily) ? report.daily : [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: animation,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Attendance Report</Text>
              <Text style={styles.subtitle}>{studentName}</Text>
            </View>
            <Pressable style={styles.closeIconBtn} onPress={onClose}>
              <Ionicons name="close" size={16} color={colors.admin.textPrimary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
          ) : report ? (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="calendar-outline" size={14} color={colors.admin.accent} />
                  <Text style={styles.statText}>Days {Number(report?.totalDays ?? 0)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.state.success} />
                  <Text style={styles.statText}>Present {Number(report?.presentDays ?? 0)}</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="close-circle-outline" size={14} color={colors.state.error} />
                  <Text style={styles.statText}>Absent {Number(report?.absentDays ?? 0)}</Text>
                </View>
              </View>
              <Text style={styles.percentText}>Attendance: {toPct(report?.presentPercentage)}</Text>
              <ScrollView style={styles.dailyList} showsVerticalScrollIndicator={false}>
                {daily.length ? (
                  daily.map((item, index) => {
                    const present = String(item?.status ?? '').toLowerCase() === 'present';
                    return (
                      <View key={`${item?.date || 'date'}-${index}`} style={styles.dayRow}>
                        <Text style={styles.dayDate}>{String(item?.date ?? '-')}</Text>
                        <View style={[styles.dayPill, present ? styles.presentPill : styles.absentPill]}>
                          <Text style={styles.dayPillText}>{present ? 'Present' : 'Absent'}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>No daily records found.</Text>
                )}
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyText}>No report data available.</Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      justifyContent: 'flex-end',
    },
    card: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 20,
      minHeight: '62%',
      maxHeight: '88%',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      color: colors.admin.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    subtitle: {
      marginTop: 2,
      color: colors.admin.textSecondary,
      fontSize: 12.5,
      fontWeight: '600',
    },
    closeIconBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
    },
    loaderWrap: {
      paddingVertical: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      gap: 8,
    },
    statCard: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderSubtle,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statText: {
      color: colors.admin.textPrimary,
      fontSize: 11.5,
      fontWeight: '700',
      flex: 1,
    },
    percentText: {
      marginTop: 10,
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    dailyList: {
      marginTop: 10,
      maxHeight: 320,
    },
    dayRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSubtle,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginBottom: 7,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayDate: {
      color: colors.admin.textPrimary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    dayPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
    },
    presentPill: {
      backgroundColor: colors.admin.successBg,
      borderColor: colors.admin.successBorder,
    },
    absentPill: {
      backgroundColor: colors.admin.dangerBg,
      borderColor: colors.admin.dangerBorder,
    },
    dayPillText: {
      color: colors.admin.textPrimary,
      fontSize: 11,
      fontWeight: '800',
    },
    emptyText: {
      color: colors.admin.textSecondary,
      textAlign: 'center',
      marginTop: 16,
      fontSize: 12.5,
      fontWeight: '600',
    },
  });
