import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import AppIcon from './AppIcon.js';
import CustomDropdownSelector from './CustomDropdownSelector';
import KeyboardAwareModal from './KeyboardAwareModal';
import {
  useAdminTimetableMutations,
  useAdminTimetablesQuery,
  useStudentTimetablesQuery,
  useTeacherTimetableMutations,
  useTeacherTimetablesQuery,
} from '../../hooks/useTimetableQueries';
import { openContentFile } from '../../services/fileService';
import { useAppTheme } from '../../theme/ThemeContext';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const EMPTY_FORM = {
  title: '',
  description: '',
  classId: '',
  classIds: [],
  file: null,
  existingFile: null,
  removeFile: false,
};

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function resolvePalette(colors, tone) {
  if (tone === 'teacher') return colors.teacher;
  if (tone === 'student') return colors.student;
  return colors.admin;
}

export default function TimetableScreen({
  tone = 'teacher',
  role = 'teacher',
  classOptions = [],
  assignedClassId = '',
  assignedClassLabel = '',
}) {
  const { colors } = useAppTheme();
  const palette = resolvePalette(colors, tone);
  const styles = useMemo(() => createStyles(colors, palette), [colors, palette]);
  const canManage = role === 'teacher' || role === 'admin';

  const [page, setPage] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState(assignedClassId || '');
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState({ type: '', text: '' });

  const teacherQuery = useTeacherTimetablesQuery({
    page,
    enabled: role === 'teacher',
  });
  const adminQuery = useAdminTimetablesQuery({
    classId: selectedClassId,
    page,
    enabled: role === 'admin',
  });
  const studentQuery = useStudentTimetablesQuery({
    page,
    enabled: role === 'student',
  });

  const teacherMutations = useTeacherTimetableMutations();
  const adminMutations = useAdminTimetableMutations();
  const mutations = role === 'admin' ? adminMutations : teacherMutations;

  const activeQuery = role === 'admin' ? adminQuery : role === 'student' ? studentQuery : teacherQuery;
  const list = Array.isArray(activeQuery.data?.data) ? activeQuery.data.data : [];
  const totalPages = Number(activeQuery.data?.totalPages ?? 1);
  const saving = mutations.createMutation.isPending || mutations.updateMutation.isPending;

  useEffect(() => {
    if (assignedClassId) {
      setSelectedClassId(assignedClassId);
      setForm(prev => ({ ...prev, classId: assignedClassId }));
    }
  }, [assignedClassId]);

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  const openCreate = () => {
    setEditingItem(null);
    const defaultClassId = role === 'admin' ? selectedClassId : assignedClassId;
    setForm({
      ...EMPTY_FORM,
      classId: defaultClassId,
      classIds: defaultClassId ? [defaultClassId] : [],
    });
    setComposeOpen(true);
  };

  const openEdit = item => {
    setEditingItem(item);
    const classId = item.classInfo?.id || selectedClassId || assignedClassId;
    setForm({
      title: item.title || '',
      description: item.description || '',
      classId,
      classIds: classId ? [classId] : [],
      file: null,
      existingFile: item.file || null,
      removeFile: false,
    });
    setComposeOpen(true);
  };

  const pickFile = async () => {
    const hasNativeDocPicker =
      Boolean(NativeModules?.RNDocumentPicker) || Boolean(global?.__turboModuleProxy?.('RNDocumentPicker'));
    if (!hasNativeDocPicker) {
      setMessage({ type: 'error', text: 'File picker native module missing. Rebuild the app once.' });
      return;
    }

    try {
      const picked = await pick({
        presentationStyle: 'fullScreen',
        type: [types.allFiles],
        mode: 'import',
      });
      const selected = Array.isArray(picked) && picked.length ? picked[0] : null;
      if (!selected) return;
      if (Number(selected?.size ?? 0) > MAX_FILE_BYTES) {
        setMessage({ type: 'error', text: 'File size must be 20MB or less.' });
        return;
      }

      let uploadUri = selected.uri;
      if (selected?.uri && selected?.name) {
        try {
          const copied = await keepLocalCopy({
            destination: 'cachesDirectory',
            files: [{ uri: selected.uri, fileName: selected.name }],
          });
          const firstCopy = Array.isArray(copied) ? copied[0] : null;
          if (firstCopy?.status === 'success' && firstCopy.localUri) {
            uploadUri = firstCopy.localUri;
          } else if (firstCopy?.status === 'error') {
            console.warn('[Timetable] keepLocalCopy failed', firstCopy.copyError || firstCopy);
          }
        } catch (copyError) {
          console.warn('[Timetable] keepLocalCopy error', copyError);
        }
      }

      const mime =
        selected.type ||
        (String(selected.name || '').toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : 'application/octet-stream');

      setForm(prev => ({
        ...prev,
        file: {
          uri: uploadUri || selected.fileCopyUri || selected.uri,
          name: selected.name || 'attachment',
          type: mime,
          size: Number(selected.size ?? 0),
        },
        removeFile: false,
      }));
    } catch (error) {
      if (!isErrorWithCode(error) || error.code !== errorCodes.OPERATION_CANCELED) {
        setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to select file.') });
      }
    }
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Title is required.' });
      return;
    }
    const classIds =
      role === 'admin'
        ? (Array.isArray(form.classIds) ? form.classIds : []).filter(Boolean)
        : assignedClassId
          ? [assignedClassId]
          : [];
    const classId = classIds[0] || '';
    if (role === 'admin' && !classIds.length) {
      setMessage({ type: 'error', text: 'Please select at least one class.' });
      return;
    }
    if (role === 'teacher' && !classId) {
      setMessage({ type: 'error', text: 'No class assigned to this teacher.' });
      return;
    }

    const payload = {
      classId,
      classIds,
      title: form.title.trim(),
      description: form.description.trim(),
      file: form.file,
      removeFile: Boolean(form.removeFile && !form.file),
    };

    try {
      if (editingItem?.id) {
        await mutations.updateMutation.mutateAsync({ timetableId: editingItem.id, payload });
        setMessage({ type: 'success', text: 'Exam timetable updated successfully.' });
      } else {
        await mutations.createMutation.mutateAsync(payload);
        const count = classIds.length;
        setMessage({
          type: 'success',
          text:
            count > 1
              ? `Exam timetable uploaded for ${count} classes.`
              : 'Exam timetable uploaded successfully.',
        });
        if (role === 'admin' && classIds.length && !selectedClassId) {
          setSelectedClassId(classIds[0]);
        } else if (role === 'admin' && classIds.length && !classIds.includes(selectedClassId)) {
          setSelectedClassId(classIds[0]);
        }
      }
      setComposeOpen(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);
      setPage(1);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to save exam timetable.') });
    }
  };

  const handleDelete = item => {
    Alert.alert('Delete Exam Timetable', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mutations.deleteMutation.mutateAsync(item.id);
            setMessage({ type: 'success', text: 'Exam timetable deleted successfully.' });
          } catch (error) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete exam timetable.') });
          }
        },
      },
    ]);
  };

  const openFile = async item => {
    if (!item?.file?.url) return;
    try {
      await openContentFile({
        url: item.file.url,
        fileName: item.file.name || 'timetable',
        allowRemoteFallback: true,
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to open file.') });
    }
  };

  const classLabel =
    role === 'teacher'
      ? assignedClassLabel || 'Assigned class'
      : classOptions.find(item => item.id === selectedClassId)?.label || 'Select class';

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>EXAM SCHEDULE</Text>
        <Text style={styles.heroTitle}>Exam Timetable</Text>
        <Text style={styles.heroSub}>
          {role === 'student'
            ? 'View the latest exam timetable shared for your class.'
            : role === 'admin'
              ? 'Select a class, then upload or manage exam timetable files.'
              : `Upload and manage exam timetable for ${assignedClassLabel || 'your class'}.`}
        </Text>
      </View>

      {role === 'admin' ? (
        <CustomDropdownSelector
          tone="admin"
          label="Class"
          value={classLabel === 'Select class' ? '' : classLabel}
          placeholder="Select class"
          options={classOptions}
          onSelect={value => {
            setSelectedClassId(value);
            setPage(1);
            setForm(prev => ({ ...prev, classId: value }));
          }}
          valueExtractor={item => item.id}
          labelExtractor={item => item.label}
          searchPlaceholder="Search class"
        />
      ) : null}

      {canManage ? (
        <Pressable
          style={styles.uploadBtn}
          onPress={openCreate}
        >
          <AppIcon name="cloud-upload-outline" size={16} color={colors.text.inverse} />
          <Text style={styles.uploadBtnText}>Upload Exam Timetable</Text>
        </Pressable>
      ) : null}

      {message.text ? (
        <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
          <Text style={styles.bannerText}>{message.text}</Text>
        </View>
      ) : null}

      {role === 'admin' && !selectedClassId ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Select a class</Text>
          <Text style={styles.emptySub}>Choose a class to view or upload its exam timetable.</Text>
        </View>
      ) : activeQuery.isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={list}
          keyExtractor={(item, index) => item.id || `timetable-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardBadge}>
                  <AppIcon name="calendar-outline" size={14} color={palette.accent} />
                  <Text style={styles.cardBadgeText}>{item.classInfo?.label || classLabel}</Text>
                </View>
                <Text style={styles.cardDate}>{formatDate(item.updatedAt || item.createdAt)}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title || 'Exam Timetable'}</Text>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              {item.file ? (
                <Pressable style={styles.fileRow} onPress={() => openFile(item)}>
                  <AppIcon name="document-attach-outline" size={15} color={palette.accent} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.file.name || 'Attachment'}
                  </Text>
                  <Text style={styles.openText}>Open</Text>
                </Pressable>
              ) : (
                <Text style={styles.noFileText}>No file attached</Text>
              )}
              {canManage ? (
                <View style={styles.actionRow}>
                  <Pressable style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No exam timetable yet</Text>
              <Text style={styles.emptySub}>
                {canManage ? 'Upload the first exam timetable for this class.' : 'Your exam timetable will appear here.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pageRow}>
                <Pressable style={styles.pageBtn} disabled={page <= 1} onPress={() => setPage(p => Math.max(1, p - 1))}>
                  <Text style={styles.pageBtnText}>Previous</Text>
                </Pressable>
                <Text style={styles.pageText}>
                  {page} / {totalPages}
                </Text>
                <Pressable
                  style={styles.pageBtn}
                  disabled={page >= totalPages}
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}

      {canManage ? (
        <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
          <KeyboardAwareModal
            overlayStyle={styles.modalOverlay}
            scrollContentStyle={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            dismissKeyboardOnBackdrop
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Exam Timetable' : 'Upload Exam Timetable'}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setComposeOpen(false)}>
                <AppIcon name="close" size={16} color={palette.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>Title is required. Description and file are optional.</Text>

            {role === 'admin' ? (
              editingItem ? (
                <CustomDropdownSelector
                  tone="admin"
                  label="Class"
                  value={classOptions.find(item => item.id === form.classId)?.label || ''}
                  placeholder="Select class"
                  options={classOptions}
                  onSelect={value =>
                    setForm(prev => ({
                      ...prev,
                      classId: value,
                      classIds: value ? [value] : [],
                    }))
                  }
                  valueExtractor={item => item.id}
                  labelExtractor={item => item.label}
                  searchPlaceholder="Search class"
                />
              ) : (
                <CustomDropdownSelector
                  tone="admin"
                  label="Class"
                  multiSelect
                  showSelectAll
                  selectedValues={form.classIds}
                  onChangeSelectedValues={values =>
                    setForm(prev => ({
                      ...prev,
                      classIds: values,
                      classId: values[0] || '',
                    }))
                  }
                  value={
                    form.classIds.length
                      ? `${form.classIds.length} class${form.classIds.length > 1 ? 'es' : ''} selected`
                      : ''
                  }
                  placeholder="Select one or more classes"
                  options={classOptions}
                  valueExtractor={item => item.id}
                  labelExtractor={item => item.label}
                  searchPlaceholder="Search class"
                />
              )
            ) : (
              <View style={styles.classChip}>
                <Text style={styles.classChipLabel}>Class</Text>
                <Text style={styles.classChipValue}>{assignedClassLabel || '-'}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Title</Text>
            <View style={styles.inputRow}>
              <AppIcon name="create-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={value => setForm(prev => ({ ...prev, title: value }))}
                placeholder="e.g. Mid-Term Exam Timetable"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <View style={[styles.inputRow, styles.textAreaRow]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={value => setForm(prev => ({ ...prev, description: value }))}
                placeholder="Add notes for students (optional)"
                placeholderTextColor={colors.text.muted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.inputLabel}>Attachment (optional)</Text>
            <View style={styles.fileActions}>
              <Pressable style={styles.filePickerBtn} onPress={pickFile}>
                <AppIcon name="attach-outline" size={15} color={palette.accent} />
                <Text style={styles.filePickerText}>{form.file || form.existingFile ? 'Change File' : 'Pick File'}</Text>
              </Pressable>
              {form.file || (form.existingFile && !form.removeFile) ? (
                <Pressable
                  style={styles.removeFileBtn}
                  onPress={() =>
                    setForm(prev => ({
                      ...prev,
                      file: null,
                      removeFile: Boolean(prev.existingFile),
                      existingFile: prev.existingFile,
                    }))
                  }
                >
                  <AppIcon name="trash-outline" size={14} color={colors.state.error} />
                  <Text style={styles.removeFileText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.helperText}>
              {form.file
                ? `${form.file.name} (${Math.ceil((form.file.size || 0) / 1024)} KB)`
                : form.existingFile && !form.removeFile
                  ? `Current: ${form.existingFile.name || 'Attachment'}`
                  : 'No file selected'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setComposeOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={submit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.submitText}>{editingItem ? 'Save Changes' : 'Upload'}</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAwareModal>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (colors, palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    heroCard: {
      borderRadius: 20,
      backgroundColor: palette.heroBgAlt || palette.headerBg,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      padding: 14,
      marginBottom: 10,
    },
    heroOverline: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.4, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 24, fontWeight: '900' },
    heroSub: { marginTop: 6, color: colors.auth.subtitle, fontSize: 12.5, lineHeight: 18 },
    uploadBtn: {
      marginBottom: 10,
      borderRadius: 14,
      backgroundColor: palette.navBg || palette.accent,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    uploadBtnText: { color: colors.text.inverse, fontSize: 13, fontWeight: '900' },
    banner: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
    bannerError: { backgroundColor: palette.dangerBg, borderColor: palette.dangerBorder },
    bannerSuccess: { backgroundColor: palette.successBg, borderColor: palette.successBorder },
    bannerText: { color: palette.textPrimary, fontSize: 12.5, fontWeight: '700' },
    list: { flex: 1 },
    listContent: { paddingBottom: 28 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      padding: 12,
      marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    cardBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    cardBadgeText: { color: palette.textPrimary, fontSize: 11, fontWeight: '800' },
    cardDate: { color: palette.textSecondary, fontSize: 11, fontWeight: '700' },
    cardTitle: { marginTop: 10, color: palette.textPrimary, fontSize: 15, fontWeight: '900' },
    cardDesc: { marginTop: 4, color: palette.textSecondary, fontSize: 12.5, lineHeight: 18 },
    fileRow: {
      marginTop: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fileName: { flex: 1, color: palette.textPrimary, fontSize: 12.5, fontWeight: '700' },
    openText: { color: palette.accent, fontSize: 12, fontWeight: '900' },
    noFileText: { marginTop: 8, color: palette.textSecondary, fontSize: 12, fontWeight: '600' },
    actionRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    editBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    editBtnText: { color: palette.textPrimary, fontSize: 11.5, fontWeight: '800' },
    deleteBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.dangerBorder,
      backgroundColor: palette.dangerBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    deleteBtnText: { color: colors.state.error, fontSize: 11.5, fontWeight: '800' },
    emptyCard: {
      marginTop: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      padding: 18,
      alignItems: 'center',
    },
    emptyTitle: { color: palette.textPrimary, fontSize: 15, fontWeight: '900' },
    emptySub: { marginTop: 6, color: palette.textSecondary, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
    loaderWrap: { paddingVertical: 40, alignItems: 'center' },
    pageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    pageBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pageBtnText: { color: palette.textPrimary, fontSize: 12, fontWeight: '800' },
    pageText: { color: palette.textSecondary, fontSize: 12, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: palette.modalBackdrop, justifyContent: 'flex-end' },
    modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      padding: 16,
      paddingBottom: 24,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    modalTitle: { color: palette.textPrimary, fontSize: 17, fontWeight: '900' },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.surfaceStrong,
    },
    modalHint: { color: palette.textSecondary, fontSize: 12, marginBottom: 12, fontWeight: '600' },
    classChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      padding: 12,
      marginBottom: 10,
    },
    classChipLabel: { color: palette.textSecondary, fontSize: 11, fontWeight: '700' },
    classChipValue: { marginTop: 4, color: palette.textPrimary, fontSize: 13.5, fontWeight: '900' },
    inputLabel: { color: palette.textSecondary, fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
    inputRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    textAreaRow: { alignItems: 'flex-start', minHeight: 96 },
    inputIcon: { color: palette.accent, marginRight: 8 },
    input: { flex: 1, color: palette.textPrimary, paddingVertical: 11, fontSize: 13.5 },
    textArea: { minHeight: 84, paddingTop: 10 },
    fileActions: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    filePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    filePickerText: { color: palette.textPrimary, fontSize: 12.5, fontWeight: '800' },
    removeFileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.dangerBorder,
      backgroundColor: palette.dangerBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    removeFileText: { color: colors.state.error, fontSize: 12.5, fontWeight: '800' },
    helperText: { color: palette.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    cancelText: { color: palette.textPrimary, fontSize: 13, fontWeight: '800' },
    submitBtn: {
      flex: 1,
      borderRadius: 14,
      backgroundColor: palette.navBg || palette.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    submitText: { color: colors.text.inverse, fontSize: 13, fontWeight: '900' },
  });
