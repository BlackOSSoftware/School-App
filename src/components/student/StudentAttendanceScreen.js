import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useStudentMyAttendanceReportQuery } from '../../hooks/useAttendanceQueries';
import { useActiveSessionQuery } from '../../hooks/useSessionQueries';
import { getTodayIsoDate } from '../../services/attendanceService';
import StudentAttendanceOverviewCard from './StudentAttendanceOverviewCard';
import { useAppTheme } from '../../theme/ThemeContext';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date(getTodayIsoDate()) : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildCalendarCells(monthDate) {
  const firstDay = startOfMonth(monthDate);
  const lastDay = endOfMonth(monthDate);
  const startOffset = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function monthLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function StudentAttendanceScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(today));

  const activeSessionQuery = useActiveSessionQuery();
  const sessionStart = useMemo(
    () => (activeSessionQuery.data?.data?.startDate ? new Date(activeSessionQuery.data.data.startDate) : null),
    [activeSessionQuery.data?.data?.startDate],
  );

  const fromDate = useMemo(() => {
    const firstDay = startOfMonth(monthCursor);
    if (!sessionStart) {
      return firstDay;
    }
    return firstDay < sessionStart ? sessionStart : firstDay;
  }, [monthCursor, sessionStart]);

  const toDate = useMemo(() => {
    const lastDay = endOfMonth(monthCursor);
    return lastDay > today ? today : lastDay;
  }, [monthCursor, today]);

  const reportQuery = useStudentMyAttendanceReportQuery({
    from: toIsoDate(fromDate),
    to: toIsoDate(toDate),
    enabled: fromDate <= toDate,
  });

  const statusByDate = useMemo(() => {
    const map = new Map();
    const daily = reportQuery.data?.data?.daily || [];
    daily.forEach(item => {
      if (item?.date) {
        map.set(item.date, item.status);
      }
    });
    return map;
  }, [reportQuery.data?.data?.daily]);

  const cells = useMemo(() => buildCalendarCells(monthCursor), [monthCursor]);
  const todayIso = toIsoDate(today);
  const sessionStartMonth = sessionStart ? startOfMonth(sessionStart) : null;
  const canGoPrev = sessionStartMonth ? monthCursor > sessionStartMonth : true;
  const canGoNext = monthCursor < startOfMonth(today);

  const report = reportQuery.data?.data ?? {};

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.monthNavBtn, !canGoPrev ? styles.monthNavBtnDisabled : null]}
          onPress={() => canGoPrev && setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          disabled={!canGoPrev}
        >
          <Ionicons name="chevron-back" size={16} color={colors.student.textPrimary} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(monthCursor)}</Text>
        <Pressable
          style={[styles.monthNavBtn, !canGoNext ? styles.monthNavBtnDisabled : null]}
          onPress={() => canGoNext && setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          disabled={!canGoNext}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.student.textPrimary} />
        </Pressable>
      </View>

      {reportQuery.isLoading ? <ActivityIndicator size="small" color={colors.brand.primary} /> : null}

      <StudentAttendanceOverviewCard
        report={report}
        subtitle={`${monthLabel(monthCursor)} Snapshot`}
      />

      <View style={styles.calendarCard}>
        <View style={styles.weekHeaderRow}>
          {WEEKDAYS.map(day => (
            <Text key={day} style={styles.weekHeaderText}>{day}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, index) => {
            if (!cell) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            const dateIso = toIsoDate(cell);
            const status = statusByDate.get(dateIso);
            const isFuture = dateIso > todayIso;
            const style = status === 'present'
              ? styles.dayPresent
              : status === 'absent'
                ? styles.dayAbsent
                : styles.dayNormal;
            return (
              <View key={dateIso} style={styles.dayCell}>
                <View style={[styles.dayBubble, style, isFuture ? styles.dayFuture : null]}>
                  <Text style={styles.dayText}>{cell.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayPresent]} /><Text style={styles.legendText}>Present</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayAbsent]} /><Text style={styles.legendText}>Absent</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayNormal]} /><Text style={styles.legendText}>No data</Text></View>
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    monthTitle: { color: colors.student.textPrimary, fontSize: 17, fontWeight: '800' },
    monthNavBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthNavBtnDisabled: { opacity: 0.5 },
    calendarCard: {
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 10,
    },
    weekHeaderRow: { flexDirection: 'row' },
    weekHeaderText: {
      width: '14.285%',
      textAlign: 'center',
      color: colors.student.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
      marginBottom: 6,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
      width: '14.285%',
      alignItems: 'center',
      marginBottom: 6,
    },
    dayBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    dayText: { color: colors.student.textPrimary, fontSize: 11.5, fontWeight: '700' },
    dayPresent: { backgroundColor: colors.student.successBg, borderColor: colors.student.successBorder },
    dayAbsent: { backgroundColor: colors.student.dangerBg, borderColor: colors.student.dangerBorder },
    dayNormal: { backgroundColor: colors.student.surfaceStrong, borderColor: colors.student.borderSubtle },
    dayFuture: { opacity: 0.45 },
    legendRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
    legendText: { color: colors.student.textSecondary, fontSize: 10.5, fontWeight: '700' },
  });
