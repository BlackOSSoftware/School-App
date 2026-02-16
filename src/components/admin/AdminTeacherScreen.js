import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useCreateTeacherMutation,
  useDeleteTeacherMutation,
  useTeacherDetailQuery,
  useTeachersQuery,
  useUpdateTeacherMutation,
} from '../../hooks/useTeacherQueries';
import { useClassesQuery } from '../../hooks/useClassQueries';
import { useAppTheme } from '../../theme/ThemeContext';
import PaginationControls from '../common/PaginationControls';

const PAGE_LIMIT = 10;

function getErrorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function normalizeSubjectsInput(value) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getEntityId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return String(value?._id ?? value?.id ?? '');
  }
  return '';
}

function getClassDisplay(value, classLabelById) {
  if (!value) {
    return 'Not assigned';
  }
  if (typeof value === 'string') {
    return classLabelById?.get(value) ?? value;
  }
  if (typeof value === 'object') {
    const name = String(value?.name ?? '').trim();
    const section = String(value?.section ?? '').trim();
    if (name || section) {
      return section ? `${name} - ${section}` : name;
    }
    const id = getEntityId(value);
    return (classLabelById?.get(id) ?? id) || 'Not assigned';
  }
  return String(value);
}

function normalizeAssignmentsInput(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map(item => ({
      classId: getEntityId(item?.classId) || null,
      subject: String(item?.subject ?? '').trim(),
    }))
    .filter(item => item.subject);
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

function ClassSelectModal({ visible, onClose, classes, onSelect, styles }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.selectorCard}>
          <Text style={styles.selectorTitle}>Select Class</Text>
          <ScrollView style={styles.selectorList}>
            <Pressable style={styles.selectorItem} onPress={() => onSelect('')}>
              <Text style={styles.selectorItemText}>None</Text>
            </Pressable>
            {classes.map(item => (
              <Pressable
                key={item._id}
                style={styles.selectorItem}
                onPress={() => onSelect(item._id)}
              >
                <Text style={styles.selectorItemText}>
                  {item.name} - {item.section}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.selectorCloseBtn} onPress={onClose}>
            <Text style={styles.selectorCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function TeacherFormModal({
  visible,
  onClose,
  onSave,
  classes,
  styles,
  colors,
  isSaving,
  title,
  form,
  setForm,
}) {
  const [classPicker, setClassPicker] = useState({ open: false, target: '' });

  const classLabelById = useMemo(() => {
    const map = new Map();
    classes.forEach(item => {
      map.set(item._id, `${item.name} - ${item.section}`);
    });
    return map;
  }, [classes]);

  const subjects = useMemo(() => normalizeSubjectsInput(form.subjectsInput), [form.subjectsInput]);

  const applyAssignmentSubjectRules = assignments =>
    assignments.map(item => {
      if (item.subject) {
        return item;
      }
      if (subjects.length === 1) {
        return { ...item, subject: subjects[0] };
      }
      return item;
    });

  const updateAssignments = updater => {
    setForm(prev => {
      const nextAssignments = updater(prev.assignments);
      return {
        ...prev,
        assignments: applyAssignmentSubjectRules(nextAssignments),
      };
    });
  };

  const openPicker = target => setClassPicker({ open: true, target });
  const closePicker = () => setClassPicker({ open: false, target: '' });

  const onSelectClass = classId => {
    if (classPicker.target === 'classTeacherOf') {
      setForm(prev => ({ ...prev, classTeacherOf: classId || '' }));
    } else if (classPicker.target.startsWith('assignment:')) {
      const idx = Number(classPicker.target.split(':')[1]);
      updateAssignments(prev =>
        prev.map((item, index) => (index === idx ? { ...item, classId: classId || '' } : item)),
      );
    }
    closePicker();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.formModalOverlay}>
        <ScrollView contentContainerStyle={styles.formModalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>{title}</Text>
              <Pressable style={styles.headerCloseBtn} onPress={onClose}>
                <Text style={styles.headerCloseText}>x</Text>
              </Pressable>
            </View>
            <Text style={styles.formHint}>
              Fill teacher profile, subjects and lecture assignment mapping.
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={value => setForm(prev => ({ ...prev, name: value }))}
              placeholder="Teacher name"
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={value => setForm(prev => ({ ...prev, email: value }))}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="teacher@school.com"
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={value => setForm(prev => ({ ...prev, password: value }))}
              placeholder="Enter password"
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.inputLabel}>Subjects (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={form.subjectsInput}
              onChangeText={value => {
                setForm(prev => ({
                  ...prev,
                  subjectsInput: value,
                  assignments: applyAssignmentSubjectRules(prev.assignments),
                }));
              }}
              placeholder="English, Hindi"
              placeholderTextColor={colors.text.muted}
            />

            <Text style={styles.inputLabel}>Class Teacher Of (optional)</Text>
            <Pressable style={styles.selectBtn} onPress={() => openPicker('classTeacherOf')}>
              <Text style={styles.selectBtnText}>
                {form.classTeacherOf
                  ? getClassDisplay(form.classTeacherOf, classLabelById)
                  : 'Select class (optional)'}
              </Text>
            </Pressable>

            <View style={styles.assignmentHeader}>
              <Text style={styles.inputLabel}>Lecture Assignments</Text>
              <Pressable
                style={styles.smallAddBtn}
                onPress={() =>
                  updateAssignments(prev => [...prev, { classId: '', subject: subjects.length === 1 ? subjects[0] : '' }])
                }
              >
                <Text style={styles.smallAddText}>+ Add</Text>
              </Pressable>
            </View>

            {form.assignments.map((assignment, index) => (
              <View key={`${assignment.classId}-${index}`} style={styles.assignmentCard}>
                <Pressable style={styles.selectBtn} onPress={() => openPicker(`assignment:${index}`)}>
                  <Text style={styles.selectBtnText}>
                    {assignment.classId
                      ? getClassDisplay(assignment.classId, classLabelById)
                      : 'Select class (optional)'}
                  </Text>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.assignmentSubjectInput]}
                  value={assignment.subject}
                  onChangeText={value =>
                    updateAssignments(prev =>
                      prev.map((item, idx) => (idx === index ? { ...item, subject: value } : item)),
                    )
                  }
                  placeholder="Subject"
                  placeholderTextColor={colors.text.muted}
                  editable={subjects.length !== 1}
                />
                <Pressable
                  style={styles.assignmentRemoveBtn}
                  onPress={() => updateAssignments(prev => prev.filter((_, idx) => idx !== index))}
                >
                  <Text style={styles.assignmentRemoveText}>Remove</Text>
                </Pressable>
              </View>
            ))}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={onSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <ClassSelectModal
        visible={classPicker.open}
        onClose={closePicker}
        classes={classes}
        onSelect={onSelectClass}
        styles={styles}
      />
    </Modal>
  );
}

function TeacherDetailModal({ visible, onClose, detail, loading, styles, colors, classes }) {
  const classLabelById = useMemo(() => {
    const map = new Map();
    classes.forEach(item => {
      map.set(item._id, `${item.name} - ${item.section}`);
    });
    return map;
  }, [classes]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.detailCard}>
          <Text style={styles.formTitle}>Teacher Details</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : detail ? (
            <ScrollView style={styles.detailScroll}>
              <Text style={styles.detailLine}>Name: {detail.name}</Text>
              <Text style={styles.detailLine}>Email: {detail.email}</Text>
              <Text style={styles.detailLine}>Status: {detail.status ?? '-'}</Text>
              <Text style={styles.detailLine}>
                Subjects: {Array.isArray(detail.subjects) ? detail.subjects.join(', ') : '-'}
              </Text>
              <Text style={styles.detailLine}>
                Class Teacher Of: {getClassDisplay(detail.classTeacherOf, classLabelById)}
              </Text>
              <Text style={styles.detailLine}>Assignments:</Text>
              {(detail.lectureAssignments ?? []).map((item, idx) => (
                <Text key={`la-${idx}`} style={styles.detailSubLine}>
                  - {getClassDisplay(item?.classId, classLabelById)} | {item?.subject ?? '-'}
                </Text>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.placeholderText}>No details available.</Text>
          )}
          <Pressable style={styles.selectorCloseBtn} onPress={onClose}>
            <Text style={styles.selectorCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function buildInitialForm(teacher) {
  return {
    name: teacher?.name ?? '',
    email: teacher?.email ?? '',
    password: '',
    classTeacherOf: getEntityId(teacher?.classTeacherOf),
    subjectsInput: Array.isArray(teacher?.subjects) ? teacher.subjects.join(', ') : '',
    assignments: Array.isArray(teacher?.lectureAssignments)
      ? teacher.lectureAssignments.map(item => ({
          classId: getEntityId(item?.classId),
          subject: String(item?.subject ?? ''),
        }))
      : [],
  };
}

export default function AdminTeacherScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modalState, setModalState] = useState({ visible: false, mode: 'create', teacherId: '' });
  const [form, setForm] = useState(buildInitialForm());
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const classesQuery = useClassesQuery(1, 200);
  const teachersQuery = useTeachersQuery(page, PAGE_LIMIT, debouncedSearch);
  const createMutation = useCreateTeacherMutation();
  const updateMutation = useUpdateTeacherMutation();
  const deleteMutation = useDeleteTeacherMutation();
  const teacherDetailQuery = useTeacherDetailQuery(selectedTeacherId, detailVisible);

  const classList = Array.isArray(classesQuery.data?.data) ? classesQuery.data.data : [];
  const teacherList = Array.isArray(teachersQuery.data?.data) ? teachersQuery.data.data : [];
  const totalPages = Number(teachersQuery.data?.totalPages ?? 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const closeMessage = () => setMessage({ type: '', text: '' });

  const openCreateModal = () => {
    setForm(buildInitialForm());
    setModalState({ visible: true, mode: 'create', teacherId: '' });
  };

  const openEditModal = teacher => {
    setForm(buildInitialForm(teacher));
    setModalState({ visible: true, mode: 'edit', teacherId: teacher._id });
  };

  const closeFormModal = () => setModalState({ visible: false, mode: 'create', teacherId: '' });

  const handleSave = async () => {
    const subjects = normalizeSubjectsInput(form.subjectsInput);
    const assignments = normalizeAssignmentsInput(form.assignments);
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Teacher name is required.' });
      return;
    }
    if (!form.email.trim()) {
      setMessage({ type: 'error', text: 'Teacher email is required.' });
      return;
    }
    if (modalState.mode === 'create' && !form.password.trim()) {
      setMessage({ type: 'error', text: 'Password is required for new teacher.' });
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        classTeacherOf: form.classTeacherOf || null,
        subjects,
        lectureAssignments: assignments,
      };

      if (modalState.mode === 'create') {
        await createMutation.mutateAsync(payload);
        setMessage({ type: 'success', text: 'Teacher created successfully.' });
      } else {
        await updateMutation.mutateAsync({
          id: modalState.teacherId,
          payload,
        });
        setMessage({ type: 'success', text: 'Teacher updated successfully.' });
      }
      closeFormModal();
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Unable to save teacher.'),
      });
    }
  };

  const handleDelete = async id => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      setMessage({ type: 'success', text: 'Teacher deleted successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Unable to delete teacher.'),
      });
    } finally {
      setDeletingId('');
    }
  };

  const openDetail = id => {
    setSelectedTeacherId(id);
    setDetailVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>FACULTY MANAGEMENT</Text>
        <Text style={styles.heroTitle}>Manage Teachers</Text>
        <Text style={styles.heroSub}>
          Create, search, edit and assign teachers with subjects and class lectures.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email"
          placeholderTextColor={colors.text.muted}
        />
        <Pressable style={styles.addBtn} onPress={openCreateModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <MessageBanner text={message.text} type={message.type} onClose={closeMessage} styles={styles} />

      <FlatList
        data={teacherList}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.teacherCard} onPress={() => openDetail(item._id)}>
            <View style={styles.teacherMain}>
              <Text style={styles.teacherName}>{item.name}</Text>
              <Text style={styles.teacherEmail}>{item.email}</Text>
              <Text style={styles.teacherMeta}>
                Subjects: {Array.isArray(item.subjects) ? item.subjects.join(', ') : '-'}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.editBtn} onPress={() => openEditModal(item)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item._id)} disabled={deletingId === item._id}>
                {deletingId === item._id ? (
                  <ActivityIndicator size="small" color={colors.state.error} />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          teachersQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Text style={styles.placeholderText}>No teachers found.</Text>
          )
        }
        ListFooterComponent={
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage(prev => Math.max(1, prev - 1))}
            onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disablePrev={page <= 1}
            disableNext={page >= totalPages}
          />
        }
      />

      <TeacherFormModal
        visible={modalState.visible}
        onClose={closeFormModal}
        onSave={handleSave}
        classes={classList}
        styles={styles}
        colors={colors}
        isSaving={createMutation.isPending || updateMutation.isPending}
        title={modalState.mode === 'create' ? 'Create Teacher' : 'Edit Teacher'}
        form={form}
        setForm={setForm}
      />

      <TeacherDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        detail={teacherDetailQuery.data?.data}
        loading={teacherDetailQuery.isLoading}
        styles={styles}
        colors={colors}
        classes={classList}
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
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 12,
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
    teacherCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
      marginBottom: 10,
    },
    teacherMain: {
      marginBottom: 10,
    },
    teacherName: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    teacherEmail: {
      marginTop: 2,
      color: colors.admin.textSecondary,
      fontSize: 13,
    },
    teacherMeta: {
      marginTop: 6,
      color: colors.admin.textSecondary,
      fontSize: 12,
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
      fontSize: 12,
      marginTop: 4,
      marginBottom: 12,
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
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.admin.textPrimary,
      marginBottom: 10,
    },
    selectBtn: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      backgroundColor: colors.admin.surfaceStrong,
    },
    selectBtnText: {
      color: colors.admin.textPrimary,
      fontSize: 13,
    },
    assignmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    smallAddBtn: {
      borderRadius: 8,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    smallAddText: {
      color: colors.text.inverse,
      fontWeight: '700',
      fontSize: 11,
    },
    assignmentCard: {
      borderWidth: 1,
      borderColor: colors.admin.border,
      borderRadius: 10,
      padding: 8,
      marginBottom: 8,
      backgroundColor: colors.admin.surfaceSoft,
    },
    assignmentSubjectInput: {
      marginBottom: 8,
    },
    assignmentRemoveBtn: {
      alignSelf: 'flex-end',
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    assignmentRemoveText: {
      color: colors.state.error,
      fontWeight: '700',
      fontSize: 11.5,
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
    detailSubLine: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      marginBottom: 4,
      paddingLeft: 6,
    },
  });
