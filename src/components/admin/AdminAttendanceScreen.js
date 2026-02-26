import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useAdminAttendanceSummaryByDateQuery,
  useAdminClassAttendanceByDateQuery,
  useAdminStudentAttendanceReportQuery,
} from '../../hooks/useAttendanceQueries';
import { getTodayIsoDate } from '../../services/attendanceService';
import { useAppTheme } from '../../theme/ThemeContext';
import AttendanceReportModal from '../common/AttendanceReportModal';

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date(getTodayIsoDate()) : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminAttendanceScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [classModal, setClassModal] = useState({ open: false, classId: '' });
  const [studentReportState, setStudentReportState] = useState({
    open: false,
    classId: '',
    studentId: '',
    studentName: '',
  });

  const dateIso = toIsoDate(selectedDate);
  const summaryQuery = useAdminAttendanceSummaryByDateQuery({ date: dateIso });
  const classDetailQuery = useAdminClassAttendanceByDateQuery({
    classId: classModal.classId,
    date: dateIso,
    enabled: classModal.open && Boolean(classModal.classId),
  });
  const studentReportQuery = useAdminStudentAttendanceReportQuery({
    classId: studentReportState.classId,
    studentId: studentReportState.studentId,
    enabled: studentReportState.open && Boolean(studentReportState.classId) && Boolean(studentReportState.studentId),
  });

  const summaryData = summaryQuery.data?.data?.data || [];
  const detail = classDetailQuery.data?.data ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>ATTENDANCE CONTROL ROOM</Text>
        <Text style={styles.heroTitle}>{dateIso}</Text>
        <Text style={styles.heroSub}>Review class wise status and open detailed student list.</Text>
      </View>

      <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar-outline" size={16} color={colors.admin.accent} />
        <Text style={styles.dateBtnText}>Change Date: {dateIso}</Text>
      </Pressable>

      {summaryQuery.isLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {summaryData.map(item => (
            <Pressable
              key={item.class.id}
              style={styles.classCard}
              onPress={() => setClassModal({ open: true, classId: item.class.id })}
            >
              <View style={styles.classHeader}>
                <Text style={styles.classTitle}>{item.class.name} - {item.class.section}</Text>
                <View style={[styles.statusPill, item.attendanceTaken ? styles.statusDone : styles.statusPending]}>
                  <Text style={styles.statusPillText}>{item.attendanceTaken ? 'Taken' : 'Pending'}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Total: {item.totalStudents}</Text>
                <Text style={styles.metaText}>Present: {item.presentCount}</Text>
                <Text style={styles.metaText}>Absent: {item.absentCount}</Text>
                <Text style={styles.metaText}>%: {item.presentPercentage}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal visible={classModal.open} transparent animationType="fade" onRequestClose={() => setClassModal({ open: false, classId: '' })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Class Attendance Detail</Text>
            {classDetailQuery.isLoading ? (
              <ActivityIndicator size="small" color={colors.brand.primary} />
            ) : detail ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>Present: {detail.presentCount}</Text>
                  <Text style={styles.summaryText}>Absent: {detail.absentCount}</Text>
                  <Text style={styles.summaryText}>Total: {detail.totalStudents}</Text>
                </View>
                <ScrollView style={styles.modalList}>
                  {[...(detail.presentStudents || []), ...(detail.absentStudents || [])].map(student => (
                    <Pressable
                      key={student.studentId}
                      style={styles.studentRow}
                      onPress={() =>
                        setStudentReportState({
                          open: true,
                          classId: detail?.class?.id || classModal.classId,
                          studentId: student.studentId,
                          studentName: student.studentName || 'Student',
                        })
                      }
                    >
                      <View>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        <Text style={styles.studentMeta}>Scholar #{student.scholarNumber || '-'}</Text>
                      </View>
                      <Text style={[styles.studentStatus, student.status === 'present' ? styles.presentText : styles.absentText]}>
                        {student.status}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.emptyText}>No details found.</Text>
            )}
            <Pressable style={styles.closeBtn} onPress={() => setClassModal({ open: false, classId: '' })}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showPicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      ) : null}

      <AttendanceReportModal
        visible={studentReportState.open}
        onClose={() =>
          setStudentReportState({ open: false, classId: '', studentId: '', studentName: '' })
        }
        loading={studentReportQuery.isLoading}
        report={studentReportQuery.data?.data}
        studentName={studentReportState.studentName}
      />
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    heroCard: {
      borderRadius: 18,
      backgroundColor: colors.admin.heroBg,
      padding: 14,
      marginBottom: 10,
    },
    heroKicker: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.4, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 23, fontWeight: '900' },
    heroSub: { marginTop: 4, color: colors.auth.subtitle, fontSize: 12, lineHeight: 17 },
    dateBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateBtnText: { color: colors.admin.textPrimary, fontSize: 12.5, fontWeight: '700' },
    list: { flex: 1 },
    classCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 11,
      marginBottom: 8,
    },
    classHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
    classTitle: { color: colors.admin.textPrimary, fontSize: 13, fontWeight: '800' },
    statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
    statusDone: { backgroundColor: colors.admin.successBg, borderColor: colors.admin.successBorder },
    statusPending: { backgroundColor: colors.admin.dangerBg, borderColor: colors.admin.dangerBorder },
    statusPillText: { color: colors.admin.textPrimary, fontSize: 10.5, fontWeight: '800' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaText: { color: colors.admin.textSecondary, fontSize: 11.5, fontWeight: '700' },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    modalCard: {
      width: '100%',
      maxHeight: '80%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
    },
    modalTitle: { color: colors.admin.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    summaryText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
    modalList: { maxHeight: 360 },
    studentRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.admin.borderSubtle,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    studentName: { color: colors.admin.textPrimary, fontSize: 12.5, fontWeight: '800' },
    studentMeta: { color: colors.admin.textSecondary, fontSize: 11, marginTop: 1 },
    studentStatus: { fontSize: 11.5, fontWeight: '800', textTransform: 'capitalize' },
    presentText: { color: colors.state.success },
    absentText: { color: colors.state.error },
    emptyText: { textAlign: 'center', color: colors.admin.textSecondary, fontSize: 12.5 },
    closeBtn: {
      marginTop: 10,
      alignSelf: 'flex-end',
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    closeBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '700' },
  });
