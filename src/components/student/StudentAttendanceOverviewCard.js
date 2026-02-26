import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

function safeNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRgba(hex, alpha) {
  const value = String(hex ?? '').trim().replace('#', '');
  if (value.length !== 6) {
    return `rgba(255,255,255,${alpha})`;
  }
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getPalette(colors) {
  const base = colors.student.heroBg;
  return {
    cardBg: base,
    cardBorder: toRgba(colors.student.heroBgAlt, 0.72),
    shadow: toRgba(colors.brand.accent, 0.34),
    title: colors.text.inverse,
    subtitle: toRgba(colors.text.inverse, 0.78),
    bubbleBg: toRgba(colors.text.inverse, 0.22),
    bubbleBorder: toRgba(colors.text.inverse, 0.3),
    label: toRgba(colors.text.inverse, 0.82),
    value: colors.text.inverse,
  };
}

export default function StudentAttendanceOverviewCard({ report, subtitle = 'Attendance Overview' }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(getPalette(colors)), [colors]);

  const presentDays = safeNumber(report?.presentDays);
  const absentDays = safeNumber(report?.absentDays);
  const totalDays = safeNumber(report?.totalDays) || presentDays + absentDays;
  const percentage = safeNumber(report?.presentPercentage);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Attendance Overview</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.percentBubble}>
          <Text style={styles.percentText}>{Math.round(percentage)}%</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Present</Text>
          <Text style={styles.statValue}>{presentDays}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Absent</Text>
          <Text style={styles.statValue}>{absentDays}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{totalDays}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = palette =>
  StyleSheet.create({
    card: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: palette.cardBg,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      shadowColor: palette.shadow,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTextWrap: { flex: 1, paddingRight: 10 },
    title: {
      color: palette.title,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    subtitle: {
      marginTop: 5,
      color: palette.subtitle,
      fontSize: 13,
      fontWeight: '600',
    },
    percentBubble: {
      width: 74,
      height: 74,
      borderRadius: 37,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.bubbleBg,
      borderWidth: 1,
      borderColor: palette.bubbleBorder,
    },
    percentText: {
      color: palette.value,
      fontSize: 19,
      fontWeight: '900',
    },
    statsRow: {
      marginTop: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    statBlock: { flex: 1 },
    statLabel: {
      color: palette.label,
      fontSize: 11.5,
      fontWeight: '700',
    },
    statValue: {
      marginTop: 4,
      color: palette.value,
      fontSize: 16,
      fontWeight: '900',
    },
  });
