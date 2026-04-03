import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import AppIcon from '../common/AppIcon.js';
import KeyboardAwareModal from '../common/KeyboardAwareModal';
import InAppVideoPlayerModal from '../common/InAppVideoPlayerModal';
import {
  useAdminVideosQuery,
  useCreateAdminVideoMutation,
  useDeleteAdminVideoMutation,
  useUpdateAdminVideoMutation,
} from '../../hooks/useVideoQueries';
import { useAppTheme } from '../../theme/ThemeContext';

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export default function AdminVideoScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [playerItem, setPlayerItem] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ title: '', description: '', file: null });

  const listQuery = useAdminVideosQuery({ page, limit: 10 });
  const createMutation = useCreateAdminVideoMutation();
  const updateMutation = useUpdateAdminVideoMutation();
  const deleteMutation = useDeleteAdminVideoMutation();

  const rows = Array.isArray(listQuery.data?.data) ? listQuery.data.data : [];
  const totalPages = Number(listQuery.data?.totalPages ?? 1);
  const saving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditingId('');
    setForm({ title: '', description: '', file: null });
    setComposeOpen(true);
  };

  const openEdit = item => {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description, file: null });
    setComposeOpen(true);
  };

  const pickVideo = async () => {
    try {
      const picked = await pick({
        presentationStyle: 'fullScreen',
        type: [types.video],
        mode: 'import',
      });
      const selected = Array.isArray(picked) ? picked[0] : null;
      if (!selected) return;

      if (Number(selected?.size ?? 0) > MAX_VIDEO_BYTES) {
        setMessage({ type: 'error', text: 'Video size cannot exceed 50 MB.' });
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
          // Use original URI if local copy is unavailable.
        }
      }

      setForm(prev => ({
        ...prev,
        file: {
          uri: uploadUri || selected.uri,
          name: selected.name || 'video.mp4',
          type: selected.type || 'video/mp4',
          size: Number(selected.size ?? 0),
        },
      }));
    } catch (error) {
      if (!isErrorWithCode(error) || error.code !== errorCodes.OPERATION_CANCELED) {
        setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to pick video.') });
      }
    }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required.' });
      return;
    }
    if (!editingId && !form.file?.uri) {
      setMessage({ type: 'error', text: 'Please attach a video file.' });
      return;
    }
    if (form.file && Number(form.file.size || 0) > MAX_VIDEO_BYTES) {
      setMessage({ type: 'error', text: 'Video size cannot exceed 50 MB.' });
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          title: form.title,
          description: form.description,
          file: form.file || undefined,
        });
        setMessage({ type: 'success', text: 'Video updated successfully.' });
      } else {
        await createMutation.mutateAsync({
          title: form.title,
          description: form.description,
          file: form.file,
        });
        setMessage({ type: 'success', text: 'Video uploaded successfully.' });
      }
      setComposeOpen(false);
      setPage(1);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to save video.') });
    }
  };

  const deleteVideo = async id => {
    try {
      await deleteMutation.mutateAsync(id);
      setMessage({ type: 'success', text: 'Video deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete video.') });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>VIDEO LIBRARY</Text>
        <Text style={styles.heroTitle}>Admin Videos</Text>
        <Text style={styles.heroSub}>Upload, edit, and manage in-app learning videos.</Text>
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <AppIcon name="add" size={14} color={colors.text.inverse} />
          <Text style={styles.addBtnText}>Upload Video</Text>
        </Pressable>
      </View>

      {message.text ? (
        <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
          <Text style={styles.bannerText}>{message.text}</Text>
        </View>
      ) : null}

      {listQuery.isLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setPlayerItem(item)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.cardMeta}>{Math.max(1, Math.round((item.file?.size || 0) / (1024 * 1024)))} MB</Text>
              <View style={styles.rowActions}>
                <Pressable style={styles.playBtn} onPress={() => setPlayerItem(item)}>
                  <AppIcon name="play-circle-outline" size={13} color={colors.text.inverse} />
                  <Text style={styles.playBtnText}>Play</Text>
                </Pressable>
                <Pressable style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => deleteVideo(item.id)} disabled={deleteMutation.isPending}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
          ListFooterComponent={(
            <View style={styles.paginationRow}>
              <Pressable style={[styles.pageBtn, page <= 1 ? styles.disabledBtn : null]} onPress={() => setPage(prev => Math.max(1, prev - 1))} disabled={page <= 1}>
                <Text style={styles.pageText}>Prev</Text>
              </Pressable>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <Pressable style={[styles.pageBtn, page >= totalPages ? styles.disabledBtn : null]} onPress={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                <Text style={styles.pageText}>Next</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <KeyboardAwareModal
          overlayStyle={styles.modalOverlay}
          scrollContentStyle={styles.modalScroll}
          contentContainerStyle={styles.modalCard}
          dismissKeyboardOnBackdrop
        >
          <Text style={styles.modalTitle}>{editingId ? 'Edit Video' : 'Upload Video'}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={value => setForm(prev => ({ ...prev, title: value }))}
              placeholder="Video title"
              placeholderTextColor={colors.text.muted}
            />
          </View>
          <View style={[styles.inputRow, styles.inputAreaWrap]}>
            <TextInput
              style={[styles.input, styles.inputArea]}
              value={form.description}
              onChangeText={value => setForm(prev => ({ ...prev, description: value }))}
              placeholder="Video description"
              placeholderTextColor={colors.text.muted}
              multiline
            />
          </View>
          <Pressable style={styles.fileBtn} onPress={pickVideo}>
            <AppIcon name="attach-outline" size={14} color={colors.admin.accent} />
            <Text style={styles.fileBtnText}>{form.file ? 'Change Video' : 'Choose Video (max 50 MB)'}</Text>
          </Pressable>
          <Text style={styles.fileText}>
            {form.file ? `${form.file.name} (${Math.round((form.file.size || 0) / (1024 * 1024))} MB)` : editingId ? 'No new file selected' : 'No file selected'}
          </Text>

          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setComposeOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={styles.saveText}>{editingId ? 'Save Changes' : 'Upload'}</Text>}
            </Pressable>
          </View>
        </KeyboardAwareModal>
      </Modal>

      <InAppVideoPlayerModal
        visible={Boolean(playerItem)}
        onClose={() => setPlayerItem(null)}
        videoItem={playerItem}
        variant="admin"
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  heroCard: { borderRadius: 18, backgroundColor: colors.admin.heroBgAlt, padding: 14, marginBottom: 10 },
  heroOverline: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.3, fontWeight: '800' },
  heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 23, fontWeight: '900' },
  heroSub: { marginTop: 5, color: colors.auth.subtitle, fontSize: 12.2, lineHeight: 17 },
  toolbar: { marginBottom: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  addBtn: { borderRadius: 10, backgroundColor: colors.brand.primary, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
  banner: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  bannerError: { backgroundColor: colors.admin.dangerBg, borderWidth: 1, borderColor: colors.admin.dangerBorder },
  bannerSuccess: { backgroundColor: colors.admin.successBg, borderWidth: 1, borderColor: colors.admin.successBorder },
  bannerText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
  listContent: { paddingBottom: 12 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: colors.admin.borderStrong, backgroundColor: colors.admin.surface, padding: 12, marginBottom: 10 },
  cardTitle: { color: colors.admin.textPrimary, fontSize: 15, fontWeight: '900' },
  cardDesc: { marginTop: 6, color: colors.admin.textSecondary, fontSize: 12.5, lineHeight: 18 },
  cardMeta: { marginTop: 7, color: colors.admin.accent, fontSize: 11.5, fontWeight: '800' },
  rowActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  playBtn: { borderRadius: 8, backgroundColor: colors.admin.accent, paddingHorizontal: 11, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  playBtnText: { color: colors.text.inverse, fontSize: 11.5, fontWeight: '800' },
  editBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.admin.borderSoft, paddingHorizontal: 11, paddingVertical: 6 },
  editBtnText: { color: colors.admin.textPrimary, fontSize: 11.5, fontWeight: '700' },
  deleteBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.state.error, paddingHorizontal: 11, paddingVertical: 6 },
  deleteBtnText: { color: colors.state.error, fontSize: 11.5, fontWeight: '700' },
  paginationRow: { marginTop: 2, marginBottom: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  pageBtn: { borderRadius: 8, borderWidth: 1, borderColor: colors.admin.borderSoft, backgroundColor: colors.admin.surface, paddingHorizontal: 10, paddingVertical: 6 },
  disabledBtn: { opacity: 0.45 },
  pageText: { color: colors.admin.textPrimary, fontSize: 11.5, fontWeight: '700' },
  pageInfo: { color: colors.admin.textSecondary, fontSize: 11.5, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: colors.admin.modalBackdrop, justifyContent: 'flex-end' },
  modalScroll: { justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: colors.admin.borderStrong, backgroundColor: colors.admin.surface, padding: 15, minHeight: '58%' },
  modalTitle: { color: colors.admin.textPrimary, fontSize: 16.5, fontWeight: '900', marginBottom: 10 },
  inputRow: { borderWidth: 1, borderColor: colors.admin.borderSoft, borderRadius: 10, paddingHorizontal: 11, backgroundColor: colors.admin.surfaceStrong, marginBottom: 10 },
  input: { color: colors.admin.textPrimary, fontSize: 13, paddingVertical: 10 },
  inputAreaWrap: { minHeight: 98 },
  inputArea: { minHeight: 88, textAlignVertical: 'top' },
  fileBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.admin.borderSoft, backgroundColor: colors.admin.surfaceStrong, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileBtnText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
  fileText: { marginTop: 8, color: colors.admin.textSecondary, fontSize: 11.5, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.admin.borderSoft, paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { color: colors.admin.textPrimary, fontSize: 12, fontWeight: '700' },
  saveBtn: { borderRadius: 10, backgroundColor: colors.brand.primary, paddingHorizontal: 12, paddingVertical: 8, minWidth: 84, alignItems: 'center' },
  saveText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
});
