import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';

const KPI_DATA = [
  { key: 'students', label: 'Students', value: '1200+' },
  { key: 'teachers', label: 'Teachers', value: '95' },
  { key: 'classes', label: 'Classes', value: '42' },
  { key: 'attendance', label: 'Today', value: '91%' },
];

const ACTIONS = [
  { key: 'session', title: 'Session', desc: 'Academic year controls', icon: 'calendar-outline' },
  { key: 'manage-student', title: 'Students', desc: 'Manage student records', icon: 'people-outline' },
  { key: 'manage-teacher', title: 'Teachers', desc: 'Manage teacher records', icon: 'school-outline' },
  { key: 'manage-class', title: 'Classes', desc: 'Class and section setup', icon: 'library-outline' },
  { key: 'attendance', title: 'Attendance', desc: 'Track daily attendance', icon: 'checkmark-circle-outline' },
  { key: 'announcement', title: 'Announcements', desc: 'Post school updates', icon: 'megaphone-outline' },
];

function KpiStrip({ reveal, styles }) {
  return (
    <View style={styles.kpiRow}>
      {KPI_DATA.map((item, index) => (
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
              <Ionicons name={action.icon} size={20} style={styles.actionIcon} />
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDesc}>{action.desc}</Text>
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

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

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
          Today is a good day to keep academics, attendance, and communication in sync.
        </Text>
      </Animated.View>

      <KpiStrip reveal={reveal} styles={styles} />
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
      shadowColor: '#1e3a8a',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    actionIcon: {
      color: colors.admin.accent,
      fontSize: 20,
    },
    actionTitle: {
      marginTop: 10,
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
  });
