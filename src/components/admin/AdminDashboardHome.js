import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../common/AppIcon.js';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAdminAttendanceSummaryByDateQuery, useAdminDashboardSummaryQuery } from '../../hooks/useAttendanceQueries';

const ACTIONS = [
  { key: 'session', title: 'Session', desc: 'Academic year controls', icon: 'calendar-outline' },
  { key: 'session-upgrade', title: 'Upgrade', desc: 'Promote class students', icon: 'trending-up-outline' },
  { key: 'manage-student', title: 'Students', desc: 'Manage student records', icon: 'people-outline' },
  { key: 'manage-teacher', title: 'Teachers', desc: 'Manage teacher records', icon: 'school-outline' },
  { key: 'manage-class', title: 'Classes', desc: 'Class and section setup', icon: 'library-outline' },
  { key: 'attendance', title: 'Attendance', desc: 'Track daily attendance', icon: 'checkmark-circle-outline' },
  { key: 'announcement', title: 'Announcements', desc: 'Post school updates', icon: 'megaphone-outline' },
  { key: 'manage-bus', title: 'Bus', desc: 'Routes & tracking access', icon: 'bus-outline' },
];

function toIsoDate(date) {
  const safe = date instanceof Date ? date : new Date(date);
  const year = safe.getFullYear();
  const month = String(safe.getMonth() + 1).padStart(2, '0');
  const day = String(safe.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeDayPercentage(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const totals = safeRows.reduce(
    (acc, row) => {
      const totalStudents = Number(row?.totalStudents ?? 0);
      const presentCount = Number(row?.presentCount ?? 0);
      return {
        present: acc.present + (Number.isFinite(presentCount) ? presentCount : 0),
        total: acc.total + (Number.isFinite(totalStudents) ? totalStudents : 0),
        hasAttendance: acc.hasAttendance || Boolean(row?.attendanceTaken),
      };
    },
    { present: 0, total: 0, hasAttendance: false },
  );

  if (!totals.total) {
    return { value: 0, hasAttendance: totals.hasAttendance };
  }

  return {
    value: Number(((totals.present / totals.total) * 100).toFixed(2)),
    hasAttendance: totals.hasAttendance,
  };
}

function KpiStrip({ reveal, styles, kpiData, loading, colors }) {
  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.kpiRow}>
      {kpiData.map((item, index) => (
        <Animated.View
          key={item.key}
          style={[
            styles.kpiCard,
            {
              opacity: reveal.interpolate({
                inputRange: [0, 0.2 + index * 0.12, 1],
                outputRange: [0, 0, 1],
              }),
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16 + index * 2, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <AppIcon name={item.icon} size={17} style={styles.kpiIcon} />
          <Text style={styles.kpiValue}>{item.value}</Text>
          <Text style={styles.kpiLabel}>{item.label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function QuickActions({ onQuickActionPress, reveal, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        {ACTIONS.map((action, index) => (
          <Animated.View
            key={action.key}
            style={[
              styles.actionCardWrap,
              {
                opacity: reveal.interpolate({
                  inputRange: [0, 0.28 + index * 0.08, 1],
                  outputRange: [0, 0, 1],
                }),
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20 + index, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable style={styles.actionCard} onPress={() => onQuickActionPress(action.key)}>
              <View style={styles.actionIconWrap}>
                <AppIcon name={action.icon} size={26} style={styles.actionIcon} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export default function AdminDashboardHome({ onQuickActionPress }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reveal = useRef(new Animated.Value(0)).current;
  const summaryQuery = useAdminDashboardSummaryQuery();
  const yesterdayIso = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return toIsoDate(date);
  }, []);
  const yesterdaySummaryQuery = useAdminAttendanceSummaryByDateQuery({ date: yesterdayIso });

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const summary = summaryQuery.data?.data ?? {};
  const todayAttendance = summary.todayAttendance ?? {};
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const todayTaken = Boolean(todayAttendance.attendanceTaken) && String(todayAttendance.date ?? '') === todayIso;
  const yesterdayRows = useMemo(() => {
    const rows = yesterdaySummaryQuery.data?.data?.data;
    return Array.isArray(rows) ? rows : [];
  }, [yesterdaySummaryQuery.data?.data?.data]);
  const yesterdayComputed = useMemo(() => computeDayPercentage(yesterdayRows), [yesterdayRows]);
  const attendanceCard = useMemo(() => {
    if (todayTaken) {
      return {
        label: 'Today',
        value: Number(todayAttendance.presentPercentage ?? 0),
      };
    }

    if (yesterdayComputed.hasAttendance) {
      return {
        label: 'Yesterday',
        value: yesterdayComputed.value,
      };
    }

    return {
      label: 'Today',
      value: Number(todayAttendance.presentPercentage ?? 0),
    };
  }, [todayAttendance.presentPercentage, todayTaken, yesterdayComputed.hasAttendance, yesterdayComputed.value]);

  const kpiData = useMemo(
    () => [
      {
        key: 'students',
        label: 'Students',
        value: String(Number(summary.totalStudents ?? 0)),
        icon: 'people-outline',
      },
      {
        key: 'teachers',
        label: 'Teachers',
        value: String(Number(summary.totalTeachers ?? 0)),
        icon: 'school-outline',
      },
      {
        key: 'classes',
        label: 'Classes',
        value: String(Number(summary.totalClasses ?? 0)),
        icon: 'library-outline',
      },
      {
        key: 'attendance',
        label: attendanceCard.label,
        value: `${Number(attendanceCard.value ?? 0).toFixed(2).replace(/\.00$/, '')}%`,
        icon: 'pulse-outline',
      },
    ],
    [attendanceCard.label, attendanceCard.value, summary.totalClasses, summary.totalStudents, summary.totalTeachers],
  );

  return (
    <>
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.heroKicker}>OPERATIONS OVERVIEW</Text>
        <Text style={styles.heroTitle}>Good to see you, Admin</Text>
        <Text style={styles.heroSubtitle}>
          MMPS control center: students {summary.totalStudents ?? 0}, teachers {summary.totalTeachers ?? 0}, classes {summary.totalClasses ?? 0}.
        </Text>
      </Animated.View>

      <KpiStrip
        reveal={reveal}
        styles={styles}
        kpiData={kpiData}
        loading={summaryQuery.isLoading || yesterdaySummaryQuery.isLoading}
        colors={colors}
      />
      <QuickActions onQuickActionPress={onQuickActionPress} reveal={reveal} styles={styles} />
    </>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    heroCard: {
      borderRadius: 24,
      backgroundColor: colors.admin.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      padding: 16,
      shadowColor: '#1b3f86',
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 7,
    },
    heroKicker: {
      color: colors.auth.subtitle,
      fontSize: 10.5,
      letterSpacing: 1.6,
      fontWeight: '800',
    },
    heroTitle: {
      marginTop: 8,
      color: colors.text.inverse,
      fontSize: 30,
      fontWeight: '900',
      lineHeight: 34,
    },
    heroSubtitle: {
      marginTop: 8,
      color: colors.auth.subtitle,
      fontSize: 13,
      lineHeight: 20,
    },
    kpiRow: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    kpiCard: {
      width: '48.5%',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      shadowColor: '#1e3a8a',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    kpiIcon: {
      color: colors.admin.accent,
      marginBottom: 8,
    },
    kpiValue: {
      color: colors.admin.textPrimary,
      fontSize: 24,
      fontWeight: '900',
    },
    kpiLabel: {
      marginTop: 6,
      color: colors.admin.textSecondary,
      fontSize: 12.5,
      fontWeight: '600',
    },
    section: {
      marginTop: 18,
    },
    sectionTitle: {
      color: colors.admin.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    actionCardWrap: {
      width: '48.5%',
    },
    actionCard: {
      borderRadius: 16,
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 110,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      shadowColor: '#1e3a8a',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    actionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIcon: {
      color: colors.admin.accent,
      fontSize: 26,
    },
    actionCopy: {
      flex: 1,
    },
    actionTitle: {
      color: colors.admin.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    actionDesc: {
      marginTop: 4,
      color: colors.admin.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
    },
    loaderWrap: {
      marginTop: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
