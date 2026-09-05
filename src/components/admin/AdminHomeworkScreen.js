import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAdminHomeworkQuery, useAdminHomeworkMutations } from '../../hooks/useContentQueries';
import AppIcon from '../common/AppIcon';
import { openContentFile } from '../../services/fileService';
import { useAppTheme } from '../../theme/ThemeContext';

export default function AdminHomeworkScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState('');
  const [fileError, setFileError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState('');
  const { update, remove } = useAdminHomeworkMutations();
  const busy = update.isPending || remove.isPending;
  const query = useAdminHomeworkQuery({ page, search });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const saveHomework = async () => {
    if (!editing.title.trim() || !editing.subject.trim() || !editing.description.trim()) {
      setEditError('Title, subject and description are required.');
      return;
    }
    setEditError('');
    try {
      await update.mutateAsync(editing);
      setEditing(null);
    } catch (error) {
      setEditError(error.response?.data?.message || 'Unable to save homework. Please retry.');
    }
  };

  const confirmDelete = item => Alert.alert(
    'Delete homework?',
    `Delete "${item.title}" and its attachment permanently?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setFileError('');
        try {
          await remove.mutateAsync(item.id);
        } catch (error) {
          setFileError(error.response?.data?.message || 'Unable to delete homework. Please retry.');
        }
      } },
    ],
  );
  const rows = query.data?.data ?? [];
  const totalPages = Math.max(1, query.data?.totalPages ?? 1);
  const errorStatus = query.error?.response?.status;
  const loadError = errorStatus === 404
    ? 'Homework is not available on this server yet. Please update the backend and retry.'
    : !query.error?.response
      ? 'Cannot connect to the server. Check your connection and retry.'
      : 'Unable to load homework. Please try again.';

  useEffect(() => {
    if (__DEV__ && query.error) {
      console.warn('[AdminHomework]', errorStatus || 'network-error', query.error.config?.baseURL, query.error.message);
    }
  }, [errorStatus, query.error]);

  useEffect(() => {
    if (query.data && page > totalPages) setPage(totalPages);
  }, [page, query.data, totalPages]);

  const openAttachment = async item => {
    setOpeningId(item.id);
    setFileError('');
    try {
      await openContentFile({ ...item.file, contentId: item.id });
    } catch (error) {
      setFileError(error?.message || 'Unable to open attachment. Please try again.');
    } finally {
      setOpeningId('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>All Homework</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? 'Close search' : 'Search homework'} accessibilityState={{ expanded: searchOpen }} style={styles.iconButton} onPress={() => {
          setSearchOpen(value => !value);
          if (searchOpen) { setSearchText(''); setSearch(''); setPage(1); }
        }}>
          <AppIcon name={searchOpen ? 'close' : 'search-outline'} size={24} color={colors.admin.textPrimary} />
        </Pressable>
      </View>
      {searchOpen ? <TextInput autoFocus accessibilityLabel="Search homework" placeholder="Search title, subject, class or teacher" placeholderTextColor={colors.admin.textSecondary} value={searchText} onChangeText={setSearchText} maxLength={120} style={styles.input} returnKeyType="search" autoCorrect={false} /> : null}
      <Text style={styles.meta}>All classes and sessions{query.data ? ` • ${query.data.total} homework` : ''}</Text>
      {fileError ? <Text accessibilityRole="alert" style={styles.error}>{fileError}</Text> : null}
      {query.isError ? (
        <View style={styles.status}>
          <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => query.refetch()} disabled={query.isFetching}>
            <Text style={styles.buttonText}>{query.isFetching ? 'Retrying...' : 'Retry'}</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        key={page}
        data={rows}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListEmptyComponent={query.isLoading
          ? <ActivityIndicator style={styles.status} color={colors.brand.primary} />
          : !query.isError ? <Text style={styles.statusText}>No homework found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title || 'Untitled homework'}</Text>
            <Text style={styles.meta}>Class: {[item.classInfo.name, item.classInfo.section].filter(Boolean).join(' - ') || 'Unavailable'} • Subject: {item.subject || 'Unavailable'}</Text>
            <Text style={styles.meta}>Teacher: {item.teacherName || 'Unavailable'}</Text>
            {item.sessionName ? <Text style={styles.meta}>Session: {item.sessionName}</Text> : null}
            {item.createdAt && !Number.isNaN(new Date(item.createdAt).getTime()) ? <Text style={styles.meta}>Posted: {new Date(item.createdAt).toLocaleDateString()}</Text> : null}
            <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
            {item.file?.url ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Open attachment for ${item.title}`} style={styles.button} disabled={Boolean(openingId)} onPress={() => openAttachment(item)}>
                {openingId === item.id ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.buttonText}>Open attachment{item.file.name ? `: ${item.file.name}` : ''}</Text>}
              </Pressable>
            ) : <Text style={styles.meta}>No attachment</Text>}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} disabled={busy} style={[styles.button, styles.actionButton, busy && styles.disabled]} onPress={() => {
                setEditError('');
                setEditing({ id: item.id, title: item.title, subject: item.subject, description: item.description });
              }}>
                <Text style={styles.buttonText}>Edit</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} disabled={busy} style={[styles.button, styles.actionButton, styles.deleteButton, busy && styles.disabled]} onPress={() => confirmDelete(item)}>
                <Text style={styles.buttonText}>{remove.isPending && remove.variables === item.id ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <View style={styles.pagination}>
        <Pressable accessibilityRole="button" style={[styles.button, (page <= 1 || query.isFetching) && styles.disabled]} disabled={page <= 1 || query.isFetching} onPress={() => { setFileError(''); setPage(value => value - 1); }}>
          <Text style={styles.buttonText}>Previous</Text>
        </Pressable>
        <Text style={styles.meta}>{page} / {query.data ? totalPages : '…'}</Text>
        <Pressable accessibilityRole="button" style={[styles.button, (!query.data || page >= totalPages || query.isFetching) && styles.disabled]} disabled={!query.data || page >= totalPages || query.isFetching} onPress={() => { setFileError(''); setPage(value => value + 1); }}>
          <Text style={styles.buttonText}>Next</Text>
        </Pressable>
      </View>
      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => { if (!update.isPending) setEditing(null); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.editor}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.heading}>Edit homework</Text>
              {editError ? <Text accessibilityRole="alert" style={styles.error}>{editError}</Text> : null}
              {['title', 'subject', 'description'].map(field => (
                <View key={field}>
                  <Text style={styles.meta}>{field === 'title' ? 'Title' : field === 'subject' ? 'Subject' : 'Description'}</Text>
                  <TextInput accessibilityLabel={`Homework ${field}`} value={editing?.[field] || ''} editable={!update.isPending} maxLength={field === 'description' ? 10000 : field === 'title' ? 200 : 100} multiline={field === 'description'} style={[styles.input, field === 'description' && styles.descriptionInput]} onChangeText={value => setEditing(current => ({ ...current, [field]: value }))} />
                </View>
              ))}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={update.isPending} style={[styles.button, styles.actionButton]} onPress={() => setEditing(null)}><Text style={styles.buttonText}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={update.isPending} style={[styles.button, styles.actionButton]} onPress={saveHomework}><Text style={styles.buttonText}>{update.isPending ? 'Saving...' : 'Save'}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  input: { color: colors.admin.textPrimary, backgroundColor: colors.admin.surface, borderColor: colors.admin.borderStrong, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  descriptionInput: { minHeight: 120, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1 },
  deleteButton: { backgroundColor: colors.state.error },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  editor: { backgroundColor: colors.admin.surface, borderRadius: 18, padding: 18, maxHeight: '90%' },
  heading: { color: colors.admin.textPrimary, fontSize: 22, fontWeight: '800' },
  meta: { color: colors.admin.textSecondary, fontSize: 12, marginTop: 6 },
  list: { paddingVertical: 14 },
  card: { backgroundColor: colors.admin.surface, borderColor: colors.admin.borderStrong, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  title: { color: colors.admin.textPrimary, fontSize: 17, fontWeight: '800' },
  description: { color: colors.admin.textPrimary, fontSize: 14, lineHeight: 21, marginVertical: 12 },
  button: { backgroundColor: colors.brand.primary, borderRadius: 10, padding: 11, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.text.inverse, fontWeight: '700', fontSize: 12 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10 },
  disabled: { opacity: 0.4 },
  error: { color: colors.state.error, marginVertical: 10 },
  status: { paddingVertical: 20 },
  statusText: { color: colors.admin.textSecondary, textAlign: 'center', padding: 24 },
});
