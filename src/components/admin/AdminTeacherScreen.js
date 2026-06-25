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
import {
  useCreateTeacherMutation,
  useDeleteTeacherMutation,
  useTeacherDetailQuery,
  useTeachersQuery,
  useUpdateTeacherMutation,
} from '../../hooks/useTeacherQueries';
import { useClassesQuery } from '../../hooks/useClassQueries';
import { useAppTheme } from '../../theme/ThemeContext';
import CustomDropdownSelector from '../common/CustomDropdownSelector';
import KeyboardAwareModal from '../common/KeyboardAwareModal';
import PaginationControls from '../common/PaginationControls';

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

function TeacherFormModal({
  visible,
  onClose,
  onSave,
  classes,
  styles,
  colors,
  isSaving,
  title,
  mode,
  form,
  setForm,
}) {

  const classLabelById = useMemo(() => {
    const map = new Map();
    classes.forEach(item => {
      const classId = getEntityId(item);
      if (classId) {
        map.set(classId, `${item.name} - ${item.section}`);
      }
    });
    return map;
  }, [classes]);


  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAwareModal
        overlayStyle={styles.formModalOverlay}
        scrollContentStyle={styles.formModalScroll}
        contentContainerStyle={styles.formCard}
        dismissKeyboardOnBackdrop
      >
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>{title}</Text>
              <Pressable style={styles.headerCloseBtn} onPress={onClose}>
                <Text style={styles.headerCloseText}>x</Text>
              </Pressable>
            </View>
            <Text style={styles.formHint}>
              Create class teacher profile with only required account details.
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputRow}>
              <AppIcon name="person-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.name}
                onChangeText={value => setForm(prev => ({ ...prev, name: value }))}
                placeholder="Teacher name"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputRow}>
              <AppIcon name="mail-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.email}
                onChangeText={value => setForm(prev => ({ ...prev, email: value }))}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="teacher@school.com"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>
              Password {mode === 'edit' ? '(optional)' : ''}
            </Text>
            <View style={styles.inputRow}>
              <AppIcon name="lock-closed-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.password}
                onChangeText={value => setForm(prev => ({ ...prev, password: value }))}
                secureTextEntry
                placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Enter password'}
                placeholderTextColor={colors.text.muted}
              />
            </View>
            {mode === 'edit' ? <Text style={styles.inputNote}>Leave this field blank to keep the current password.</Text> : null}

            <CustomDropdownSelector
              tone="admin"
              label="Class Teacher Of"
              value={form.classTeacherOf ? getClassDisplay(form.classTeacherOf, classLabelById) : ''}
              placeholder="Select class"
              options={classes}
              onSelect={classId => setForm(prev => ({ ...prev, classTeacherOf: classId || '' }))}
              valueExtractor={item => getEntityId(item)}
              labelExtractor={item => `${item?.name ?? '-'} - ${item?.section ?? '-'}`}
              searchPlaceholder="Search class or section"
            />

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
      </KeyboardAwareModal>

    </Modal>
  );
}

function TeacherDetailModal({ visible, onClose, detail, loading, styles, colors, classes }) {
  const classLabelById = useMemo(() => {
    const map = new Map();
    classes.forEach(item => {
      const classId = getEntityId(item);
      if (classId) {
        map.set(classId, `${item.name} - ${item.section}`);
      }
    });
    return map;
  }, [classes]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.detailCard}>
          <Text style={styles.formTitle}>Faculty Profile</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : detail ? (
            <ScrollView style={styles.detailScroll}>
              <View style={styles.detailLineRow}>
                <AppIcon name="person-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Name: {detail.name}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <AppIcon name="mail-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Email: {detail.email}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <AppIcon name="checkmark-circle-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Status: {detail.status ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <AppIcon name="business-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>
                Class Teacher Of: {getClassDisplay(detail.classTeacherOf, classLabelById)}
                </Text>
              </View>
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
  const reveal = useRef(new Animated.Value(0)).current;

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
    setModalState({ visible: true, mode: 'create', teacherId: '' });
  };

  const openEditModal = teacher => {
    const teacherId = getEntityId(teacher);
    if (!teacherId) {
      setMessage({ type: 'error', text: 'Invalid teacher record selected.' });
      return;
    }
    setForm(buildInitialForm(teacher));
    setModalState({ visible: true, mode: 'edit', teacherId });
  };

  const closeFormModal = () => setModalState({ visible: false, mode: 'create', teacherId: '' });

  const handleSave = async () => {
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
    if (!form.classTeacherOf) {
      setMessage({ type: 'error', text: 'Class teacher assignment is required.' });
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        classTeacherOf: form.classTeacherOf,
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
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid teacher id for delete.' });
      return;
    }
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
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid teacher id for details.' });
      return;
    }
    setSelectedTeacherId(id);
    setDetailVisible(true);
  };

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
        <Text style={styles.heroOverline}>FACULTY OPERATIONS</Text>
        <Text style={styles.heroTitle}>Faculty Command Center</Text>
        <Text style={styles.heroSub}>
          Create and manage class teacher accounts with clean class mapping.
        </Text>
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
            placeholder="Search by name or email"
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
        data={teacherList}
        keyExtractor={(item, index) => getEntityId(item) || `teacher-${index}`}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={40}
        renderItem={({ item, index }) => {
          const teacherId = getEntityId(item);
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
              <Pressable style={styles.teacherCard} onPress={() => openDetail(teacherId)}>
              <View style={styles.teacherMain}>
                <Text style={styles.teacherName}>{item.name}</Text>
                <Text style={styles.teacherEmail}>{item.email}</Text>
                <Text style={styles.teacherMeta}>
                  Class Teacher Of: {getClassDisplay(item.classTeacherOf)}
                </Text>
              </View>
              <View style={styles.actionRow}>
                <Pressable style={styles.editBtn} onPress={() => openEditModal(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(teacherId)}
                  disabled={deletingId === teacherId}
                >
                  {deletingId === teacherId ? (
                    <ActivityIndicator size="small" color={colors.state.error} />
                  ) : (
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          teachersQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Text style={styles.placeholderText}>No faculty profiles yet.</Text>
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

      <TeacherFormModal
        visible={modalState.visible}
        onClose={closeFormModal}
        onSave={handleSave}
        classes={classList}
        styles={styles}
        colors={colors}
        isSaving={createMutation.isPending || updateMutation.isPending}
        title={modalState.mode === 'create' ? 'Create Teacher' : 'Edit Teacher'}
        mode={modalState.mode}
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
      borderRadius: 22,
      backgroundColor: colors.admin.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#1c4ca1',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
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
      backgroundColor: colors.admin.navBg,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: '#1f4fa2',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
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
    teacherCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
      marginBottom: 10,
      shadowColor: '#1d447f',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
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
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.admin.surface,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      paddingHorizontal: 16,
      paddingTop: 16,
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
    inputNote: {
      marginTop: -4,
      marginBottom: 10,
      color: colors.admin.textSecondary,
      fontSize: 11.5,
      fontWeight: '600',
    },
    sectionCard: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 15,
      padding: 12,
      backgroundColor: colors.admin.surfaceStrong,
      marginBottom: 12,
    },
    sectionHeader: {
      marginBottom: 8,
    },
    sectionTitle: {
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    sectionSubtitle: {
      marginTop: 2,
      color: colors.admin.textSecondary,
      fontSize: 11.5,
    },
    subjectEntryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    subjectEntryInputWrap: {
      flex: 1,
      marginBottom: 0,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    subjectChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.admin.border,
      backgroundColor: colors.admin.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    subjectChipText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    sectionPlaceholder: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      fontStyle: 'italic',
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
    selectBtnActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.admin.successBg,
      shadowColor: '#194c89',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    selectBtnText: {
      color: colors.admin.textPrimary,
      fontSize: 13.5,
      fontWeight: '600',
      flex: 1,
    },
    selectBtnPlaceholderText: {
      color: colors.admin.textSecondary,
    },
    assignmentSection: {
      marginTop: 2,
    },
    assignmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    smallAddBtn: {
      borderRadius: 8,
      backgroundColor: colors.admin.navBg,
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
      padding: 10,
      marginBottom: 8,
      backgroundColor: colors.admin.surface,
    },
    assignmentTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    assignmentLabel: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    fieldMiniLabel: {
      color: colors.admin.textSecondary,
      fontSize: 11,
      marginBottom: 4,
      marginTop: 2,
    },
    assignmentField: {
      marginBottom: 8,
    },
    assignmentSubjectInput: {
      marginBottom: 0,
    },
    assignmentRemoveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    assignmentRemoveText: {
      color: colors.state.error,
      fontWeight: '700',
      fontSize: 11,
    },
    assignmentSubjectChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    assignmentSubjectChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.admin.surfaceSoft,
    },
    assignmentSubjectChipText: {
      color: colors.admin.textPrimary,
      fontSize: 11.5,
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
      backgroundColor: colors.admin.navBg,
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
      backgroundColor: colors.admin.navBg,
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
    detailLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    detailSubLine: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      marginBottom: 4,
      paddingLeft: 6,
    },
  });
