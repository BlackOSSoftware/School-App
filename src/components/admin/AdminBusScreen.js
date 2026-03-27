import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useBusesQuery,
  useBusDetailQuery,
  useCreateBusMutation,
  useDeleteBusMutation,
  useUpdateBusMutation,
} from '../../hooks/useBusQueries';
import { useAppTheme } from '../../theme/ThemeContext';
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

function formatPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '-';
  }
  return raw;
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

function buildInitialForm(bus) {
  return {
    busNumber: String(bus?.busNumber ?? ''),
    routeName: String(bus?.routeName ?? ''),
    driverName: String(bus?.driverName ?? ''),
    driverPhone: String(bus?.driverPhone ?? ''),
    helperName: String(bus?.helperName ?? ''),
    helperPhone: String(bus?.helperPhone ?? ''),
    trackingUsername: String(bus?.trackingUsername ?? ''),
    trackingPassword: String(bus?.trackingPassword ?? ''),
    capacity: bus?.capacity !== undefined && bus?.capacity !== null ? String(bus.capacity) : '',
    status: String(bus?.status ?? 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
  };
}

function BusFormModal({
  visible,
  onClose,
  onSave,
  styles,
  colors,
  isSaving,
  mode,
  form,
  setForm,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.formModalOverlay}>
        <ScrollView contentContainerStyle={styles.formModalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>{mode === 'create' ? 'Create Bus' : 'Edit Bus'}</Text>
              <Pressable style={styles.headerCloseBtn} onPress={onClose}>
                <Text style={styles.headerCloseText}>x</Text>
              </Pressable>
            </View>
            <Text style={styles.formHint}>
              Keep transport details accurate for tracking credentials and driver contacts.
            </Text>

            <Text style={styles.inputLabel}>Bus Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="bus-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.busNumber}
                onChangeText={value => setForm(prev => ({ ...prev, busNumber: value }))}
                placeholder="e.g. MP09 AB 1234"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Route Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="navigate-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.routeName}
                onChangeText={value => setForm(prev => ({ ...prev, routeName: value }))}
                placeholder="City Center - Campus"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Driver Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.driverName}
                onChangeText={value => setForm(prev => ({ ...prev, driverName: value }))}
                placeholder="Driver full name"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Driver Phone</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.driverPhone}
                onChangeText={value => setForm(prev => ({ ...prev, driverPhone: value }))}
                keyboardType="phone-pad"
                placeholder="9876500005"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Helper Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="people-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.helperName}
                onChangeText={value => setForm(prev => ({ ...prev, helperName: value }))}
                placeholder="Helper name (optional)"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Helper Phone</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.helperPhone}
                onChangeText={value => setForm(prev => ({ ...prev, helperPhone: value }))}
                keyboardType="phone-pad"
                placeholder="Optional"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Tracking Username</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-circle-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.trackingUsername}
                onChangeText={value => setForm(prev => ({ ...prev, trackingUsername: value }))}
                placeholder="Tracking portal username"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.inputLabel}>Tracking Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.trackingPassword}
                onChangeText={value => setForm(prev => ({ ...prev, trackingPassword: value }))}
                secureTextEntry
                placeholder={mode === 'edit' ? 'Leave blank to keep existing' : 'Tracking password'}
                placeholderTextColor={colors.text.muted}
              />
            </View>
            {mode === 'edit' ? (
              <Text style={styles.inputNote}>Leave tracking password blank to keep existing credentials.</Text>
            ) : null}

            <Text style={styles.inputLabel}>Capacity</Text>
            <View style={styles.inputRow}>
              <Ionicons name="people-outline" size={17} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={form.capacity}
                onChangeText={value => setForm(prev => ({ ...prev, capacity: value }))}
                keyboardType="number-pad"
                placeholder="Number of seats"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.segmentWrap}>
              <Pressable
                style={[styles.segmentBtn, form.status === 'active' ? styles.segmentBtnActive : null]}
                onPress={() => setForm(prev => ({ ...prev, status: 'active' }))}
              >
                <Text style={[styles.segmentText, form.status === 'active' ? styles.segmentTextActive : null]}>
                  Active
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, form.status === 'inactive' ? styles.segmentBtnActive : null]}
                onPress={() => setForm(prev => ({ ...prev, status: 'inactive' }))}
              >
                <Text style={[styles.segmentText, form.status === 'inactive' ? styles.segmentTextActive : null]}>
                  Inactive
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={onSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.saveBtnText}>{mode === 'create' ? 'Create Bus' : 'Save'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
function BusDetailModal({ visible, onClose, detail, loading, styles, colors }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.detailCard}>
          <Text style={styles.formTitle}>Bus Details</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : detail ? (
            <ScrollView style={styles.detailScroll}>
              <View style={styles.detailLineRow}>
                <Ionicons name="bus-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Bus Number: {detail.busNumber ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="navigate-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Route: {detail.routeName ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="person-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Driver: {detail.driverName ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="call-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Driver Phone: {formatPhone(detail.driverPhone)}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="people-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Helper: {detail.helperName ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="call-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Helper Phone: {formatPhone(detail.helperPhone)}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="person-circle-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Tracking Username: {detail.trackingUsername ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="lock-closed-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Tracking Password: {detail.trackingPassword ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="people-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Capacity: {detail.capacity ?? '-'}</Text>
              </View>
              <View style={styles.detailLineRow}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.admin.accent} />
                <Text style={styles.detailLine}>Status: {detail.status ?? '-'}</Text>
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

function BusListCard({ item, styles, colors, onOpenDetail, onEdit, onDelete, deletingId }) {
  const busId = getEntityId(item);
  const status = String(item?.status ?? 'active').toLowerCase();
  const inactive = status === 'inactive';

  return (
    <Pressable style={styles.busCard} onPress={() => onOpenDetail(busId)}>
      <View style={styles.busCardHeader}>
        <View>
          <Text style={styles.busNumber}>{item.busNumber || 'Bus'}</Text>
          <Text style={styles.busRoute}>{item.routeName || 'Route not set'}</Text>
        </View>
        <View style={[styles.statusPill, inactive ? styles.statusPillInactive : styles.statusPillActive]}>
          <Text style={styles.statusPillText}>{inactive ? 'Inactive' : 'Active'}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Ionicons name="person-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Driver: {item.driverName || '-'}</Text>
        </View>
        <View style={styles.metaBox}>
          <Ionicons name="call-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Phone: {formatPhone(item.driverPhone)}</Text>
        </View>
        <View style={styles.metaBox}>
          <Ionicons name="person-circle-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>User: {item.trackingUsername || '-'}</Text>
        </View>
        <View style={styles.metaBox}>
          <Ionicons name="people-outline" size={14} color={colors.admin.accent} />
          <Text style={styles.metaBoxText}>Capacity: {item.capacity ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={14} color={colors.admin.textPrimary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(busId)} disabled={!busId || deletingId === busId}>
          {deletingId === busId ? (
            <ActivityIndicator size="small" color={colors.state.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={14} color={colors.state.error} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AdminBusScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modalState, setModalState] = useState({ visible: false, mode: 'create', busId: '' });
  const [form, setForm] = useState(buildInitialForm());
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const busesQuery = useBusesQuery({ page, limit: PAGE_LIMIT, search: debouncedSearch });
  const createMutation = useCreateBusMutation();
  const updateMutation = useUpdateBusMutation();
  const deleteMutation = useDeleteBusMutation();
  const detailQuery = useBusDetailQuery(selectedBusId, detailVisible);

  const listResponse = busesQuery.data ?? {};
  const busList = Array.isArray(listResponse.data)
    ? listResponse.data
    : Array.isArray(listResponse?.data?.data)
      ? listResponse.data.data
      : [];
  const totalPages = Number(listResponse.totalPages ?? listResponse?.data?.totalPages ?? 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

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
    setModalState({ visible: true, mode: 'create', busId: '' });
  };

  const openEditModal = bus => {
    const busId = getEntityId(bus);
    if (!busId) {
      setMessage({ type: 'error', text: 'Invalid bus record selected.' });
      return;
    }
    setForm(buildInitialForm(bus));
    setModalState({ visible: true, mode: 'edit', busId });
  };

  const closeModal = () => setModalState({ visible: false, mode: 'create', busId: '' });

  const handleSave = async () => {
    if (!form.busNumber.trim()) {
      setMessage({ type: 'error', text: 'Bus number is required.' });
      return;
    }
    if (!form.routeName.trim()) {
      setMessage({ type: 'error', text: 'Route name is required.' });
      return;
    }
    if (!form.driverName.trim()) {
      setMessage({ type: 'error', text: 'Driver name is required.' });
      return;
    }
    if (!form.driverPhone.trim()) {
      setMessage({ type: 'error', text: 'Driver phone is required.' });
      return;
    }

    try {
      const payload = {
        busNumber: form.busNumber,
        routeName: form.routeName,
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        helperName: form.helperName,
        helperPhone: form.helperPhone,
        trackingUsername: form.trackingUsername,
        trackingPassword: form.trackingPassword || undefined,
        capacity: form.capacity,
        status: form.status,
      };

      if (modalState.mode === 'create') {
        await createMutation.mutateAsync(payload);
        setMessage({ type: 'success', text: 'Bus created successfully.' });
      } else {
        await updateMutation.mutateAsync({ id: modalState.busId, payload });
        setMessage({ type: 'success', text: 'Bus updated successfully.' });
      }
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to save bus.') });
    }
  };

  const handleDelete = async id => {
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid bus id for delete.' });
      return;
    }
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      setMessage({ type: 'success', text: 'Bus deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to delete bus.') });
    } finally {
      setDeletingId('');
    }
  };

  const openDetail = id => {
    if (!id) {
      setMessage({ type: 'error', text: 'Invalid bus id for details.' });
      return;
    }
    setSelectedBusId(id);
    setDetailVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>TRANSPORT MANAGEMENT</Text>
        <Text style={styles.heroTitle}>Manage Buses</Text>
        <Text style={styles.heroSub}>
          Create, track and update bus routes, drivers and tracking credentials.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search-outline" size={17} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by bus number, route or driver"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={openCreateModal}>
          <View style={styles.inlineAction}>
            <Ionicons name="add" size={14} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Add</Text>
          </View>
        </Pressable>
      </View>

      <MessageBanner text={message.text} type={message.type} onClose={closeMessage} styles={styles} />

      <FlatList
        data={busList}
        keyExtractor={(item, index) => getEntityId(item) || `bus-${index}`}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={40}
        renderItem={({ item }) => (
          <BusListCard
            item={item}
            styles={styles}
            colors={colors}
            onOpenDetail={openDetail}
            onEdit={openEditModal}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}
        ListEmptyComponent={
          busesQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Text style={styles.placeholderText}>No buses found.</Text>
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

      <BusFormModal
        visible={modalState.visible}
        onClose={closeModal}
        onSave={handleSave}
        styles={styles}
        colors={colors}
        isSaving={createMutation.isPending || updateMutation.isPending}
        mode={modalState.mode}
        form={form}
        setForm={setForm}
      />

      <BusDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        detail={detailQuery.data?.data}
        loading={detailQuery.isLoading}
        styles={styles}
        colors={colors}
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
    busCard: {
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
    busCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
      gap: 8,
    },
    busNumber: {
      color: colors.admin.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    busRoute: {
      marginTop: 2,
      color: colors.admin.textSecondary,
      fontSize: 12.5,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
    },
    statusPillActive: {
      backgroundColor: colors.admin.successBg,
      borderColor: colors.admin.successBorder,
    },
    statusPillInactive: {
      backgroundColor: colors.admin.dangerBg,
      borderColor: colors.admin.dangerBorder,
    },
    statusPillText: {
      color: colors.admin.textPrimary,
      fontSize: 11,
      fontWeight: '800',
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    metaBox: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      backgroundColor: colors.admin.surfaceStrong,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: '47%',
    },
    metaBoxText: {
      color: colors.admin.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
      flexDirection: 'row',
      gap: 4,
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
    segmentWrap: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    segmentBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.admin.borderSoft,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: colors.admin.surfaceStrong,
    },
    segmentBtnActive: {
      backgroundColor: colors.admin.navBg,
      borderColor: colors.admin.borderStrong,
    },
    segmentText: {
      color: colors.admin.textPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    segmentTextActive: {
      color: colors.text.inverse,
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
  });
