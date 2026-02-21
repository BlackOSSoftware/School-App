import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useCreateAdminAnnouncementMutation, useMyAnnouncementsQuery } from '../../hooks/useAnnouncementQueries';
import { useClassesQuery } from '../../hooks/useClassQueries';
import { useAppTheme } from '../../theme/ThemeContext';
import AnnouncementFeed from '../common/AnnouncementFeed';

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
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
  }
  return '';
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

export default function AdminAnnouncementScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    announcementType: 'school_wide',
    classId: '',
  });

  const classesQuery = useClassesQuery(1, 200);
  const createMutation = useCreateAdminAnnouncementMutation();
  const announcementQuery = useMyAnnouncementsQuery({ page, limit: 10 });

  const classList = useMemo(
    () => (Array.isArray(classesQuery.data?.data) ? classesQuery.data.data : []),
    [classesQuery.data?.data],
  );

  const classLabelById = useMemo(() => {
    const map = new Map();
    classList.forEach(item => {
      const id = getEntityId(item);
      if (id) {
        map.set(id, `${item.name} - ${item.section}`);
      }
    });
    return map;
  }, [classList]);

  const total = Number(announcementQuery.data?.total ?? 0);

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2800);
    return () => clearTimeout(timer);
  }, [message.text]);

  const createAnnouncement = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required.' });
      return;
    }

    if (form.announcementType === 'class_wise' && !form.classId) {
      setMessage({ type: 'error', text: 'Please select class for class-wise announcement.' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: form.title,
        description: form.description,
        announcementType: form.announcementType,
        classId: form.classId,
      });
      setMessage({ type: 'success', text: 'Announcement published successfully.' });
      setForm({ title: '', description: '', announcementType: 'school_wide', classId: '' });
      setComposeOpen(false);
      setPage(1);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to create announcement.') });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.overline}>COMMUNICATION HUB</Text>
          <Text style={styles.heroTitle}>Announcement Desk</Text>
          <Text style={styles.heroSubtitle}>Broadcast school and class updates with structured delivery.</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{total}</Text>
          <Text style={styles.metricLabel}>Posted</Text>
        </View>
      </View>

      <View style={styles.toolbarRow}>
        <Text style={styles.sectionTitle}>Latest Announcements</Text>
        <Pressable style={styles.composeBtn} onPress={() => setComposeOpen(true)}>
          <Ionicons name="add" size={15} color={colors.text.inverse} />
          <Text style={styles.composeBtnText}>Create</Text>
        </Pressable>
      </View>

      <MessageBanner
        text={message.text}
        type={message.type}
        onClose={() => setMessage({ type: '', text: '' })}
        styles={styles}
      />

      <AnnouncementFeed query={announcementQuery} page={page} onPageChange={setPage} variant="admin" />

      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeadRow}>
              <Text style={styles.modalTitle}>New Announcement</Text>
              <Pressable style={styles.circleClose} onPress={() => setComposeOpen(false)}>
                <Ionicons name="close" size={16} color={colors.admin.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Audience Type</Text>
            <View style={styles.segmentWrap}>
              <Pressable
                style={[styles.segmentBtn, form.announcementType === 'school_wide' ? styles.segmentBtnActive : null]}
                onPress={() => setForm(prev => ({ ...prev, announcementType: 'school_wide', classId: '' }))}
              >
                <Text style={[styles.segmentText, form.announcementType === 'school_wide' ? styles.segmentTextActive : null]}>
                  School Wide
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, form.announcementType === 'class_wise' ? styles.segmentBtnActive : null]}
                onPress={() => setForm(prev => ({ ...prev, announcementType: 'class_wise' }))}
              >
                <Text style={[styles.segmentText, form.announcementType === 'class_wise' ? styles.segmentTextActive : null]}>
                  Class Wise
                </Text>
              </Pressable>
            </View>

            {form.announcementType === 'class_wise' ? (
              <>
                <Text style={styles.inputLabel}>Target Class</Text>
                <Pressable style={styles.selectBtn} onPress={() => setShowClassPicker(true)}>
                  <Ionicons name="library-outline" size={16} color={colors.admin.accent} />
                  <Text style={styles.selectText}>
                    {form.classId ? classLabelById.get(form.classId) ?? form.classId : 'Select class'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.admin.textSecondary} />
                </Pressable>
              </>
            ) : null}

            <Text style={styles.inputLabel}>Title</Text>
            <View style={styles.inputRow}>
              <Ionicons name="megaphone-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.title}
                onChangeText={value => setForm(prev => ({ ...prev, title: value }))}
                placeholder="e.g. Class 10A Test"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Details</Text>
            <View style={[styles.inputRow, styles.inputRowMultiline]}>
              <Ionicons name="document-text-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputWithIcon, styles.multilineInput]}
                value={form.description}
                onChangeText={value => setForm(prev => ({ ...prev, description: value }))}
                placeholder="Write announcement details"
                placeholderTextColor={colors.text.muted}
                multiline
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setComposeOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.publishBtn} onPress={createAnnouncement} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.publishText}>Publish</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showClassPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <ScrollView style={styles.modalList}>
              {classList.map(item => {
                const classId = getEntityId(item);
                if (!classId) {
                  return null;
                }
                return (
                  <Pressable
                    key={classId}
                    style={styles.modalItem}
                    onPress={() => {
                      setForm(prev => ({ ...prev, classId }));
                      setShowClassPicker(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.name} - {item.section}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setShowClassPicker(false)}>
              <Text style={styles.closeText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
      borderRadius: 20,
      backgroundColor: colors.admin.heroBg,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    heroLeft: {
      flex: 1,
    },
    overline: {
      color: colors.auth.subtitle,
      fontSize: 10.5,
      letterSpacing: 1.4,
      fontWeight: '800',
    },
    heroTitle: {
      marginTop: 7,
      color: colors.text.inverse,
      fontSize: 23,
      fontWeight: '900',
    },
    heroSubtitle: {
      marginTop: 5,
      color: colors.auth.subtitle,
      fontSize: 12,
      lineHeight: 17,
    },
    metricCard: {
      width: 84,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    metricValue: {
      color: colors.text.inverse,
      fontSize: 25,
      fontWeight: '900',
    },
    metricLabel: {
      marginTop: 2,
      color: colors.auth.subtitle,
      fontSize: 11,
      fontWeight: '700',
    },
    toolbarRow: {
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      color: colors.admin.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    composeBtn: {
      borderRadius: 20,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      shadowColor: '#12406e',
      shadowOpacity: 0.24,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    composeBtnText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '800',
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
      fontWeight: '700',
      paddingRight: 10,
    },
    bannerClose: {
      color: colors.admin.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.admin.modalBackdrop,
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    modalCard: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 16,
      minHeight: '70%',
    },
    pickerCard: {
      width: '100%',
      maxHeight: '70%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      backgroundColor: colors.admin.surface,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 'auto',
      marginBottom: 'auto',
      alignSelf: 'center',
    },
    modalHeadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: {
      color: colors.admin.textPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    circleClose: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
    },
    inputLabel: {
      color: colors.admin.textSecondary,
      fontSize: 12,
      marginBottom: 6,
      marginTop: 2,
      fontWeight: '600',
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
      alignItems: 'center',
      paddingVertical: 10,
      backgroundColor: colors.admin.surfaceStrong,
    },
    segmentBtnActive: {
      backgroundColor: colors.brand.primary,
    },
    segmentText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    segmentTextActive: {
      color: colors.text.inverse,
    },
    selectBtn: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectText: {
      flex: 1,
      color: colors.admin.textPrimary,
      fontSize: 12.5,
      fontWeight: '600',
    },
    inputRow: {
      borderWidth: 1,
      borderColor: colors.admin.borderStrong,
      borderRadius: 10,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    inputRowMultiline: {
      alignItems: 'flex-start',
    },
    inputIcon: {
      color: colors.admin.accent,
      marginRight: 8,
      marginTop: 11,
    },
    inputWithIcon: {
      flex: 1,
      color: colors.admin.textPrimary,
      paddingVertical: 10,
      fontSize: 13,
    },
    multilineInput: {
      minHeight: 94,
      textAlignVertical: 'top',
    },
    modalFooter: {
      marginTop: 6,
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
    cancelText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    publishBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      minWidth: 76,
      alignItems: 'center',
    },
    publishText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '800',
    },
    modalList: {
      maxHeight: 260,
    },
    modalItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.admin.borderSubtle,
    },
    modalItemText: {
      color: colors.admin.textPrimary,
      fontSize: 12.5,
      fontWeight: '600',
    },
    closeBtn: {
      alignSelf: 'flex-end',
      marginTop: 10,
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    closeText: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: '700',
    },
  });
