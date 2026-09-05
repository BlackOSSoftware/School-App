import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import AppIcon from '../common/AppIcon.js';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { useTeacherClassesOverviewQuery } from '../../hooks/useTeacherQueries';
import { useCreateTeacherContentMutation, useTeacherMyContentQuery, useTeacherHomeworkMutations } from '../../hooks/useContentQueries';
import { openContentFile } from '../../services/fileService';
import { useAppTheme } from '../../theme/ThemeContext';
import CustomDropdownSelector from '../common/CustomDropdownSelector';
import KeyboardAwareModal from '../common/KeyboardAwareModal';

const PAGE_LIMIT = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function getErrorMessage(error, fallback) {
  if (error?.code === 'ERR_NETWORK') {
    return 'Network error while uploading. If other APIs are working, backend upload endpoint may be down or rejecting multipart.';
  }

  const validationErrors = error?.response?.data?.errors;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    const firstValidation = validationErrors
      .map(item => item?.msg || item?.message || item?.error || '')
      .find(Boolean);
    if (firstValidation) {
      return String(firstValidation);
    }
  }

  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const ContentListItem = memo(function ContentListItem({ item, styles, onPress, onEdit, onDelete, busy, deletingId }) {
  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPress(item)}>
      <View style={styles.cardHead}>
        <Text style={styles.cardType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>
        {item.classInfo?.name || '-'}-{item.classInfo?.section || '-'} | {item.subject || '-'}
      </Text>
      <Text style={styles.cardDesc}>{item.description}</Text>
      <Text style={styles.fileLink}>{item.file?.url ? 'Tap to view details' : 'No attachment'}</Text>
      </Pressable>
      {item.type === 'homework' ? (
        <View style={styles.modalActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} style={[styles.submitBtn, busy && styles.pageBtnDisabled]} disabled={busy} onPress={() => onEdit(item)}><Text style={styles.submitText}>Edit</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} style={[styles.submitBtn, styles.deleteHomeworkBtn, busy && styles.pageBtnDisabled]} disabled={busy} onPress={() => onDelete(item)}><Text style={styles.submitText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
});

export default function TeacherContentScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [type, setType] = useState('homework');
  const [page, setPage] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState('');
  const { update, remove } = useTeacherHomeworkMutations();
  const busy = update.isPending || remove.isPending;
  const [form, setForm] = useState({
    type: 'homework',
    classId: '',
    subject: '',
    title: '',
    description: '',
    file: null,
  });

  const overviewQuery = useTeacherClassesOverviewQuery();
  const createMutation = useCreateTeacherContentMutation();

  const classList = useMemo(
    () => (Array.isArray(overviewQuery.data?.assignedClasses) ? overviewQuery.data.assignedClasses : []),
    [overviewQuery.data?.assignedClasses],
  );
  const subjects = useMemo(() => {
    const raw = Array.isArray(overviewQuery.data?.teacher?.classSubjects)
      ? overviewQuery.data.teacher.classSubjects
      : [];
    return [...new Set(raw.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean))];
  }, [overviewQuery.data?.teacher?.classSubjects]);

  useEffect(() => {
    if (!selectedClassId && classList.length === 1) {
      setSelectedClassId(classList[0].id);
    }
  }, [classList, selectedClassId]);

  useEffect(() => {
    if (!selectedSubject && subjects.length === 1) {
      setSelectedSubject(subjects[0]);
    }
  }, [selectedSubject, subjects]);

  const listQuery = useTeacherMyContentQuery({
    type,
    page,
    limit: PAGE_LIMIT,
    classId: selectedClassId,
    subject: selectedSubject,
  });

  const rows = Array.isArray(listQuery.data?.data) ? listQuery.data.data : [];
  const totalPages = Math.max(1, Number(listQuery.data?.totalPages ?? 1));

  useEffect(() => {
    if (listQuery.data && !listQuery.isPlaceholderData && page > totalPages) setPage(totalPages);
  }, [listQuery.data, listQuery.isPlaceholderData, page, totalPages]);

  useEffect(() => {
    if (!message.text || message.type === 'error') {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2600);
    return () => clearTimeout(timer);
  }, [message.text, message.type]);

  const editHomework = useCallback(item => {
    setEditError('');
    setEditing({ id: item.id, title: item.title, subject: item.subject, description: item.description });
  }, []);

  const deleteHomework = useCallback(item => {
    Alert.alert('Delete homework?', `Delete "${item.title}" and its attachment permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await remove.mutateAsync(item.id);
          setSelectedItem(null);
          setMessage({ type: 'success', text: 'Homework deleted successfully.' });
        } catch (error) {
          setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete homework.') });
        }
      } },
    ]);
  }, [remove]);

  const saveHomework = async () => {
    if (!editing.title.trim() || !editing.description.trim() || !editing.subject.trim()) {
      setEditError('Title, subject and description are required.');
      return;
    }
    setEditError('');
    try {
      await update.mutateAsync(editing);
      setEditing(null);
      setSelectedItem(null);
      setMessage({ type: 'success', text: 'Homework updated successfully.' });
    } catch (error) {
      setEditError(getErrorMessage(error, 'Unable to update homework.'));
    }
  };

  const openComposer = () => {
    setForm({
      type,
      classId: classList.length === 1 ? classList[0].id : '',
      subject: subjects.length === 1 ? subjects[0] : '',
      title: '',
      description: '',
      file: null,
    });
    setComposeOpen(true);
  };

  const pickFile = async () => {
    const hasNativeDocPicker =
      Boolean(NativeModules?.RNDocumentPicker) ||
      Boolean(global?.__turboModuleProxy?.('RNDocumentPicker'));

    if (!hasNativeDocPicker) {
      setMessage({
        type: 'error',
        text: 'File picker native module missing. Please rebuild Android app once.',
      });
      return;
    }

    try {
      const picked = await pick({
        presentationStyle: 'fullScreen',
        type: [types.allFiles],
        mode: 'import',
      });
      const selected = Array.isArray(picked) && picked.length ? picked[0] : null;
      if (!selected) {
        return;
      }

      if (Number(selected?.size ?? 0) > MAX_FILE_BYTES) {
        setMessage({ type: 'error', text: 'File size must be 10MB or less.' });
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
          }
        } catch {
          // Fall back to the original URI when local copy is not possible.
        }
      }

      setForm(prev => ({
        ...prev,
        file: {
          uri: uploadUri || selected.fileCopyUri || selected.uri,
          name: selected.name || 'attachment',
          type: selected.type || 'application/octet-stream',
          size: Number(selected.size ?? 0),
        },
      }));
    } catch (error) {
      if (!isErrorWithCode(error) || error.code !== errorCodes.OPERATION_CANCELED) {
        setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to select file.') });
      }
    }
  };

  const submit = async () => {
    if (!form.classId) {
      setMessage({ type: 'error', text: 'Class is required.' });
      return;
    }
    if (subjects.length > 1 && !form.subject) {
      setMessage({ type: 'error', text: 'Subject is required for your profile.' });
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required.' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        type: form.type,
        classId: form.classId,
        subject: form.subject,
        title: form.title,
        description: form.description,
        file: form.file,
      });
      setComposeOpen(false);
      setPage(1);
      setMessage({ type: 'success', text: `${form.type === 'notes' ? 'Notes' : 'Homework'} posted successfully.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to post content.') });
    }
  };

  const selectedClassLabel = classList.find(item => item.id === selectedClassId)?.label || 'All Classes';

  const openAttachment = async item => {
    if (!item?.file?.openUrl && !item?.file?.downloadUrl && !item?.file?.url) {
      return;
    }
    try {
      await openContentFile({
        openUrl: item?.file?.openUrl,
        downloadUrl: item?.file?.downloadUrl,
        contentId: item?.id,
        url: item?.file?.url,
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to open attachment.') });
    }
  };

  const openDetails = useCallback(item => setSelectedItem(item), []);
  const keyExtractor = useCallback(item => item.id, []);
  const renderItem = useCallback(
    ({ item }) => <ContentListItem item={item} styles={styles} onPress={openDetails} onEdit={editHomework} onDelete={deleteHomework} busy={busy} deletingId={remove.isPending ? remove.variables : ''} />,
    [openDetails, styles, editHomework, deleteHomework, busy, remove.isPending, remove.variables],
  );
  const listFooter = useMemo(
    () => (
      <>
        {!rows.length ? <Text style={styles.emptyText}>No content found.</Text> : null}
        <View style={styles.paginationRow}>
          <Pressable style={[styles.pageBtn, page <= 1 ? styles.pageBtnDisabled : null]} onPress={() => setPage(prev => Math.max(1, prev - 1))} disabled={page <= 1}>
            <Text style={styles.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={styles.pageText}>{page} / {totalPages}</Text>
          <Pressable style={[styles.pageBtn, page >= totalPages ? styles.pageBtnDisabled : null]} onPress={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
            <Text style={styles.pageBtnText}>Next</Text>
          </Pressable>
        </View>
      </>
    ),
    [page, rows.length, styles, totalPages],
  );

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>ACADEMIC CONTENT</Text>
        <Text style={styles.heroTitle}>Homework & Notes</Text>
        <Text style={styles.heroSub}>Create and review class content from one place.</Text>
      </View>

      <View style={styles.segmentWrap}>
        <Pressable style={[styles.segmentBtn, type === 'homework' ? styles.segmentBtnActive : null]} onPress={() => { setType('homework'); setPage(1); }}>
          <Text style={[styles.segmentText, type === 'homework' ? styles.segmentTextActive : null]}>Homework</Text>
        </Pressable>
        <Pressable style={[styles.segmentBtn, type === 'notes' ? styles.segmentBtnActive : null]} onPress={() => { setType('notes'); setPage(1); }}>
          <Text style={[styles.segmentText, type === 'notes' ? styles.segmentTextActive : null]}>Notes</Text>
        </Pressable>
      </View>

      <View style={styles.toolbarRow}>
        <View style={styles.toolbarField}>
          <CustomDropdownSelector
            tone="teacher"
            value={selectedClassLabel === 'All Classes' ? '' : selectedClassLabel}
            placeholder="All Classes"
            options={classList}
            onSelect={value => {
              setPage(1);
              setSelectedClassId(value || '');
              setForm(prev => ({ ...prev, classId: value || '' }));
            }}
            includeNone
            noneLabel="All / None"
            valueExtractor={item => item?.id}
            labelExtractor={item => item?.label}
            searchPlaceholder="Search class or section"
            containerStyle={styles.toolbarDropdown}
          />
        </View>
        <View style={styles.toolbarField}>
          <CustomDropdownSelector
            tone="teacher"
            value={selectedSubject}
            placeholder="All Subjects"
            options={subjects.map(item => ({ id: item, label: item }))}
            onSelect={value => {
              setPage(1);
              setSelectedSubject(value || '');
              setForm(prev => ({ ...prev, subject: value || '' }));
            }}
            includeNone
            noneLabel="All / None"
            valueExtractor={item => item?.id}
            labelExtractor={item => item?.label}
            searchPlaceholder="Search subject"
            containerStyle={styles.toolbarDropdown}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={openComposer}>
          <AppIcon name="add" size={14} color={colors.text.inverse} />
          <Text style={styles.addBtnText}>Post</Text>
        </Pressable>
      </View>

      <MessageBanner
        text={message.text}
        type={message.type}
        onClose={() => setMessage({ type: '', text: '' })}
        styles={styles}
      />

      {listQuery.isLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={listFooter}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={40}
        />
      )}

      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => { if (!update.isPending) setEditing(null); }}>
        <KeyboardAwareModal overlayStyle={styles.modalOverlay} scrollContentStyle={styles.modalScrollContent} contentContainerStyle={styles.modalCard} dismissKeyboardOnBackdrop>
          <Text style={styles.modalTitle}>Edit Homework</Text>
          <MessageBanner text={editError} type="error" onClose={() => setEditError('')} styles={styles} />
          {['title', 'subject', 'description'].map(field => (
            <View key={field}>
              <Text style={styles.inputLabel}>{field === 'title' ? 'Title' : field === 'subject' ? 'Subject' : 'Description'}</Text>
              <View style={[styles.inputRow, field === 'description' && styles.inputRowMulti]}>
                <TextInput accessibilityLabel={`Homework ${field}`} style={[styles.input, field === 'description' && styles.inputMulti]} value={editing?.[field] || ''} editable={!update.isPending} maxLength={field === 'description' ? 10000 : field === 'title' ? 200 : 100} multiline={field === 'description'} onChangeText={value => setEditing(current => ({ ...current, [field]: value }))} />
              </View>
            </View>
          ))}
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} disabled={update.isPending} onPress={() => setEditing(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Save homework" style={styles.submitBtn} disabled={update.isPending} onPress={saveHomework}><Text style={styles.submitText}>{update.isPending ? 'Saving...' : 'Save'}</Text></Pressable>
          </View>
        </KeyboardAwareModal>
      </Modal>

      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <KeyboardAwareModal
          overlayStyle={styles.modalOverlay}
          scrollContentStyle={styles.modalScrollContent}
          contentContainerStyle={styles.modalCard}
          dismissKeyboardOnBackdrop
        >
            <Text style={styles.modalTitle}>Post Content</Text>
            <View style={styles.segmentWrap}>
              <Pressable style={[styles.segmentBtn, form.type === 'homework' ? styles.segmentBtnActive : null]} onPress={() => setForm(prev => ({ ...prev, type: 'homework' }))}>
                <Text style={[styles.segmentText, form.type === 'homework' ? styles.segmentTextActive : null]}>Homework</Text>
              </Pressable>
              <Pressable style={[styles.segmentBtn, form.type === 'notes' ? styles.segmentBtnActive : null]} onPress={() => setForm(prev => ({ ...prev, type: 'notes' }))}>
                <Text style={[styles.segmentText, form.type === 'notes' ? styles.segmentTextActive : null]}>Notes</Text>
              </Pressable>
            </View>

            <CustomDropdownSelector
              tone="teacher"
              value={form.classId ? classList.find(item => item.id === form.classId)?.label ?? form.classId : ''}
              placeholder="Select class"
              options={classList}
              onSelect={value => setForm(prev => ({ ...prev, classId: value || '' }))}
              valueExtractor={item => item?.id}
              labelExtractor={item => item?.label}
              searchPlaceholder="Search class or section"
            />
            <CustomDropdownSelector
              tone="teacher"
              value={form.subject}
              placeholder="Select subject"
              options={subjects.map(item => ({ id: item, label: item }))}
              onSelect={value => setForm(prev => ({ ...prev, subject: value || '' }))}
              valueExtractor={item => item?.id}
              labelExtractor={item => item?.label}
              searchPlaceholder="Search subject"
            />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={value => setForm(prev => ({ ...prev, title: value }))}
                placeholder="Title"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={[styles.inputRow, styles.inputRowMulti]}>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={form.description}
                onChangeText={value => setForm(prev => ({ ...prev, description: value }))}
                placeholder="Description"
                placeholderTextColor={colors.text.muted}
                multiline
              />
            </View>
            <Text style={styles.inputLabel}>Attachment (optional, max 10MB)</Text>
            <View style={styles.fileRow}>
              <Pressable style={styles.filePickerBtn} onPress={pickFile}>
                <AppIcon name="attach-outline" size={15} color={colors.teacher.accent} />
                <Text style={styles.filePickerText}>{form.file ? 'Change File' : 'Pick File'}</Text>
              </Pressable>
              {form.file ? (
                <Pressable style={styles.removeFileBtn} onPress={() => setForm(prev => ({ ...prev, file: null }))}>
                  <AppIcon name="trash-outline" size={14} color={colors.state.error} />
                  <Text style={styles.removeFileText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.helperText}>
              {form.file ? `${form.file.name} (${Math.ceil((form.file.size || 0) / 1024)} KB)` : 'No file selected'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setComposeOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={submit} disabled={createMutation.isPending}>
                {createMutation.isPending ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={styles.submitText}>Publish</Text>}
              </Pressable>
            </View>
        </KeyboardAwareModal>
      </Modal>

      <Modal visible={Boolean(selectedItem)} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>Attachment Preview</Text>
              <Pressable style={styles.detailCloseBtn} onPress={() => setSelectedItem(null)}>
                <AppIcon name="close" size={14} color={colors.teacher.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.detailTitle}>{selectedItem?.title || 'Content'}</Text>
            <Text style={styles.detailMeta}>
              {selectedItem?.subject || '-'} | {selectedItem?.classInfo?.name || '-'}-{selectedItem?.classInfo?.section || '-'}
            </Text>
            <Text style={styles.detailDesc}>{selectedItem?.description || '-'}</Text>
            {selectedItem?.file?.name ? (
              <View style={styles.filePill}>
                <AppIcon name="document-outline" size={13} color={colors.teacher.accent} />
                <Text style={styles.filePillText}>{selectedItem.file.name}</Text>
              </View>
            ) : null}
            {selectedItem?.file ? (
              <View style={styles.singleActionRow}>
                <Pressable style={styles.submitBtn} onPress={() => openAttachment(selectedItem)}>
                  <Text style={styles.submitText}>Open File</Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable style={styles.cancelBtn} onPress={() => setSelectedItem(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    deleteHomeworkBtn: { backgroundColor: colors.state.error },
    toolbarField: { flex: 1 },
    toolbarDropdown: { marginBottom: 0 },
    heroCard: {
      borderRadius: 22,
      backgroundColor: colors.teacher.heroBgAlt,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      padding: 15,
      marginBottom: 10,
      shadowColor: '#0c5f8a',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    heroOverline: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.4, fontWeight: '800' },
    heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 24, fontWeight: '900' },
    heroSub: { marginTop: 4, color: colors.auth.subtitle, fontSize: 12, lineHeight: 17 },
    segmentWrap: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      borderRadius: 13,
      overflow: 'hidden',
      marginBottom: 10,
      backgroundColor: colors.teacher.surfaceRaised,
    },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    segmentBtnActive: { backgroundColor: colors.teacher.navBg },
    segmentText: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700' },
    segmentTextActive: { color: colors.text.inverse },
    toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    filterBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      shadowColor: '#0b5a82',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    filterBtnActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.teacher.successBg,
    },
    filterText: { color: colors.teacher.textPrimary, fontSize: 11.5, fontWeight: '700', flex: 1 },
    filterPlaceholderText: { color: colors.teacher.textSecondary },
    addBtn: {
      borderRadius: 11,
      backgroundColor: colors.teacher.navBg,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      shadowColor: '#0c5c85',
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    addBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
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
    bannerText: { flex: 1, color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700', paddingRight: 8 },
    bannerClose: { color: colors.teacher.textPrimary, fontSize: 13, fontWeight: '700' },
    list: { flex: 1 },
    listContent: { paddingBottom: 12 },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
      marginBottom: 9,
      shadowColor: '#0c4f73',
      shadowOpacity: 0.1,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardType: { color: colors.teacher.accent, fontSize: 11, fontWeight: '800' },
    cardDate: { color: colors.teacher.textSecondary, fontSize: 11, fontWeight: '600' },
    cardTitle: { marginTop: 6, color: colors.teacher.textPrimary, fontSize: 13.5, fontWeight: '800' },
    cardMeta: { marginTop: 3, color: colors.teacher.textSecondary, fontSize: 11.5, fontWeight: '600' },
    cardDesc: { marginTop: 6, color: colors.teacher.textPrimary, fontSize: 12, lineHeight: 18 },
    fileLink: { marginTop: 9, color: colors.teacher.accent, fontSize: 12, fontWeight: '800' },
    emptyText: { textAlign: 'center', color: colors.teacher.textSecondary, marginTop: 18 },
    paginationRow: { marginTop: 6, marginBottom: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    pageBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.teacher.surface,
    },
    pageBtnDisabled: { opacity: 0.45 },
    pageBtnText: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700' },
    pageText: { color: colors.teacher.textSecondary, fontSize: 12.5, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: colors.teacher.modalBackdrop, justifyContent: 'flex-end' },
    modalScrollContent: { justifyContent: 'flex-end' },
    modalCard: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 15,
      minHeight: '62%',
    },
    modalTitle: { color: colors.teacher.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 10 },
    inputSelect: {
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      borderRadius: 12,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    inputSelectActive: {
      borderColor: colors.brand.primary,
      backgroundColor: colors.teacher.successBg,
      shadowColor: '#194c89',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    inputSelectText: { color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '600', flex: 1 },
    inputSelectPlaceholderText: { color: colors.teacher.textSecondary },
    inputLabel: {
      color: colors.teacher.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
    },
    inputRow: {
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      borderRadius: 10,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 11,
      marginBottom: 10,
    },
    inputRowMulti: { minHeight: 98 },
    input: { color: colors.teacher.textPrimary, fontSize: 12.5, paddingVertical: 10 },
    inputMulti: { minHeight: 90, textAlignVertical: 'top' },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    filePickerBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filePickerText: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700' },
    removeFileBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teacher.dangerBorder,
      backgroundColor: colors.teacher.dangerBg,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    removeFileText: { color: colors.state.error, fontSize: 11.5, fontWeight: '700' },
    helperText: { color: colors.teacher.textSecondary, fontSize: 11.5, marginBottom: 10 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    cancelBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.teacher.borderSoft, paddingHorizontal: 12, paddingVertical: 8 },
    cancelText: { color: colors.teacher.textPrimary, fontSize: 12, fontWeight: '700' },
    submitBtn: { borderRadius: 10, backgroundColor: colors.brand.primary, paddingHorizontal: 12, paddingVertical: 8, minWidth: 74, alignItems: 'center' },
    submitText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
    pickerOverlay: { flex: 1, backgroundColor: colors.teacher.modalBackdrop, justifyContent: 'center', paddingHorizontal: 16 },
    detailCard: {
      width: '100%',
      maxHeight: '74%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 14,
      shadowColor: '#0a2e46',
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      backgroundColor: colors.teacher.surfaceStrong,
    },
    detailTitle: { marginTop: 4, color: colors.teacher.textPrimary, fontSize: 18, fontWeight: '900' },
    detailMeta: { marginTop: 4, color: colors.teacher.textSecondary, fontSize: 12, fontWeight: '700' },
    detailDesc: { marginTop: 10, color: colors.teacher.textPrimary, fontSize: 13, lineHeight: 20 },
    filePill: {
      marginTop: 10,
      marginBottom: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filePillText: { color: colors.teacher.textSecondary, fontSize: 11.5, fontWeight: '700' },
    singleActionRow: { marginTop: 4, marginBottom: 2 },
  });
