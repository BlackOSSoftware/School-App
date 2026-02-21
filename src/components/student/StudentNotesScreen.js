import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useStudentMyContentQuery } from '../../hooks/useContentQueries';
import { downloadAndOpenContentFile, openContentFile } from '../../services/fileService';
import { useAppTheme } from '../../theme/ThemeContext';

function MessageBanner({ message, type, styles }) {
  if (!message) return null;
  return (
    <View style={[styles.banner, type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

export default function StudentNotesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [busyId, setBusyId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    translateAnim.setValue(14);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim, selectedItem, page, subjectFilter]);

  const query = useStudentMyContentQuery({
    type: 'notes',
    page,
    limit: 10,
    subject: subjectFilter,
  });
  const subjectSourceQuery = useStudentMyContentQuery({
    type: 'all',
    page: 1,
    limit: 100,
    subject: '',
  });

  const rows = useMemo(() => (Array.isArray(query.data?.data) ? query.data.data : []), [query.data?.data]);
  const totalPages = Number(query.data?.totalPages ?? 1);
  const subjectOptions = useMemo(() => {
    const fromAll = Array.isArray(subjectSourceQuery.data?.data) ? subjectSourceQuery.data.data : [];
    const merged = [...fromAll, ...rows];
    const unique = [...new Set(merged.map(item => String(item?.subject ?? '').trim().toUpperCase()).filter(Boolean))];
    return ['ALL', ...unique];
  }, [rows, subjectSourceQuery.data?.data]);

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 2200);
    return () => clearTimeout(timer);
  }, [message.text]);

  const openAttachment = async item => {
    try {
      setBusyId(item?.id || '');
      await openContentFile({
        openUrl: item?.file?.openUrl,
        downloadUrl: item?.file?.downloadUrl,
        contentId: item?.id,
        url: item?.file?.url,
      });
      setMessage({ type: 'success', text: 'File opened successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Unable to open attachment.' });
    } finally {
      setBusyId('');
    }
  };

  const handleDownloadAndOpen = async item => {
    if (!item?.file?.downloadUrl && !item?.file?.url && !item?.id) return;
    setBusyId(item.id);
    try {
      await downloadAndOpenContentFile({
        openUrl: item.file.openUrl,
        downloadUrl: item.file.downloadUrl,
        contentId: item.id,
        url: item.file.url,
        fileName: item.file.name || `${item.title}.pdf`,
        category: 'Notes',
        mode: 'download',
      });
      setMessage({ type: 'success', text: 'File downloaded and opened successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Unable to download and open file.' });
    } finally {
      setBusyId('');
    }
  };

  if (selectedItem) {
    return (
      <Animated.View style={[styles.detailContainer, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => setSelectedItem(null)}>
            <Ionicons name="arrow-back" size={18} color={colors.student.textPrimary} />
          </Pressable>
          <View style={styles.topTitleWrap}>
            <Ionicons name="document-text-outline" size={16} color={colors.student.textPrimary} />
            <Text style={styles.topBarTitle}>Notes</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <MessageBanner message={message.text} type={message.type} styles={styles} />

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.detailTitle}>{selectedItem.title || '-'}</Text>
          <Text style={styles.detailMeta}>
            Subject: {selectedItem.subject || '-'} | Class: {selectedItem.classInfo?.name || '-'}-{selectedItem.classInfo?.section || '-'}
          </Text>
          <Text style={styles.detailDesc}>{selectedItem.description || '-'}</Text>
          {selectedItem.file?.name ? (
            <View style={styles.fileNameRow}>
              <Ionicons name="document-text-outline" size={14} color={colors.student.textSecondary} />
              <Text style={styles.fileName}>{selectedItem.file.name}</Text>
            </View>
          ) : null}

          {selectedItem.file ? (
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={() => openAttachment(selectedItem)} disabled={busyId === selectedItem.id}>
                {busyId === selectedItem.id
                  ? <ActivityIndicator size="small" color={colors.text.inverse} />
                  : <><Ionicons name="open-outline" size={15} color={colors.text.inverse} /><Text style={styles.actionBtnText}>Open Direct</Text></>}
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleDownloadAndOpen(selectedItem)} disabled={busyId === selectedItem.id}>
                {busyId === selectedItem.id
                  ? <ActivityIndicator size="small" color={colors.text.inverse} />
                  : <><Ionicons name="download-outline" size={15} color={colors.text.inverse} /><Text style={styles.actionBtnText}>Download</Text></>}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
      <View style={styles.headerRow}>
        <Ionicons name="document-text-outline" size={18} color={colors.student.textPrimary} />
        <Text style={styles.title}>Notes</Text>
      </View>
      <Text style={styles.sub}>Class notes with optional subject filter.</Text>

      <MessageBanner message={message.text} type={message.type} styles={styles} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {subjectOptions.map(item => (
          <Pressable
            key={item}
            style={[styles.filterChip, subjectFilter === item ? styles.filterChipActive : null]}
            onPress={() => {
              setPage(1);
              setSubjectFilter(item);
            }}
          >
            <Text style={[styles.filterChipText, subjectFilter === item ? styles.filterChipTextActive : null]}>
              {item === 'ALL' ? 'All Subjects' : item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {query.isLoading ? <ActivityIndicator size="small" color={colors.brand.primary} /> : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        {rows.map(item => (
          <Pressable key={item.id} style={styles.card} onPress={() => setSelectedItem(item)}>
            <View style={styles.cardTop}>
              <Ionicons name="document-outline" size={14} color={colors.brand.primary} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Text style={styles.cardMeta}>{item.subject || '-'} | {item.classInfo?.name || '-'}-{item.classInfo?.section || '-'}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <View style={styles.cardLinkRow}>
              <Ionicons name="chevron-forward" size={14} color={colors.brand.primary} />
              <Text style={styles.fileLink}>{item.file?.url ? 'Open details' : 'No attachment'}</Text>
            </View>
          </Pressable>
        ))}
        {!rows.length && !query.isLoading ? <Text style={styles.emptyText}>No notes found.</Text> : null}

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
    </Animated.View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: { flex: 1, marginTop: 10 },
    detailContainer: { flex: 1, marginTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    topTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    topBarTitle: { color: colors.student.textPrimary, fontSize: 16, fontWeight: '900' },
    title: { color: colors.student.textPrimary, fontSize: 17, fontWeight: '900' },
    sub: { marginTop: 6, marginBottom: 10, color: colors.student.textSecondary, fontSize: 12.5 },
    filterRow: { paddingBottom: 10, gap: 8 },
    filterChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surface,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    filterChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
    filterChipText: { color: colors.student.textPrimary, fontSize: 11.5, fontWeight: '700' },
    filterChipTextActive: { color: colors.text.inverse },
    banner: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
    bannerError: { backgroundColor: colors.student.dangerBg, borderWidth: 1, borderColor: colors.student.dangerBorder },
    bannerSuccess: { backgroundColor: colors.student.successBg, borderWidth: 1, borderColor: colors.student.successBorder },
    bannerText: { color: colors.student.textPrimary, fontSize: 12, fontWeight: '700' },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.student.borderStrong,
      backgroundColor: colors.student.surface,
      padding: 11,
      marginBottom: 8,
      shadowColor: '#251454',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardTitle: { color: colors.student.textPrimary, fontSize: 13, fontWeight: '800' },
    cardMeta: { marginTop: 3, color: colors.student.textSecondary, fontSize: 11.5, fontWeight: '700' },
    cardDesc: { marginTop: 6, color: colors.student.textPrimary, fontSize: 12, lineHeight: 18 },
    cardLinkRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    fileLink: { color: colors.brand.primary, fontSize: 12, fontWeight: '700' },
    detailTitle: { color: colors.student.textPrimary, fontSize: 20, fontWeight: '900' },
    detailMeta: { marginTop: 8, color: colors.student.textSecondary, fontSize: 12, fontWeight: '700' },
    detailDesc: { marginTop: 12, color: colors.student.textPrimary, fontSize: 13.5, lineHeight: 21 },
    fileNameRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    fileName: { color: colors.student.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 },
    actionRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.brand.primary,
      paddingVertical: 10,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    actionBtnText: { color: colors.text.inverse, fontSize: 12, fontWeight: '800' },
    emptyText: { textAlign: 'center', color: colors.student.textSecondary, marginTop: 20 },
    paginationRow: { marginTop: 4, marginBottom: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    pageBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.student.borderSoft,
      backgroundColor: colors.student.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    pageBtnDisabled: { opacity: 0.45 },
    pageBtnText: { color: colors.student.textPrimary, fontSize: 12, fontWeight: '700' },
    pageText: { color: colors.student.textSecondary, fontSize: 12, fontWeight: '700' },
  });
