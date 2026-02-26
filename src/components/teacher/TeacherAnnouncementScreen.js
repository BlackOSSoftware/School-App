import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useCreateTeacherAnnouncementMutation, useMyAnnouncementsQuery } from '../../hooks/useAnnouncementQueries';
import { useTeacherClassesOverviewQuery } from '../../hooks/useTeacherQueries';
import { useAppTheme } from '../../theme/ThemeContext';
import AnnouncementFeed from '../common/AnnouncementFeed';

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
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

export default function TeacherAnnouncementScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ title: '', description: '', classIds: [] });

  const createMutation = useCreateTeacherAnnouncementMutation();
  const overviewQuery = useTeacherClassesOverviewQuery();
  const announcementQuery = useMyAnnouncementsQuery({ page, limit: 10 });
  const classes = Array.isArray(overviewQuery.data?.assignedClasses) ? overviewQuery.data.assignedClasses : [];

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
    if (!form.classIds.length) {
      setMessage({ type: 'error', text: 'Please select at least one class.' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: form.title,
        description: form.description,
        classIds: form.classIds,
      });
      setMessage({ type: 'success', text: 'Announcement published successfully.' });
      setForm({ title: '', description: '', classIds: [] });
      setClassDropdownOpen(false);
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
          <Text style={styles.overline}>TEACHER BROADCAST</Text>
          <Text style={styles.heroTitle}>Class Notices</Text>
          <Text style={styles.heroSubtitle}>Share homework, reminders, and class-specific updates quickly.</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{classes.length}</Text>
          <Text style={styles.metricLabel}>Classes</Text>
        </View>
      </View>

      <View style={styles.toolbarRow}>
        <Text style={styles.sectionTitle}>Recent Updates</Text>
        <Pressable style={styles.composeBtn} onPress={() => setComposeOpen(true)}>
          <Ionicons name="add" size={15} color={colors.text.inverse} />
          <Text style={styles.composeBtnText}>Post</Text>
        </Pressable>
      </View>

      <MessageBanner
        text={message.text}
        type={message.type}
        onClose={() => setMessage({ type: '', text: '' })}
        styles={styles}
      />

      <AnnouncementFeed query={announcementQuery} page={page} onPageChange={setPage} variant="teacher" />

      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeadRow}>
              <Text style={styles.modalTitle}>Post Announcement</Text>
              <Pressable style={styles.circleClose} onPress={() => setComposeOpen(false)}>
                <Ionicons name="close" size={16} color={colors.teacher.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Target Class</Text>
            <Pressable style={styles.selectBtn} onPress={() => setClassDropdownOpen(prev => !prev)}>
              <Ionicons name="library-outline" size={16} color={colors.teacher.accent} />
              <Text style={styles.selectText}>
                {form.classIds.length
                  ? `${form.classIds.length} class${form.classIds.length > 1 ? 'es' : ''} selected`
                  : 'Select class(es)'}
              </Text>
              <Ionicons name={classDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.teacher.textSecondary} />
            </Pressable>
            {classDropdownOpen ? (
              <View style={styles.dropdownBox}>
                <ScrollView nestedScrollEnabled style={styles.modalList}>
                  {classes.map(item => (
                    <Pressable
                      key={item.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setForm(prev => {
                          const exists = prev.classIds.includes(item.id);
                          return {
                            ...prev,
                            classIds: exists
                              ? prev.classIds.filter(id => id !== item.id)
                              : [...prev.classIds, item.id],
                          };
                        });
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.label}</Text>
                      {form.classIds.includes(item.id) ? (
                        <Ionicons name="checkmark-circle" size={16} color={colors.brand.primary} />
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Title</Text>
            <View style={styles.inputRow}>
              <Ionicons name="megaphone-outline" size={16} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.title}
                onChangeText={value => setForm(prev => ({ ...prev, title: value }))}
                placeholder="e.g. Homework"
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
                placeholder="Write class announcement details"
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
      backgroundColor: colors.teacher.heroBg,
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
      color: colors.teacher.textPrimary,
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
      backgroundColor: colors.teacher.dangerBg,
      borderWidth: 1,
      borderColor: colors.teacher.dangerBorder,
    },
    bannerSuccess: {
      backgroundColor: colors.teacher.successBg,
      borderWidth: 1,
      borderColor: colors.teacher.successBorder,
    },
    bannerText: {
      flex: 1,
      color: colors.teacher.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      paddingRight: 10,
    },
    bannerClose: {
      color: colors.teacher.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.teacher.modalBackdrop,
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    modalCard: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 16,
      minHeight: '66%',
    },
    modalHeadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: {
      color: colors.teacher.textPrimary,
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
      borderColor: colors.teacher.borderSoft,
      backgroundColor: colors.teacher.surfaceStrong,
    },
    inputLabel: {
      color: colors.teacher.textSecondary,
      fontSize: 12,
      marginBottom: 6,
      marginTop: 2,
      fontWeight: '600',
    },
    selectBtn: {
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      borderRadius: 10,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectText: {
      flex: 1,
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '600',
    },
    dropdownBox: {
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      borderRadius: 10,
      backgroundColor: colors.teacher.surfaceStrong,
      marginBottom: 10,
      overflow: 'hidden',
    },
    inputRow: {
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      borderRadius: 10,
      backgroundColor: colors.teacher.surfaceStrong,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    inputRowMultiline: {
      alignItems: 'flex-start',
    },
    inputIcon: {
      color: colors.teacher.accent,
      marginRight: 8,
      marginTop: 11,
    },
    inputWithIcon: {
      flex: 1,
      color: colors.teacher.textPrimary,
      paddingVertical: 10,
      fontSize: 13,
    },
    multilineInput: {
      minHeight: 92,
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
      borderColor: colors.teacher.borderSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    cancelText: {
      color: colors.teacher.textPrimary,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.teacher.borderSubtle,
    },
    modalItemText: {
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '600',
    },
  });
