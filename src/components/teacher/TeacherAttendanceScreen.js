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
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useMarkTeacherClassAttendanceMutation,
  useTeacherClassAttendanceByDateQuery,
  useTeacherStudentAttendanceReportQuery,
} from '../../hooks/useAttendanceQueries';
import { useTeacherClassesOverviewQuery, useTeacherStudentsByClassQuery } from '../../hooks/useTeacherQueries';
import { getTodayIsoDate } from '../../services/attendanceService';
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

export default function TeacherAttendanceScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [today, setToday] = useState(getTodayIsoDate());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classPickerVisible, setClassPickerVisible] = useState(false);
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

  const classes = useMemo(
    () => (Array.isArray(overviewQuery.data?.assignedClasses) ? overviewQuery.data.assignedClasses : []),
    [overviewQuery.data?.assignedClasses],
  );

  useEffect(() => {
    if (!selectedClassId && classes.length) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const attendanceQuery = useTeacherClassAttendanceByDateQuery({
    classId: selectedClassId,
    date: today,
    enabled: Boolean(selectedClassId),
  });

  const studentsQuery = useTeacherStudentsByClassQuery({
    classId: selectedClassId,
    page: 1,
    limit: 200,
    enabled: Boolean(selectedClassId),
  });

  const reportQuery = useTeacherStudentAttendanceReportQuery({
    classId: selectedClassId,
    studentId: reportStudent?.id,
    from: toIsoDate(fromDate),
    to: toIsoDate(toDate),
    enabled: reportVisible && Boolean(reportStudent?.id),
  });

  const summary = attendanceQuery.data?.data ?? null;
  const selectedClass = classes.find(item => item.id === selectedClassId) ?? null;

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2500);
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

  const openMarkModal = () => {
    const classStudents = Array.isArray(studentsQuery.data?.students) ? studentsQuery.data.students : [];
    const existingMap = {};
    (summary?.presentStudents || []).forEach(item => {
      existingMap[item.studentId] = 'present';
    });
    (summary?.absentStudents || []).forEach(item => {
      existingMap[item.studentId] = 'absent';
    });

    const draft = {};
    classStudents.forEach(student => {
      draft[student.id] = existingMap[student.id] || 'absent';
    });
    setDraftAttendance(draft);
    setMarkModalVisible(true);
  };

  const submitAttendance = async () => {
    const payload = Object.entries(draftAttendance).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    try {
      await markMutation.mutateAsync({
        classId: selectedClassId,
        date: today,
        attendance: payload,
      });
      setMessage({ type: 'success', text: 'Attendance saved successfully.' });
      setMarkModalVisible(false);
      attendanceQuery.refetch();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to save attendance.') });
    }
  };

  const classStudents = Array.isArray(studentsQuery.data?.students) ? studentsQuery.data.students : [];

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>TODAY ATTENDANCE</Text>
        <Text style={styles.heroTitle}>{today}</Text>
        <Text style={styles.heroSub}>Mark and review attendance class-wise.</Text>
      </View>

      <View style={styles.controlRow}>
        <Pressable style={styles.classSelectBtn} onPress={() => setClassPickerVisible(true)}>
          <Ionicons name="library-outline" size={16} color={colors.teacher.accent} />
          <Text style={styles.classSelectText}>{selectedClass?.label || 'Select class'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.teacher.textSecondary} />
        </Pressable>
        <Pressable style={styles.markBtn} onPress={openMarkModal} disabled={!selectedClassId || markMutation.isPending}>
          <Ionicons name="create-outline" size={14} color={colors.text.inverse} />
          <Text style={styles.markBtnText}>Mark</Text>
        </Pressable>
      </View>

      <MessageBanner
        message={message.text}
        type={message.type}
        onClose={() => setMessage({ type: '', text: '' })}
        styles={styles}
      />

      {attendanceQuery.isLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : summary ? (
        <>
          <View style={styles.tilesRow}>
            <SummaryTile label="Present" value={summary.presentCount} styles={styles} />
            <SummaryTile label="Absent" value={summary.absentCount} styles={styles} />
            <SummaryTile label="Total" value={summary.totalStudents} styles={styles} />
            <SummaryTile label="%" value={`${summary.presentPercentage}`} styles={styles} />
          </View>

          <Text style={styles.sectionTitle}>Students</Text>
          <ScrollView style={styles.studentList} showsVerticalScrollIndicator={false}>
            {[...(summary.presentStudents || []), ...(summary.absentStudents || [])].map(student => (
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
                <View
                  style={[
                    styles.statusBadge,
                    student.status === 'present' ? styles.presentBadge : styles.absentBadge,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{student.status}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : (
        <Text style={styles.emptyText}>No attendance data available.</Text>
      )}

      <Modal visible={classPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <ScrollView style={styles.pickerList}>
              {classes.map(item => (
                <Pressable
                  key={item.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedClassId(item.id);
                    setClassPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setClassPickerVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={markModalVisible} transparent animationType="slide" onRequestClose={() => setMarkModalVisible(false)}>
        <View style={styles.modalOverlayBottom}>
          <View style={styles.markModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Mark Attendance ({today})</Text>
              <Pressable style={styles.iconCloseBtn} onPress={() => setMarkModalVisible(false)}>
                <Ionicons name="close" size={16} color={colors.teacher.textPrimary} />
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
                  <Text style={styles.submitBtnText}>Submit</Text>
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
                <Text style={styles.dateBtnText}>From: {toIsoDate(fromDate)}</Text>
              </Pressable>
              <Pressable style={styles.dateBtn} onPress={() => setPickerField('to')}>
                <Text style={styles.dateBtnText}>To: {toIsoDate(toDate)}</Text>
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
                      <Text style={styles.dailyDate}>{item.date}</Text>
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
          value={pickerField === 'from' ? fromDate : toDate}
          mode="date"
          onChange={(_, date) => {
            setPickerField('');
            if (!date) {
              return;
            }
            if (pickerField === 'from') {
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
    controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
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
    classSelectText: { flex: 1, color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '700' },
    markBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    markBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
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
    statusBadgeText: { color: colors.teacher.textPrimary, fontSize: 10.5, fontWeight: '800' },
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
    pickerCard: {
      width: '100%',
      maxHeight: '70%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    pickerList: { maxHeight: 260 },
    pickerItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.teacher.borderSubtle },
    pickerItemText: { color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '700' },
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
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
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
