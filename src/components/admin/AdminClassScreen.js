import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import PaginationControls from '../common/PaginationControls';
import {
  useClassesQuery,
  useCreateClassMutation,
  useDeleteClassMutation,
  useUpdateClassMutation,
} from '../../hooks/useClassQueries';
import { useAppTheme } from '../../theme/ThemeContext';

const PAGE_LIMIT = 20;

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

function getErrorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function MessageBanner({ type, text, onClose, styles }) {
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

export default function AdminClassScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const textScale = useMemo(() => Math.min(Math.max(width / 390, 1), 1.22), [width]);

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [classId, setClassId] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [deleteId, setDeleteId] = useState('');

  const animation = useRef(new Animated.Value(0)).current;

  const classesQuery = useClassesQuery(page, PAGE_LIMIT);
  const createMutation = useCreateClassMutation();
  const updateMutation = useUpdateClassMutation();
  const deleteMutation = useDeleteClassMutation();

  const listResponse = classesQuery.data ?? {};
  const classList = Array.isArray(listResponse.data) ? listResponse.data : [];
  const totalPages = Number(listResponse.totalPages ?? 1);

  const closeMessage = () => setMessage({ type: '', text: '' });

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  const resetAndReload = () => {
    if (page === 1) {
      classesQuery.refetch();
      return;
    }
    setPage(1);
  };

  const openAddModal = () => {
    setModalMode('add');
    setClassId('');
    setName('');
    setSection('');
    setModalVisible(true);
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openEditModal = (item) => {
    const itemId = getEntityId(item);
    if (!itemId) {
      setMessage({ type: 'error', text: 'Invalid class record selected.' });
      return;
    }
    setModalMode('edit');
    setClassId(itemId);
    setName(String(item.name ?? ''));
    setSection(String(item.section ?? ''));
    setModalVisible(true);
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const saveClass = async () => {
    if (!name.trim() || !section.trim()) {
      setMessage({ type: 'error', text: 'Class name and section are required.' });
      return;
    }

    try {
      if (modalMode === 'add') {
        await createMutation.mutateAsync({ name, section });
        setMessage({ type: 'success', text: 'Class created successfully.' });
      } else {
        await updateMutation.mutateAsync({
          id: classId,
          payload: { name: name.trim(), section: section.trim().toUpperCase() },
        });
        setMessage({ type: 'success', text: 'Class updated successfully.' });
      }
      closeModal();
      resetAndReload();
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, modalMode === 'add' ? 'Unable to create class.' : 'Unable to update class.'),
      });
    }
  };

  const runDelete = async (id) => {
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid class id for delete.' });
      return;
    }
    setDeleteId(id);
    try {
      await deleteMutation.mutateAsync(id);
      setMessage({ type: 'success', text: 'Class deleted successfully.' });
      resetAndReload();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete class.') });
    } finally {
      setDeleteId('');
    }
  };

  const footer = useMemo(
    () => (
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(prev => Math.max(1, prev - 1))}
        onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
        disablePrev={page <= 1 || classesQuery.isFetching}
        disableNext={page >= totalPages || classesQuery.isFetching}
      />
    ),
    [classesQuery.isFetching, page, totalPages],
  );

  const header = () => (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>ACADEMIC STRUCTURE</Text>
        <Text style={[styles.heroTitle, { fontSize: 25 * textScale }]}>Manage Classes</Text>
        <Text style={[styles.heroSub, { fontSize: 13 * textScale }]}>
          Build class-section structure and keep records clean.
        </Text>
      </View>

      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.heading, { fontSize: 22 * textScale }]}>Class Directory</Text>
          <Text style={[styles.subHeading, { fontSize: 14 * textScale }]}>
            Create, edit and organize class sections
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Text style={[styles.addBtnText, { fontSize: 14 * textScale }]}>+ Add Class</Text>
        </Pressable>
      </View>

      <MessageBanner type={message.type} text={message.text} onClose={closeMessage} styles={styles} />

      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeading, { fontSize: 18 * textScale }]}>Class Directory</Text>
        {classesQuery.isFetching && page === 1 ? (
          <ActivityIndicator size="small" color={colors.brand.primary} />
        ) : null}
      </View>
    </View>
  );

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 0],
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={classList}
        keyExtractor={(item, index) => getEntityId(item) || `class-${index}`}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator
        renderItem={({ item }) => {
          const itemId = getEntityId(item);
          return (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={[styles.cardTitle, { fontSize: 17 * textScale }]}>Class {item.name}</Text>
              <Text style={[styles.cardMeta, { fontSize: 13 * textScale }]}>Section: {item.section}</Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable style={styles.editBtn} onPress={() => openEditModal(item)}>
                <Text style={[styles.editBtnText, { fontSize: 12 * textScale }]}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => runDelete(itemId)}
                disabled={!itemId || deleteId === itemId}
              >
                {deleteId === itemId ? (
                  <ActivityIndicator size="small" color={colors.state.error} />
                ) : (
                  <Text style={[styles.deleteBtnText, { fontSize: 12 * textScale }]}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
          );
        }}
        ListEmptyComponent={
          classesQuery.isLoading ? null : (
            <Text style={[styles.emptyText, { fontSize: 14 * textScale }]}>No classes found.</Text>
          )
        }
      />

      <Modal visible={modalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: animation,
                transform: [{ translateY }],
              },
            ]}
          >
            <Text style={[styles.modalTitle, { fontSize: 20 * textScale }]}>
              {modalMode === 'add' ? 'Add New Class' : 'Edit Class'}
            </Text>
            <Text style={[styles.modalSub, { fontSize: 13 * textScale }]}>
              Enter class details below
            </Text>

            <Text style={styles.inputLabel}>Class Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="school-outline" size={18} color={colors.admin.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={name}
                onChangeText={setName}
                placeholder="e.g. 11"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Section</Text>
            <View style={styles.inputRow}>
              <Ionicons name="layers-outline" size={18} color={colors.admin.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={section}
                onChangeText={setSection}
                autoCapitalize="characters"
                placeholder="e.g. A or SCIENCE"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={closeModal}>
                <Text style={[styles.cancelBtnText, { fontSize: 13 * textScale }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={saveClass}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Text style={[styles.saveBtnText, { fontSize: 13 * textScale }]}>
                  {modalMode === 'add' ? 'Create' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  headerWrap: {
    paddingTop: 10,
    marginBottom: 10,
  },
  heroCard: {
    borderRadius: 22,
    backgroundColor: colors.admin.heroBgAlt,
    borderWidth: 1,
    borderColor: colors.admin.borderSoft,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#1c4da1',
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
    fontWeight: '900',
  },
  heroSub: {
    marginTop: 4,
    color: colors.auth.subtitle,
    lineHeight: 19,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  heading: {
    color: colors.admin.textPrimary,
    fontWeight: '800',
  },
  subHeading: {
    color: colors.admin.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: colors.admin.navBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    shadowColor: '#1e4da0',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  listHeaderRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeading: {
    color: colors.admin.textPrimary,
    fontWeight: '800',
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
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
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 10,
  },
  bannerClose: {
    color: colors.admin.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    backgroundColor: colors.admin.surface,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1d447f',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    color: colors.admin.textPrimary,
    fontWeight: '800',
  },
  cardMeta: {
    marginTop: 4,
    color: colors.admin.textSecondary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  editBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.admin.surface,
  },
  editBtnText: {
    color: colors.admin.textPrimary,
    fontWeight: '700',
  },
  deleteBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.state.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 58,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: colors.state.error,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.admin.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  footerLoader: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.admin.modalBackdrop,
  },
  modalCard: {
    backgroundColor: colors.admin.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 22,
  },
  modalTitle: {
    color: colors.admin.textPrimary,
    fontWeight: '900',
  },
  modalSub: {
    marginTop: 4,
    color: colors.admin.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    color: colors.admin.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.admin.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.admin.textPrimary,
    marginBottom: 10,
    fontSize: 15,
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
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    color: colors.admin.textPrimary,
    paddingVertical: 11,
    fontSize: 14,
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
  },
  saveBtn: {
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
