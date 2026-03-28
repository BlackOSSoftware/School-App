import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppIcon from '../common/AppIcon.js';
import { useClassesQuery } from '../../hooks/useClassQueries';
import { useBusesQuery } from '../../hooks/useBusQueries';
import {
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useStudentDetailQuery,
  useStudentsQuery,
  useUpdateStudentMutation,
} from '../../hooks/useStudentQueries';
import { useAdminStudentAttendanceReportQuery } from '../../hooks/useAttendanceQueries';
import { useAppTheme } from '../../theme/ThemeContext';
import PaginationControls from '../common/PaginationControls';
import AttendanceReportModal from '../common/AttendanceReportModal';
import KeyboardAwareModal from '../common/KeyboardAwareModal';
import SelectorModal from '../common/SelectorModal';

const PAGE_LIMIT = 10;

function getErrorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function getEntityId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') {
      return nested.trim();
    }
    if (nested && typeof nested === 'object' && typeof nested.$oid === 'string') {
      return nested.$oid.trim();
    }
  }
  return '';
}

function getClassLabel(value, classLabelById) {
  if (!value) {
    return 'Not assigned';
  }
  if (typeof value === 'string') {
    return classLabelById.get(value) ?? value;
  }
  if (typeof value === 'object') {
    const id = getEntityId(value);
    if (id && classLabelById.has(id)) {
      return classLabelById.get(id);
    }
    const name = String(value?.name ?? '').trim();
    const section = String(value?.section ?? '').trim();
    return name || section ? `${name}${section ? ` - ${section}` : ''}` : 'Not assigned';
  }
  return 'Not assigned';
}

function getClassIdForReport(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return getEntityId(value);
}

function getBusLabel(value, busLabelById) {
  if (!value) {
    return 'Not assigned';
  }
  if (typeof value === 'string') {
    return busLabelById.get(value) ?? value;
  }
  if (typeof value === 'object') {
    const id = getEntityId(value);
    if (id && busLabelById.has(id)) {
      return busLabelById.get(id);
    }
    const busNumber = String(value?.busNumber ?? '').trim();
    const routeName = String(value?.routeName ?? '').trim();
    return busNumber && routeName ? `${busNumber} - ${routeName}` : busNumber || routeName || 'Not assigned';
  }
  return 'Not assigned';
}

function MessageBanner({ text, type, onClose, styles }) {
  if (!text) {
    return null;
  }
  return (
    <View style={[styles.banner, type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={styles.bannerText}>{text}</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.bannerClose}>x</Text>
      </Pressable>
    </View>
  );
}

function buildInitialForm(student) {
  return {
    name: String(student?.name ?? student?.firstName ?? ''),
    scholarNumber: String(student?.scholarNumber ?? ''),
    parentName: String(student?.parentName ?? ''),
    number: String(student?.phoneNumber ?? student?.number ?? ''),
    classId: getEntityId(student?.classId),
    busId: getEntityId(student?.busId),
    status: String(student?.status ?? 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    password: '',
  };
}

function StudentFormModal({
  visible,
  onClose,
  onSave,
  styles,
  colors,
  isSaving,
  mode,
  form,
  setForm,
  classLabelById,
  busLabelById,
  openClassPicker,
  openBusPicker,
  classPickerOpen,
  busPickerOpen,
  onCloseClassPicker,
  onCloseBusPicker,
  onSelectClass,
  onSelectBus,
  classList,
  busList,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAwareModal
        overlayStyle={styles.formModalOverlay}
        scrollContentStyle={styles.formModalScroll}
        contentContainerStyle={styles.formCard}
        dismissKeyboardOnBackdrop
      >
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>{mode === 'create' ? 'Create Student' : 'Edit Student'}</Text>
              <Pressable style={styles.headerCloseBtn} onPress={onClose}>
                <Text style={styles.headerCloseText}>x</Text>
              </Pressable>
            </View>
            <Text style={styles.formHint}>
              Capture verified student records for premium-grade admissions and guardian outreach.
            </Text>

            <Text style={styles.inputLabel}>Student Name</Text>
            <View style={styles.inputRow}>
              <AppIcon name="person-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.name}
                onChangeText={value => setForm(prev => ({ ...prev, name: value }))}
                placeholder="Student name"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Scholar Number</Text>
            <View style={styles.inputRow}>
              <AppIcon name="id-card-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.scholarNumber}
                onChangeText={value => setForm(prev => ({ ...prev, scholarNumber: value }))}
                placeholder="e.g. 2000"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Parent Name</Text>
            <View style={styles.inputRow}>
              <AppIcon name="people-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.parentName}
                onChangeText={value => setForm(prev => ({ ...prev, parentName: value }))}
                placeholder="Parent name"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputRow}>
              <AppIcon name="call-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.number}
                onChangeText={value => setForm(prev => ({ ...prev, number: value }))}
                keyboardType="phone-pad"
                placeholder="9876500005"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Class</Text>
            <Pressable style={styles.selectBtn} onPress={() => openClassPicker('form')}>
              <AppIcon name="business-outline" size={16} color={colors.admin.accent} />
              <Text style={styles.selectBtnText}>
                {form.classId ? classLabelById.get(form.classId) ?? form.classId : 'Select class'}
              </Text>
              <AppIcon name="chevron-down" size={16} color={colors.admin.textSecondary} />
            </Pressable>

            <Text style={styles.inputLabel}>Bus (optional)</Text>
            <Pressable style={styles.selectBtn} onPress={() => openBusPicker('form')}>
              <AppIcon name="bus-outline" size={16} color={colors.admin.accent} />
              <Text style={styles.selectBtnText}>
                {form.busId ? busLabelById.get(form.busId) ?? form.busId : 'Select bus'}
              </Text>
              <AppIcon name="chevron-down" size={16} color={colors.admin.textSecondary} />
            </Pressable>

            {mode === 'edit' ? (
              <>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.segmentWrap}>
                  <Pressable
                    style={[styles.segmentBtn, form.status === 'active' ? styles.segmentBtnActive : null]}
                    onPress={() => setForm(prev => ({ ...prev, status: 'active' }))}
                  >
                    <Text style={[styles.segmentText, form.status === 'active' ? styles.segmentTextActive : null]}>
                      Active
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentBtn, form.status === 'inactive' ? styles.segmentBtnActive : null]}
                    onPress={() => setForm(prev => ({ ...prev, status: 'inactive' }))}
                  >
                    <Text style={[styles.segmentText, form.status === 'inactive' ? styles.segmentTextActive : null]}>
                      Inactive
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.statusHint}>
                <Text style={styles.statusHintText}>Default status: Active</Text>
              </View>
            )}

            {mode === 'edit' ? (
              <>
                <Text style={styles.inputLabel}>Password (optional)</Text>
                <View style={styles.inputRow}>
                  <AppIcon name="lock-closed-outline" size={17} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    value={form.password}
                    onChangeText={value => setForm(prev => ({ ...prev, password: value }))}
                    secureTextEntry
                    placeholder="Leave blank to keep existing"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={onSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.saveBtnText}>{mode === 'create' ? 'Create Student' : 'Save'}</Text>
                )}
              </Pressable>
            </View>

            <SelectorModal
              visible={classPickerOpen}
              onClose={onCloseClassPicker}
              onSelect={onSelectClass}
              title="Select Class"
              searchPlaceholder="Search class or section"
              items={classList}
              selectedValue={form.classId}
              includeNone
              noneLabel="None"
              valueExtractor={item => getEntityId(item)}
              labelExtractor={item => `${item?.name ?? '-'} - ${item?.section ?? '-'}`}
            />

            <SelectorModal
              visible={busPickerOpen}
              onClose={onCloseBusPicker}
              onSelect={onSelectBus}
              title="Select Bus"
              searchPlaceholder="Search bus number or route"
              items={busList}
              selectedValue={form.busId}
              includeNone
              noneLabel="No Bus"
              valueExtractor={item => getEntityId(item)}
              labelExtractor={item => {
                const busNumber = String(item?.busNumber ?? '').trim();
                const routeName = String(item?.routeName ?? '').trim();
                return busNumber && routeName ? `${busNumber} - ${routeName}` : busNumber || routeName || '-';
              }}
            />
      </KeyboardAwareModal>
    </Modal>
  );
}

function StudentListCard({
  item,
  styles,
  colors,
  classLabelById,
  busLabelById,
  onOpenDetail,
  onEdit,
  onDelete,
  deletingId,
}) {
  const studentId = getEntityId(item);
  const status = String(item?.status ?? 'active').toLowerCase();
  const inactive = status === 'inactive';

  return (
    <Pressable style={styles.studentCard} onPress={() => onOpenDetail(studentId)}>
      <View style={styles.studentCardTop}>
        <View style={styles.studentIdentityRow}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>{String(item?.name ?? 'S').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.studentNameWrap}>
            <Text style={styles.studentName}>{item.name ?? '-'}</Text>
            <Text style={styles.studentScholar}>Scholar #{item.scholarNumber ?? '-'}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, inactive ? styles.statusPillInactive : styles.statusPillActive]}>
          <Text style={styles.statusPillText}>{inactive ? 'Inactive' : 'Active'}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <AppIcon name="people-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Parent: {item.parentName ?? '-'}</Text>
        </View>
        <View style={styles.metaBox}>
          <AppIcon name="call-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Phone: {item.phoneNumber ?? '-'}</Text>
        </View>
        <View style={[styles.metaBox, styles.metaBoxWide]}>
          <AppIcon name="business-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Class: {getClassLabel(item.classId, classLabelById)}</Text>
        </View>
        <View style={[styles.metaBox, styles.metaBoxWide]}>
          <AppIcon name="bus-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Bus: {getBusLabel(item.busId, busLabelById)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <AppIcon name="create-outline" size={14} color={colors.admin.textPrimary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(studentId)} disabled={!studentId || deletingId === studentId}>
          {deletingId === studentId ? (
            <ActivityIndicator size="small" color={colors.state.error} />
          ) : (
            <>
              <AppIcon name="trash-outline" size={14} color={colors.state.error} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AdminStudentScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [classPickerState, setClassPickerState] = useState({ open: false, target: 'filter' });
  const [busPickerState, setBusPickerState] = useState({ open: false, target: 'form' });
  const [modalState, setModalState] = useState({ visible: false, mode: 'create', studentId: '' });
  const [form, setForm] = useState(buildInitialForm());
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const reveal = useRef(new Animated.Value(0)).current;

  const classesQuery = useClassesQuery(1, 200);
  const busesQuery = useBusesQuery({ page: 1, limit: 200, search: '' });
  const studentsQuery = useStudentsQuery({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch,
    classId: selectedClassId,
  });
  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();
  const deleteMutation = useDeleteStudentMutation();
  const detailQuery = useStudentDetailQuery(selectedStudentId, detailVisible);
  const selectedStudentDetail = detailQuery.data?.data ?? null;
  const reportClassId = getClassIdForReport(selectedStudentDetail?.classId);
  const reportQuery = useAdminStudentAttendanceReportQuery({
    classId: reportClassId,
    studentId: selectedStudentId,
    enabled: reportOpen && Boolean(reportClassId) && Boolean(selectedStudentId),
  });

  const classList = useMemo(
    () => (Array.isArray(classesQuery.data?.data) ? classesQuery.data.data : []),
    [classesQuery.data?.data],
  );
  const classLabelById = useMemo(() => {
    const map = new Map();
    classList.forEach(item => {
      const classId = getEntityId(item);
      if (classId) {
        map.set(classId, `${item.name} - ${item.section}`);
      }
    });
    return map;
  }, [classList]);
  const busList = useMemo(
    () => (Array.isArray(busesQuery.data?.data) ? busesQuery.data.data : []),
    [busesQuery.data?.data],
  );
  const busLabelById = useMemo(() => {
    const map = new Map();
    busList.forEach(item => {
      const busId = getEntityId(item);
      if (busId) {
        const busNumber = String(item?.busNumber ?? '').trim();
        const routeName = String(item?.routeName ?? '').trim();
        map.set(busId, busNumber && routeName ? `${busNumber} - ${routeName}` : busNumber || routeName || busId);
      }
    });
    return map;
  }, [busList]);

  const listResponse = studentsQuery.data ?? {};
  const studentList = Array.isArray(listResponse.data) ? listResponse.data : [];
  const totalPages = Number(listResponse.totalPages ?? 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [debouncedSearch, page, reveal]);

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  const closeMessage = () => setMessage({ type: '', text: '' });

  const openCreateModal = () => {
    setForm(buildInitialForm());
    setModalState({ visible: true, mode: 'create', studentId: '' });
  };

  const openEditModal = student => {
    const studentId = getEntityId(student);
    if (!studentId) {
      setMessage({ type: 'error', text: 'Invalid student record selected.' });
      return;
    }
    setForm(buildInitialForm(student));
    setModalState({ visible: true, mode: 'edit', studentId });
  };

  const closeModal = () => setModalState({ visible: false, mode: 'create', studentId: '' });

  const onSelectClass = classId => {
    if (classPickerState.target === 'filter') {
      setSelectedClassId(classId || '');
      setPage(1);
    } else {
      setForm(prev => ({ ...prev, classId: classId || '' }));
    }
    setClassPickerState({ open: false, target: 'filter' });
  };

  const onSelectBus = busId => {
    setForm(prev => ({ ...prev, busId: busId || '' }));
    setBusPickerState({ open: false, target: 'form' });
  };

  const saveStudent = async () => {
    if (!form.name.trim() || !form.scholarNumber.trim() || !form.parentName.trim() || !form.number.trim()) {
      setMessage({ type: 'error', text: 'Name, scholar number, parent name and phone are required.' });
      return;
    }

    try {
      if (modalState.mode === 'create') {
        const result = await createMutation.mutateAsync({
          name: form.name,
          scholarNumber: form.scholarNumber,
          parentName: form.parentName,
          number: form.number,
          classId: form.classId,
          busId: form.busId || null,
          status: 'active',
        });
        const generatedPassword =
          result?.generatedPassword ??
          result?.password ??
          result?.data?.generatedPassword ??
          result?.data?.password;
        setMessage({
          type: 'success',
          text: generatedPassword
            ? `Student created. Generated password: ${generatedPassword}`
            : 'Student created successfully.',
        });
      } else {
        await updateMutation.mutateAsync({
          id: modalState.studentId,
          payload: {
            name: form.name,
            scholarNumber: form.scholarNumber,
            parentName: form.parentName,
            number: form.number,
            classId: form.classId,
            busId: form.busId || null,
            status: form.status,
            password: form.password || undefined,
          },
        });
        setMessage({ type: 'success', text: 'Student updated successfully.' });
      }
      closeModal();
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, modalState.mode === 'create' ? 'Unable to create student.' : 'Unable to update student.'),
      });
    }
  };

  const deleteStudent = async id => {
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid student id for delete.' });
      return;
    }
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      setMessage({ type: 'success', text: 'Student deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete student.') });
    } finally {
      setDeletingId('');
    }
  };

  const openDetail = id => {
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid student id for details.' });
      return;
    }
    setSelectedStudentId(id);
    setDetailVisible(true);
    setReportOpen(false);
  };

  if (detailVisible) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHero}>
          <Pressable style={styles.detailBackBtn} onPress={() => setDetailVisible(false)}>
            <AppIcon name="chevron-back" size={18} color={colors.admin.textPrimary} />
            <Text style={styles.detailBackText}>Back</Text>
          </Pressable>
          <Text style={styles.detailTitle}>Student Profile</Text>
          <Text style={styles.detailSubTitle}>Verified record view with guardian details.</Text>
        </View>

        {detailQuery.isLoading ? (
          <View style={styles.detailLoaderWrap}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
          </View>
        ) : selectedStudentDetail ? (
          <ScrollView style={styles.detailScrollScreen} showsVerticalScrollIndicator={false}>
            <View style={styles.detailInfoCard}>
              <View style={styles.detailRow}>
                <AppIcon name="person-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Name: {selectedStudentDetail.name ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="id-card-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Scholar Number: {selectedStudentDetail.scholarNumber ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="people-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Parent Name: {selectedStudentDetail.parentName ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="call-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Phone: {selectedStudentDetail.phoneNumber ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="business-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>
                  Class: {getClassLabel(selectedStudentDetail.classId, classLabelById)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="bus-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>
                  Bus: {getBusLabel(selectedStudentDetail.busId, busLabelById)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="calendar-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Session: {selectedStudentDetail?.sessionId?.name ?? '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <AppIcon name="checkmark-circle-outline" size={16} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Status: {selectedStudentDetail.status ?? '-'}</Text>
              </View>
            </View>

            <Pressable
              style={styles.attendanceReportBtn}
              onPress={() => setReportOpen(true)}
              disabled={!reportClassId}
            >
              <AppIcon name="bar-chart-outline" size={16} color={colors.text.inverse} />
              <Text style={styles.attendanceReportText}>View Attendance Report</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <Text style={styles.placeholderText}>No details available.</Text>
        )}

        <AttendanceReportModal
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          loading={reportQuery.isLoading}
          report={reportQuery.data?.data}
          studentName={selectedStudentDetail?.name || 'Student'}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <Text style={styles.heroOverline}>STUDENT EXPERIENCE SUITE</Text>
        <Text style={styles.heroTitle}>Student Command Center</Text>
        <Text style={styles.heroSub}>
          Curate flawless admissions data, guardian reach, and class-ready profiles at scale.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.filterRow,
          {
            opacity: reveal.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable style={styles.filterBtn} onPress={() => setClassPickerState({ open: true, target: 'filter' })}>
          <AppIcon name="funnel-outline" size={16} color={colors.admin.accent} />
          <Text style={styles.filterText}>
            {selectedClassId ? classLabelById.get(selectedClassId) ?? 'Selected class' : 'All Classes'}
          </Text>
          <AppIcon name="chevron-down" size={16} color={colors.admin.textSecondary} />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.searchRow,
          {
            opacity: reveal.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.searchInputRow}>
          <AppIcon name="search-outline" size={17} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, scholar number, or guardian"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={openCreateModal}>
          <View style={styles.inlineAction}>
            <AppIcon name="add" size={14} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Add</Text>
          </View>
        </Pressable>
      </Animated.View>

      <MessageBanner text={message.text} type={message.type} onClose={closeMessage} styles={styles} />

      <FlatList
        data={studentList}
        keyExtractor={(item, index) => getEntityId(item) || `student-${index}`}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={40}
        renderItem={({ item, index }) => {
          const itemStyle = {
            opacity: reveal.interpolate({
              inputRange: [0, 0.3 + index * 0.06, 1],
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
          };
          return (
            <Animated.View style={itemStyle}>
              <StudentListCard
                item={item}
                styles={styles}
                colors={colors}
                classLabelById={classLabelById}
                busLabelById={busLabelById}
                onOpenDetail={openDetail}
                onEdit={openEditModal}
                onDelete={deleteStudent}
                deletingId={deletingId}
              />
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          studentsQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Text style={styles.placeholderText}>No student profiles yet.</Text>
          )
        }
        ListFooterComponent={
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onFirst={() => setPage(1)}
            onPrev={() => setPage(prev => Math.max(1, prev - 1))}
            onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
            onLast={() => setPage(totalPages)}
            disableFirst={page <= 1}
            disablePrev={page <= 1}
            disableNext={page >= totalPages}
            disableLast={page >= totalPages}
          />
        }
      />

      <StudentFormModal
        visible={modalState.visible}
        onClose={closeModal}
        onSave={saveStudent}
        styles={styles}
        colors={colors}
        isSaving={createMutation.isPending || updateMutation.isPending}
        mode={modalState.mode}
        form={form}
        setForm={setForm}
        classLabelById={classLabelById}
        busLabelById={busLabelById}
        openClassPicker={() => setClassPickerState({ open: true, target: 'form' })}
        openBusPicker={() => setBusPickerState({ open: true, target: 'form' })}
        classPickerOpen={classPickerState.open && classPickerState.target === 'form'}
        busPickerOpen={busPickerState.open && busPickerState.target === 'form'}
        onCloseClassPicker={() => setClassPickerState({ open: false, target: 'form' })}
        onCloseBusPicker={() => setBusPickerState({ open: false, target: 'form' })}
        onSelectClass={classId => onSelectClass(classId)}
        onSelectBus={onSelectBus}
        classList={classList}
        busList={busList}
      />

      <SelectorModal
        visible={classPickerState.open && classPickerState.target === 'filter'}
        onClose={() => setClassPickerState({ open: false, target: 'filter' })}
        onSelect={onSelectClass}
        title="Select Class"
        searchPlaceholder="Search class or section"
        items={classList}
        selectedValue={classPickerState.target === 'filter' ? selectedClassId : form.classId}
        includeNone
        noneLabel={classPickerState.target === 'filter' ? 'All Classes' : 'None'}
        valueExtractor={item => getEntityId(item)}
        labelExtractor={item => `${item?.name ?? '-'} - ${item?.section ?? '-'}`}
      />
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    heroCard: {
      borderRadius: 18,
      backgroundColor: colors.admin.heroBg,
      padding: 14,
      marginBottom: 10,
    },
    heroOverline: {
      color: colors.auth.subtitle,
      fontSize: 10.5,
      letterSpacing: 1.6,
      fontWeight: '800',
    },
    heroTitle: {
      marginTop: 6,
      color: colors.text.inverse,
      fontSize: 25,
      fontWeight: '900',
    },
    heroSub: {
      marginTop: 5,
      color: colors.auth.subtitle,
      fontSize: 12.5,
      lineHeight: 18,
    },
    filterRow: {
      marginBottom: 8,
    },
    filterBtn: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterText: {
      flex: 1,
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    searchInputRow: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchIcon: {
      color: colors.admin.accent,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: colors.admin.textPrimary,
    },
    addBtn: {
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    addBtnText: {
      color: colors.text.inverse,
      fontWeight: '800',
      fontSize: 13,
    },
    inlineAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    banner: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bannerError: {
      backgroundColor: colors.admin.dangerBg,
      borderWidth: 1,
      borderColor: colors.admin.dangerBorder,
    },
    bannerSuccess: {
      backgroundColor: colors.admin.successBg,
      borderWidth: 1,
      borderColor: colors.admin.successBorder,
    },
    bannerText: {
      flex: 1,
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      paddingRight: 10,
    },
    bannerClose: {
      color: colors.admin.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    listContent: {
      paddingBottom: 20,
    },
    detailHero: {
      borderRadius: 18,
      backgroundColor: colors.admin.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      padding: 14,
      marginBottom: 12,
    },
    detailBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    detailBackText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    detailTitle: {
      marginTop: 10,
      color: colors.text.inverse,
      fontSize: 24,
      fontWeight: '900',
    },
    detailSubTitle: {
      marginTop: 3,
      color: colors.auth.subtitle,
      fontSize: 12.5,
      fontWeight: '600',
    },
    detailLoaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailScrollScreen: {
      flex: 1,
    },
    detailInfoCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.admin.borderSubtle,
    },
    studentCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 13,
      marginBottom: 12,
    },
    studentCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    studentIdentityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    studentAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.admin.navBg,
    },
    studentAvatarText: {
      color: colors.text.inverse,
      fontSize: 14,
      fontWeight: '800',
    },
    studentNameWrap: {
      flex: 1,
    },
    studentName: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    studentScholar: {
      marginTop: 2,
      color: colors.admin.textSecondary,
      fontSize: 11.5,
      fontWeight: '600',
    },
    statusPill: {
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderWidth: 1,
    },
    statusPillActive: {
      backgroundColor: colors.admin.successBg,
      borderColor: colors.admin.successBorder,
    },
    statusPillInactive: {
      backgroundColor: colors.admin.dangerBg,
      borderColor: colors.admin.dangerBorder,
    },
    statusPillText: {
      color: colors.admin.textPrimary,
      fontSize: 10.5,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 8,
      marginBottom: 10,
    },
    metaBox: {
      width: '48.7%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSubtle,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    metaBoxWide: {
      width: '100%',
    },
    metaBoxText: {
      color: colors.admin.textSecondary,
      fontSize: 11.5,
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    editBtn: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingHorizontal: 12,
      paddingVertical: 7,
      minWidth: 78,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    editBtnText: {
      color: colors.admin.textPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    deleteBtn: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.state.error,
      minWidth: 64,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexDirection: 'row',
      gap: 5,
    },
    deleteBtnText: {
      color: colors.state.error,
      fontWeight: '700',
      fontSize: 12,
    },
    placeholderText: {
      color: colors.admin.textSecondary,
      textAlign: 'center',
      marginTop: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    selectorCard: {
      width: '100%',
      maxHeight: '70%',
      borderRadius: 14,
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      padding: 12,
    },
    selectorTitle: {
      color: colors.admin.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 10,
    },
    selectorList: {
      maxHeight: 280,
    },
    selectorItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.admin.borderSubtle,
    },
    selectorItemText: {
      color: colors.admin.textPrimary,
      fontSize: 13,
    },
    selectorCloseBtn: {
      marginTop: 10,
      alignSelf: 'flex-end',
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    selectorCloseText: {
      color: colors.text.inverse,
      fontWeight: '700',
      fontSize: 12,
    },
    formModalOverlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    formModalScroll: {
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    formCard: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 18,
      minHeight: '74%',
    },
    formHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    formTitle: {
      color: colors.admin.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    formHint: {
      color: colors.admin.textSecondary,
      fontSize: 12.5,
      marginTop: 4,
      marginBottom: 14,
      lineHeight: 18,
    },
    headerCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
    },
    headerCloseText: {
      color: colors.admin.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    inputLabel: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
    },
    inputRow: {
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.admin.surfaceStrong,
    },
    inputIcon: {
      color: colors.admin.accent,
      marginRight: 8,
    },
    inputWithIcon: {
      flex: 1,
      color: colors.admin.textPrimary,
      paddingVertical: 11,
      fontSize: 13.5,
    },
    selectBtn: {
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 12,
      backgroundColor: colors.admin.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectBtnText: {
      color: colors.admin.textPrimary,
      fontSize: 13.5,
      fontWeight: '600',
      flex: 1,
    },
    segmentWrap: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 10,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: 'center',
      backgroundColor: colors.admin.surface,
    },
    segmentBtnActive: {
      backgroundColor: colors.brand.primary,
    },
    segmentText: {
      color: colors.admin.textPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    segmentTextActive: {
      color: colors.text.inverse,
    },
    statusHint: {
      borderRadius: 10,
      backgroundColor: colors.admin.surfaceStrong,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },
    statusHintText: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    modalActions: {
      marginTop: 8,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    cancelBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    cancelBtnText: {
      color: colors.admin.textPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    saveBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      minWidth: 68,
      alignItems: 'center',
    },
    saveBtnText: {
      color: colors.text.inverse,
      fontWeight: '700',
      fontSize: 12,
    },
    detailCard: {
      width: '100%',
      maxHeight: '78%',
      borderRadius: 14,
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      padding: 14,
    },
    detailScroll: {
      maxHeight: 360,
    },
    detailLine: {
      color: colors.admin.textPrimary,
      fontSize: 13,
      marginBottom: 6,
    },
    attendanceReportBtn: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: colors.brand.primary,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
      marginBottom: 20,
    },
    attendanceReportText: {
      color: colors.text.inverse,
      fontSize: 13,
      fontWeight: '800',
    },
  });
