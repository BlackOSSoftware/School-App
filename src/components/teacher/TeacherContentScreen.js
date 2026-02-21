import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  NativeModules,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { useTeacherClassesOverviewQuery } from '../../hooks/useTeacherQueries';
import { useCreateTeacherContentMutation, useTeacherMyContentQuery } from '../../hooks/useContentQueries';
import { downloadAndOpenContentFile, resolveContentFileUrl } from '../../services/fileService';
import { useAppTheme } from '../../theme/ThemeContext';

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

export default function TeacherContentScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [type, setType] = useState('homework');
  const [page, setPage] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [composeOpen, setComposeOpen] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [downloadingId, setDownloadingId] = useState('');
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
    const raw = Array.isArray(overviewQuery.data?.teacher?.lectureAssignments)
      ? overviewQuery.data.teacher.lectureAssignments.map(item => item?.subject)
      : [];
    return [...new Set(raw.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean))];
  }, [overviewQuery.data?.teacher?.lectureAssignments]);

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
  const totalPages = Number(listQuery.data?.totalPages ?? 1);

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2600);
    return () => clearTimeout(timer);
  }, [message.text]);

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
    const openUrl = resolveContentFileUrl(item?.file?.openUrl || item?.file?.url);
    if (!openUrl) {
      return;
    }
    try {
      await Linking.openURL(openUrl);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to open attachment.') });
    }
  };

  const handleDownloadAndOpen = async item => {
    if (!item?.file?.downloadUrl && !item?.file?.url && !item?.id) {
      return;
    }
    setDownloadingId(item.id);
    try {
      await downloadAndOpenContentFile({
        downloadUrl: item.file.downloadUrl,
        contentId: item.id,
        url: item.file.url,
        fileName: item.file.name || `${item.title}.pdf`,
        category: 'TeacherContent',
        mode: 'download',
      });
    } catch (error) {
      Alert.alert('Download failed', getErrorMessage(error, 'Unable to download and open file.'));
    } finally {
      setDownloadingId('');
    }
  };

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
        <Pressable style={styles.filterBtn} onPress={() => setShowClassPicker(true)}>
          <Ionicons name="business-outline" size={15} color={colors.teacher.accent} />
          <Text style={styles.filterText}>{selectedClassLabel}</Text>
        </Pressable>
        <Pressable style={styles.filterBtn} onPress={() => setShowSubjectPicker(true)}>
          <Ionicons name="book-outline" size={15} color={colors.teacher.accent} />
          <Text style={styles.filterText}>{selectedSubject || 'All Subjects'}</Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={openComposer}>
          <Ionicons name="add" size={14} color={colors.text.inverse} />
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
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {rows.map(item => (
            <Pressable key={item.id} style={styles.card} onPress={() => setSelectedItem(item)}>
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
          ))}
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
        </ScrollView>
      )}

      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Post Content</Text>
            <View style={styles.segmentWrap}>
              <Pressable style={[styles.segmentBtn, form.type === 'homework' ? styles.segmentBtnActive : null]} onPress={() => setForm(prev => ({ ...prev, type: 'homework' }))}>
                <Text style={[styles.segmentText, form.type === 'homework' ? styles.segmentTextActive : null]}>Homework</Text>
              </Pressable>
              <Pressable style={[styles.segmentBtn, form.type === 'notes' ? styles.segmentBtnActive : null]} onPress={() => setForm(prev => ({ ...prev, type: 'notes' }))}>
                <Text style={[styles.segmentText, form.type === 'notes' ? styles.segmentTextActive : null]}>Notes</Text>
              </Pressable>
            </View>

            <Pressable style={styles.inputSelect} onPress={() => setShowClassPicker(true)}>
              <Text style={styles.inputSelectText}>
                {form.classId ? classList.find(item => item.id === form.classId)?.label ?? form.classId : 'Select class'}
              </Text>
            </Pressable>
            <Pressable style={styles.inputSelect} onPress={() => setShowSubjectPicker(true)}>
              <Text style={styles.inputSelectText}>{form.subject || 'Select subject'}</Text>
            </Pressable>

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
                <Ionicons name="attach-outline" size={15} color={colors.teacher.accent} />
                <Text style={styles.filePickerText}>{form.file ? 'Change File' : 'Pick File'}</Text>
              </Pressable>
              {form.file ? (
                <Pressable style={styles.removeFileBtn} onPress={() => setForm(prev => ({ ...prev, file: null }))}>
                  <Ionicons name="trash-outline" size={14} color={colors.state.error} />
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
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedItem)} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.detailCard}>
            <Text style={styles.modalTitle}>{selectedItem?.title || 'Content'}</Text>
            <Text style={styles.detailMeta}>
              {selectedItem?.subject || '-'} | {selectedItem?.classInfo?.name || '-'}-{selectedItem?.classInfo?.section || '-'}
            </Text>
            <Text style={styles.detailDesc}>{selectedItem?.description || '-'}</Text>
            {selectedItem?.file?.name ? <Text style={styles.helperText}>{selectedItem.file.name}</Text> : null}
            {selectedItem?.file ? (
              <View style={styles.modalActions}>
                <Pressable style={styles.submitBtn} onPress={() => openAttachment(selectedItem)}>
                  <Text style={styles.submitText}>Open File</Text>
                </Pressable>
                <Pressable
                  style={styles.submitBtn}
                  onPress={() => handleDownloadAndOpen(selectedItem)}
                  disabled={downloadingId === selectedItem?.id}
                >
                  {downloadingId === selectedItem?.id
                    ? <ActivityIndicator size="small" color={colors.text.inverse} />
                    : <Text style={styles.submitText}>Download & Open</Text>}
                </Pressable>
              </View>
            ) : null}
            <Pressable style={styles.cancelBtn} onPress={() => setSelectedItem(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showClassPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <ScrollView style={styles.pickerList}>
              <Pressable style={styles.pickerItem} onPress={() => { setSelectedClassId(''); setForm(prev => ({ ...prev, classId: '' })); setShowClassPicker(false); }}>
                <Text style={styles.pickerText}>All / None</Text>
              </Pressable>
              {classList.map(item => (
                <Pressable key={item.id} style={styles.pickerItem} onPress={() => { setSelectedClassId(item.id); setForm(prev => ({ ...prev, classId: item.id })); setShowClassPicker(false); }}>
                  <Text style={styles.pickerText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setShowClassPicker(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSubjectPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            <ScrollView style={styles.pickerList}>
              <Pressable style={styles.pickerItem} onPress={() => { setSelectedSubject(''); setForm(prev => ({ ...prev, subject: '' })); setShowSubjectPicker(false); }}>
                <Text style={styles.pickerText}>All / None</Text>
              </Pressable>
              {subjects.map(subjectItem => (
                <Pressable key={subjectItem} style={styles.pickerItem} onPress={() => { setSelectedSubject(subjectItem); setForm(prev => ({ ...prev, subject: subjectItem })); setShowSubjectPicker(false); }}>
                  <Text style={styles.pickerText}>{subjectItem}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setShowSubjectPicker(false)}>
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
    filterText: { color: colors.teacher.textPrimary, fontSize: 11.5, fontWeight: '700', flex: 1 },
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
      borderRadius: 10,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    inputSelectText: { color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '600' },
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
    pickerCard: {
      width: '100%',
      maxHeight: '68%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    detailCard: {
      width: '100%',
      maxHeight: '74%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    detailMeta: { marginTop: 4, color: colors.teacher.textSecondary, fontSize: 12, fontWeight: '700' },
    detailDesc: { marginTop: 10, color: colors.teacher.textPrimary, fontSize: 13, lineHeight: 20 },
    pickerList: { maxHeight: 280 },
    pickerItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.teacher.borderSubtle },
    pickerText: { color: colors.teacher.textPrimary, fontSize: 12.5, fontWeight: '700' },
  });
