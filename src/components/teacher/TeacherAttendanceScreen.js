import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppIcon from '../common/AppIcon.js';
import CustomDropdownSelector from '../common/CustomDropdownSelector';
import {
  useMarkTeacherClassAttendanceMutation,
  useTeacherAttendancePolicyQuery,
  useTeacherClassAttendanceByDateQuery,
  useTeacherStudentAttendanceReportQuery,
} from '../../hooks/useAttendanceQueries';
import { useTeacherClassesOverviewQuery, useTeacherStudentsByClassQuery } from '../../hooks/useTeacherQueries';
import { formatDisplayDate, getTodayIsoDate } from '../../services/attendanceService';
import { useAppTheme } from '../../theme/ThemeContext';

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date(getTodayIsoDate()) : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function isAlreadySubmittedError(error) {
  const message = getErrorMessage(error, '').toLowerCase();
  return message.includes('already') && (message.includes('submitted') || message.includes('exist') || message.includes('duplicate'));
}

function toStudentMap(students = []) {
  const map = new Map();
  students.forEach(student => {
    if (student?.id) {
      map.set(student.id, student);
    }
  });
  return map;
}

function sortStudentsByName(rows = []) {
  return [...rows].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
}

function normalizeAttendanceRows(summary, classStudents) {
  if (!summary?.attendanceTaken) {
    return [];
  }

  const studentMap = toStudentMap(classStudents);
  const mergedRows = [...(summary.presentStudents || []), ...(summary.absentStudents || [])].map(row => {
    const linked = studentMap.get(row.studentId);
    return {
      studentId: row.studentId,
      studentName: row.studentName || linked?.name || '-',
      scholarNumber: row.scholarNumber || linked?.scholarNumber || '-',
      status: row.status === 'present' ? 'present' : 'absent',
    };
  });

  return mergedRows.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

function computeSummary(summary, classStudents) {
  if (!summary) {
    return {
      attendanceTaken: false,
      presentCount: 0,
      absentCount: 0,
      totalStudents: classStudents.length,
      presentPercentage: 0,
    };
  }

  const presentFromList = Array.isArray(summary.presentStudents) ? summary.presentStudents.length : 0;
  const absentFromList = Array.isArray(summary.absentStudents) ? summary.absentStudents.length : 0;
  const presentFromCount = Number(summary.presentCount || 0);
  const absentFromCount = Number(summary.absentCount || 0);
  const presentCount = Math.max(presentFromList, presentFromCount);
  const absentCount = Math.max(absentFromList, absentFromCount);

  const totalStudents = Number(summary.totalStudents || 0) || presentCount + absentCount || classStudents.length;
  const safeTotal = totalStudents || 0;

  return {
    attendanceTaken: Boolean(summary.attendanceTaken),
    presentCount,
    absentCount,
    totalStudents: safeTotal,
    presentPercentage: safeTotal > 0 ? Number(((presentCount / safeTotal) * 100).toFixed(2)) : 0,
  };
}

function MessageBanner({ message, type, onClose, styles }) {
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.banner, type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={styles.bannerText}>{message}</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.bannerClose}>x</Text>
      </Pressable>
    </View>
  );
}

function SummaryTile({ label, value, styles }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function AttendanceStateHint({ attendanceTaken, selectedDateIso, todayIso, canMarkPastDates, styles, colors }) {
  const isPastDate = selectedDateIso < todayIso;
  const isFutureDate = selectedDateIso > todayIso;

  if (isFutureDate) {
    return (
      <View style={styles.stateHintWrap}>
        <AppIcon name="calendar-outline" size={14} color={colors.state.error} />
        <Text style={[styles.stateHintText, styles.stateHintPending]}>
          Future dates are locked. Choose today or an older date.
        </Text>
      </View>
    );
  }

  if (isPastDate && !canMarkPastDates) {
    return (
      <View style={styles.stateHintWrap}>
        <AppIcon name="lock-closed-outline" size={14} color={colors.state.error} />
        <Text style={[styles.stateHintText, styles.stateHintPending]}>
          Past attendance is locked. Admin must enable old-date attendance from settings.
        </Text>
      </View>
    );
  }

  if (isPastDate) {
    return (
      <View style={styles.stateHintWrap}>
        <AppIcon name="time-outline" size={14} color={colors.brand.primary} />
        <Text style={[styles.stateHintText, styles.stateHintTaken]}>
          Past-date attendance editing is enabled. You can update saved records for {formatDisplayDate(selectedDateIso)}.
        </Text>
      </View>
    );
  }

  if (attendanceTaken) {
    return (
      <View style={styles.stateHintWrap}>
        <AppIcon name="checkmark-circle-outline" size={14} color={colors.state.success} />
        <Text style={[styles.stateHintText, styles.stateHintTaken]}>
          Attendance for {formatDisplayDate(selectedDateIso)} is already submitted. You can still edit and update it.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stateHintWrap}>
      <AppIcon name="create-outline" size={14} color={colors.teacher.textSecondary} />
      <Text style={[styles.stateHintText, styles.stateHintPending]}>
        Attendance for {formatDisplayDate(selectedDateIso)} is pending. Tap mark to submit now.
      </Text>
    </View>
  );
}

export default function TeacherAttendanceScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [today, setToday] = useState(getTodayIsoDate());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [markModalVisible, setMarkModalVisible] = useState(false);
  const [draftAttendance, setDraftAttendance] = useState({});
  const [reportStudent, setReportStudent] = useState(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [pickerField, setPickerField] = useState('');

  const overviewQuery = useTeacherClassesOverviewQuery();
  const markMutation = useMarkTeacherClassAttendanceMutation();
  const attendancePolicyQuery = useTeacherAttendancePolicyQuery();

  const classTeacherClass = useMemo(() => {
    const item = overviewQuery.data?.teacher?.classTeacherOf;
    if (!item?.id) {
      return null;
    }
    return {
      id: item.id,
      label: item.label || `${item.name || ''}${item.section ? ` - ${item.section}` : ''}`.trim(),
      name: item.name,
      section: item.section,
    };
  }, [overviewQuery.data?.teacher?.classTeacherOf]);

  const classes = useMemo(() => {
    if (classTeacherClass) {
      return [classTeacherClass];
    }

    return Array.isArray(overviewQuery.data?.assignedClasses)
      ? overviewQuery.data.assignedClasses.filter(item => item?.id)
      : [];
  }, [classTeacherClass, overviewQuery.data?.assignedClasses]);

  useEffect(() => {
    if (!classes.length) {
      setSelectedClassId('');
      return;
    }

    if (!selectedClassId || !classes.some(item => item.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2600);
    return () => clearTimeout(timer);
  }, [message.text]);

  useEffect(() => {
    const syncToday = () => {
      const current = getTodayIsoDate();
      setToday(prev => (prev === current ? prev : current));
    };

    syncToday();
    const intervalId = setInterval(syncToday, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const selectedDateIso = toIsoDate(selectedDate);
  const canMarkPastDates = Boolean(attendancePolicyQuery.data?.data?.canMarkPastDates);
  const isFutureDate = selectedDateIso > today;
  const isPastDateLocked = selectedDateIso < today && !canMarkPastDates;

  const attendanceQuery = useTeacherClassAttendanceByDateQuery({
    classId: selectedClassId,
    date: selectedDateIso,
    enabled: Boolean(selectedClassId),
  });

  const studentsQuery = useTeacherStudentsByClassQuery({
    classId: selectedClassId,
    page: 1,
    limit: 500,
    enabled: Boolean(selectedClassId),
  });

  const classStudents = useMemo(() => {
    const rows = Array.isArray(studentsQuery.data?.students) ? studentsQuery.data.students : [];
    return sortStudentsByName(rows);
  }, [studentsQuery.data?.students]);
  const canSubmitAttendance = Boolean(selectedClassId) && !markMutation.isPending && !studentsQuery.isLoading && !isFutureDate && !isPastDateLocked;

  const summary = attendanceQuery.data?.data ?? null;
  const selectedClass = classes.find(item => item.id === selectedClassId) ?? null;
  const summaryStats = useMemo(() => computeSummary(summary, classStudents), [summary, classStudents]);
  const attendanceRows = useMemo(() => normalizeAttendanceRows(summary, classStudents), [summary, classStudents]);

  const reportQuery = useTeacherStudentAttendanceReportQuery({
    classId: selectedClassId,
    studentId: reportStudent?.id,
    from: toIsoDate(fromDate),
    to: toIsoDate(toDate),
    enabled: reportVisible && Boolean(reportStudent?.id),
  });

  const openMarkModal = () => {
    if (!classStudents.length) {
      setMessage({ type: 'error', text: `No students found in your assigned class for ${formatDisplayDate(selectedDateIso)}.` });
      return;
    }

    const existingMap = {};
    attendanceRows.forEach(row => {
      existingMap[row.studentId] = row.status;
    });

    const draft = {};
    classStudents.forEach(student => {
      draft[student.id] = existingMap[student.id] || 'absent';
    });

    setDraftAttendance(draft);
    setMarkModalVisible(true);
  };

  const submitAttendance = async () => {
    const payload = classStudents.map(student => ({
      studentId: student.id,
      status: draftAttendance[student.id] === 'present' ? 'present' : 'absent',
    }));

    try {
      await markMutation.mutateAsync({
        classId: selectedClassId,
        date: selectedDateIso,
        attendance: payload,
      });
      setMessage({ type: 'success', text: summaryStats.attendanceTaken ? 'Attendance updated successfully.' : 'Attendance saved successfully.' });
      setMarkModalVisible(false);
      await attendanceQuery.refetch();
    } catch (error) {
      if (isAlreadySubmittedError(error)) {
        await attendanceQuery.refetch();
        setMarkModalVisible(false);
        setMessage({
          type: 'success',
          text: `Attendance already exists for ${formatDisplayDate(selectedDateIso)}. Loaded saved record for update.`,
        });
        return;
      }
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to save attendance.') });
    }
  };

  const showClassSelector = classes.length > 1;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>ATTENDANCE DESK</Text>
        <Text style={styles.heroTitle}>{formatDisplayDate(selectedDateIso)}</Text>
        <Text style={styles.heroSub}>
          {selectedDateIso === today ? 'Manage today attendance.' : 'Review and update the selected attendance date.'} Your class: {selectedClass?.label || 'Not assigned'}.
        </Text>
      </View>

      <View style={styles.controlRow}>
        <Pressable style={styles.dateSelectBtn} onPress={() => setPickerField('attendanceDate')}>
          <AppIcon name="calendar-outline" size={16} color={colors.teacher.accent} />
          <Text style={styles.dateSelectText}>{formatDisplayDate(selectedDateIso)}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <CustomDropdownSelector
            tone="teacher"
            label="Class"
            value={selectedClass?.label || ''}
            placeholder="Select class"
            options={classes}
            onSelect={value => setSelectedClassId(value || '')}
            valueExtractor={item => item?.id}
            labelExtractor={item => item?.label}
            searchPlaceholder="Search class or section"
            disabled={!showClassSelector}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <Pressable
          style={[styles.markBtn, !canSubmitAttendance ? styles.markBtnDisabled : null]}
          onPress={openMarkModal}
          disabled={!canSubmitAttendance}
        >
          <AppIcon name={summaryStats.attendanceTaken ? 'create-outline' : 'checkmark-circle-outline'} size={14} color={colors.text.inverse} />
          <Text style={styles.markBtnText}>{summaryStats.attendanceTaken ? 'Edit' : 'Mark'}</Text>
        </Pressable>
      </View>

      <AttendanceStateHint
        attendanceTaken={summaryStats.attendanceTaken}
        selectedDateIso={selectedDateIso}
        todayIso={today}
        canMarkPastDates={canMarkPastDates}
        styles={styles}
        colors={colors}
      />

      <MessageBanner
        message={message.text}
        type={message.type}
        onClose={() => setMessage({ type: '', text: '' })}
        styles={styles}
      />

      {overviewQuery.isLoading || studentsQuery.isLoading || attendanceQuery.isLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} style={styles.loadingState} />
      ) : !selectedClassId ? (
        <Text style={styles.emptyText}>Class teacher mapping not found. Contact admin.</Text>
      ) : (
        <>
          <View style={styles.tilesRow}>
            <SummaryTile label="Present" value={summaryStats.presentCount} styles={styles} />
            <SummaryTile label="Absent" value={summaryStats.absentCount} styles={styles} />
            <SummaryTile label="Total" value={summaryStats.totalStudents} styles={styles} />
            <SummaryTile label="%" value={`${summaryStats.presentPercentage}`} styles={styles} />
          </View>

          <Text style={styles.sectionTitle}>Students</Text>
          <ScrollView style={styles.studentList} contentContainerStyle={styles.studentListContent} showsVerticalScrollIndicator={false}>
            {summaryStats.attendanceTaken ? (
              attendanceRows.map(student => (
                <Pressable
                  key={student.studentId}
                  style={styles.studentRow}
                  onPress={() => {
                    const matched = classStudents.find(item => item.id === student.studentId) || {
                      id: student.studentId,
                      name: student.studentName,
                    };
                    setReportStudent(matched);
                    setReportVisible(true);
                  }}
                >
                  <View style={styles.studentLeft}>
                    <Text style={styles.studentName}>{student.studentName}</Text>
                    <Text style={styles.studentMeta}>Scholar #{student.scholarNumber || '-'}</Text>
                  </View>
                  <View style={[styles.statusBadge, student.status === 'present' ? styles.presentBadge : styles.absentBadge]}>
                    <Text style={styles.statusBadgeText}>{student.status}</Text>
                  </View>
                </Pressable>
              ))
            ) : classStudents.length ? (
              classStudents.map(student => (
                <View key={student.id} style={styles.studentRow}>
                  <View style={styles.studentLeft}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentMeta}>Scholar #{student.scholarNumber || '-'}</Text>
                  </View>
                  <View style={[styles.statusBadge, styles.pendingBadge]}>
                    <Text style={styles.statusBadgeText}>Pending</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No students found in this class.</Text>
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={markModalVisible} transparent animationType="slide" onRequestClose={() => setMarkModalVisible(false)}>
        <View style={styles.modalOverlayBottom}>
          <View style={styles.markModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{summaryStats.attendanceTaken ? 'Edit Attendance' : 'Mark Attendance'} ({formatDisplayDate(selectedDateIso)})</Text>
              <Pressable style={styles.iconCloseBtn} onPress={() => setMarkModalVisible(false)}>
                <AppIcon name="close" size={16} color={colors.teacher.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={styles.markScroll}>
              {classStudents.map(student => {
                const status = draftAttendance[student.id] || 'absent';
                return (
                  <View key={student.id} style={styles.markRow}>
                    <View style={styles.studentLeft}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>Scholar #{student.scholarNumber || '-'}</Text>
                    </View>
                    <View style={styles.toggleWrap}>
                      <Pressable
                        style={[styles.toggleBtn, status === 'present' ? styles.toggleBtnActive : null]}
                        onPress={() => setDraftAttendance(prev => ({ ...prev, [student.id]: 'present' }))}
                      >
                        <Text style={[styles.toggleText, status === 'present' ? styles.toggleTextActive : null]}>
                          Present
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.toggleBtn, status === 'absent' ? styles.toggleBtnDanger : null]}
                        onPress={() => setDraftAttendance(prev => ({ ...prev, [student.id]: 'absent' }))}
                      >
                        <Text style={[styles.toggleText, status === 'absent' ? styles.toggleTextDanger : null]}>
                          Absent
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalActionRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setMarkModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={submitAttendance}>
                {markMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.submitBtnText}>{summaryStats.attendanceTaken ? 'Update' : 'Submit'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.modalTitle}>{reportStudent?.name || 'Student'} Report</Text>

            <View style={styles.dateRow}>
              <Pressable style={styles.dateBtn} onPress={() => setPickerField('from')}>
                <Text style={styles.dateBtnText}>From: {formatDisplayDate(toIsoDate(fromDate))}</Text>
              </Pressable>
              <Pressable style={styles.dateBtn} onPress={() => setPickerField('to')}>
                <Text style={styles.dateBtnText}>To: {formatDisplayDate(toIsoDate(toDate))}</Text>
              </Pressable>
            </View>

            {reportQuery.isLoading ? (
              <ActivityIndicator size="small" color={colors.brand.primary} />
            ) : reportQuery.data?.data ? (
              <>
                <View style={styles.tilesRow}>
                  <SummaryTile label="Present" value={reportQuery.data.data.presentDays ?? 0} styles={styles} />
                  <SummaryTile label="Absent" value={reportQuery.data.data.absentDays ?? 0} styles={styles} />
                  <SummaryTile label="Days" value={reportQuery.data.data.totalDays ?? 0} styles={styles} />
                  <SummaryTile label="%" value={`${reportQuery.data.data.presentPercentage ?? 0}`} styles={styles} />
                </View>
                <ScrollView style={styles.dailyList}>
                  {(reportQuery.data.data.daily || []).map((item, idx) => (
                    <View key={`${item.date}-${idx}`} style={styles.dailyRow}>
                      <Text style={styles.dailyDate}>{formatDisplayDate(item.date)}</Text>
                      <Text style={[styles.dailyStatus, item.status === 'present' ? styles.dailyPresent : styles.dailyAbsent]}>
                        {item.status}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.emptyText}>No report found.</Text>
            )}

            <Pressable style={styles.closeBtn} onPress={() => setReportVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {pickerField ? (
        <DateTimePicker
          value={
            pickerField === 'from'
              ? fromDate
              : pickerField === 'to'
                ? toDate
                : selectedDate
          }
          mode="date"
          onChange={(_, date) => {
            setPickerField('');
            if (!date) {
              return;
            }
            if (pickerField === 'attendanceDate') {
              setSelectedDate(date);
            } else if (pickerField === 'from') {
              setFromDate(date);
            } else {
              setToDate(date);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    heroCard: {
      borderRadius: 18,
      backgroundColor: colors.teacher.heroBg,
      padding: 14,
      marginBottom: 10,
    },
    heroKicker: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.4, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 23, fontWeight: '900' },
    heroSub: { marginTop: 4, color: colors.auth.subtitle, fontSize: 12, lineHeight: 17 },
    controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    dateSelectBtn: {
      width: '100%',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateSelectText: {
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    classSelectBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    classSelectBtnActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.teacher.successBg,
      shadowColor: '#0c5a85',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    classSelectLocked: {
      opacity: 0.95,
    },
    classSelectText: { flex: 1, color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '700' },
    classSelectPlaceholderText: { color: colors.teacher.textSecondary },
    markBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    markBtnDisabled: {
      opacity: 0.5,
    },
    markBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
    stateHintWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    stateHintText: { flex: 1, fontSize: 11.5, fontWeight: '700' },
    stateHintTaken: { color: colors.state.success },
    stateHintPending: { color: colors.teacher.textSecondary },
    loadingState: {
      marginTop: 18,
    },
    banner: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bannerError: { backgroundColor: colors.teacher.dangerBg, borderWidth: 1, borderColor: colors.teacher.dangerBorder },
    bannerSuccess: { backgroundColor: colors.teacher.successBg, borderWidth: 1, borderColor: colors.teacher.successBorder },
    bannerText: { flex: 1, color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '600', paddingRight: 8 },
    bannerClose: { color: colors.teacher.textPrimary, fontWeight: '700', fontSize: 13 },
    tilesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 10 },
    tile: {
      width: '48.6%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 10,
    },
    tileValue: { color: colors.teacher.textPrimary, fontSize: 18, fontWeight: '900' },
    tileLabel: { marginTop: 3, color: colors.teacher.textSecondary, fontSize: 11.5, fontWeight: '700' },
    sectionTitle: { color: colors.teacher.textPrimary, fontSize: 13.5, fontWeight: '800', marginBottom: 8 },
    studentList: { flex: 1 },
    studentListContent: { paddingBottom: 12 },
    studentRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    studentLeft: { flex: 1 },
    studentName: { color: colors.teacher.textPrimary, fontSize: 13, fontWeight: '800' },
    studentMeta: { marginTop: 2, color: colors.teacher.textSecondary, fontSize: 11, fontWeight: '600' },
    statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
    presentBadge: { backgroundColor: colors.teacher.successBg, borderColor: colors.teacher.successBorder },
    absentBadge: { backgroundColor: colors.teacher.dangerBg, borderColor: colors.teacher.dangerBorder },
    pendingBadge: { backgroundColor: colors.teacher.surfaceStrong, borderColor: colors.teacher.borderSoft },
    statusBadgeText: { color: colors.teacher.textPrimary, fontSize: 10.5, fontWeight: '800', textTransform: 'capitalize' },
    emptyText: { marginTop: 20, textAlign: 'center', color: colors.teacher.textSecondary, fontSize: 12.5, fontWeight: '600' },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.teacher.modalBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    modalOverlayBottom: {
      flex: 1,
      backgroundColor: colors.teacher.modalBackdrop,
      justifyContent: 'flex-end',
    },
    closeBtn: {
      marginTop: 10,
      alignSelf: 'flex-end',
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    closeBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '700' },
    markModalCard: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 14,
      minHeight: '70%',
    },
    modalTitle: { color: colors.teacher.textPrimary, fontSize: 16, fontWeight: '800' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
    iconCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markScroll: { maxHeight: 420 },
    markRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    toggleWrap: { flexDirection: 'row', gap: 6 },
    toggleBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 6,
      backgroundColor: colors.teacher.surface,
    },
    toggleBtnActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
    toggleBtnDanger: { backgroundColor: colors.state.error, borderColor: colors.state.error },
    toggleText: { color: colors.teacher.textPrimary, fontSize: 11, fontWeight: '700' },
    toggleTextActive: { color: colors.text.inverse },
    toggleTextDanger: { color: colors.text.inverse },
    modalActionRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    cancelBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    cancelBtnText: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700' },
    submitBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      minWidth: 70,
      alignItems: 'center',
    },
    submitBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '700' },
    reportCard: {
      width: '100%',
      maxHeight: '80%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    dateRow: { marginTop: 8, flexDirection: 'row', gap: 8, marginBottom: 10 },
    dateBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    dateBtnText: { color: colors.teacher.textPrimary, fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
    dailyList: { maxHeight: 220, marginTop: 8 },
    dailyRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.teacher.borderSubtle,
      paddingVertical: 7,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dailyDate: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700' },
    dailyStatus: { fontSize: 11.5, fontWeight: '800', textTransform: 'capitalize' },
    dailyPresent: { color: colors.state.success },
    dailyAbsent: { color: colors.state.error },
  });
