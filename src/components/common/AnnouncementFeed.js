import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import PaginationControls from './PaginationControls';
import { useAppTheme } from '../../theme/ThemeContext';

function formatClassLabel(item) {
  if (!item) {
    return '';
  }
  const name = String(item?.name ?? '').trim();
  const section = String(item?.section ?? '').trim();
  if (!name && !section) {
    return '';
  }
  return section ? `${name}-${section}` : name;
}

function formatTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recent';
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getPalette(colors, variant) {
  if (variant === 'teacher') {
    return {
      accent: colors.teacher.accent,
      textPrimary: colors.teacher.textPrimary,
      textSecondary: colors.teacher.textSecondary,
      surface: colors.teacher.surface,
      surfaceStrong: colors.teacher.surfaceStrong,
      border: colors.teacher.borderStrong,
      borderSoft: colors.teacher.borderSubtle,
      schoolPill: colors.teacher.navBg,
      classPill: colors.brand.primary,
    };
  }

  if (variant === 'student') {
    return {
      accent: colors.role.studentAccent,
      textPrimary: colors.admin.textPrimary,
      textSecondary: colors.admin.textSecondary,
      surface: colors.admin.surface,
      surfaceStrong: colors.admin.surfaceStrong,
      border: colors.admin.borderStrong,
      borderSoft: colors.admin.borderSubtle,
      schoolPill: colors.admin.navBg,
      classPill: colors.brand.primary,
    };
  }

  return {
    accent: colors.admin.accent,
    textPrimary: colors.admin.textPrimary,
    textSecondary: colors.admin.textSecondary,
    surface: colors.admin.surface,
    surfaceStrong: colors.admin.surfaceStrong,
    border: colors.admin.borderStrong,
    borderSoft: colors.admin.borderSubtle,
    schoolPill: colors.admin.navBg,
    classPill: colors.brand.primary,
  };
}

function AnnouncementItem({ item, styles }) {
  const classNames = Array.isArray(item?.classIds)
    ? item.classIds.map(formatClassLabel).filter(Boolean)
    : [];
  const isSchoolWide = String(item?.announcementType ?? '').toLowerCase() === 'school_wide';
  const classSummary = isSchoolWide
    ? 'All'
    : classNames.length > 1
      ? `${classNames[0]} +${classNames.length - 1}`
      : classNames[0] || 'Class';

  return (
    <View style={styles.card}>
      <View style={styles.leftIconWrap}>
        <Ionicons name="notifications-outline" size={15} style={styles.leftIcon} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item?.title || '-'}
          </Text>
          <View style={[styles.classPill, isSchoolWide ? styles.schoolPill : styles.classWisePill]}>
            <Text style={styles.classPillText}>{classSummary}</Text>
          </View>
        </View>

        <Text style={styles.descText} numberOfLines={1}>
          {item?.description || '-'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {item?.createdByName || item?.createdByRole || 'System'}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{formatTimeLabel(item?.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AnnouncementFeed({
  query,
  page,
  onPageChange,
  variant = 'admin',
  emptyText = 'No announcements found.',
}) {
  const { colors } = useAppTheme();
  const palette = useMemo(() => getPalette(colors, variant), [colors, variant]);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const list = useMemo(
    () => (Array.isArray(query?.data?.data) ? query.data.data : []),
    [query?.data?.data],
  );
  const totalPages = Number(query?.data?.totalPages ?? 1);

  if (query?.isLoading && !list.length) {
    return <ActivityIndicator size="small" color={palette.accent} />;
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item, index) => String(item?._id ?? `announcement-${index}`)}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={8}
      updateCellsBatchingPeriod={35}
      renderItem={({ item }) => <AnnouncementItem item={item} styles={styles} />}
      ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
      ListFooterComponent={
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => onPageChange(Math.max(1, page - 1))}
          onNext={() => onPageChange(Math.min(totalPages, page + 1))}
          disablePrev={page <= 1}
          disableNext={page >= totalPages}
        />
      }
    />
  );
}

const createStyles = palette =>
  StyleSheet.create({
    content: {
      paddingBottom: 18,
      paddingTop: 2,
    },
    card: {
      borderRadius: 13,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      marginBottom: 7,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    leftIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceStrong,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    leftIcon: {
      color: palette.accent,
    },
    cardBody: {
      flex: 1,
      minHeight: 48,
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    titleText: {
      flex: 1,
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    classPill: {
      borderRadius: 11,
      paddingHorizontal: 7,
      paddingVertical: 2,
      minWidth: 36,
      alignItems: 'center',
    },
    schoolPill: {
      backgroundColor: palette.schoolPill,
    },
    classWisePill: {
      backgroundColor: palette.classPill,
    },
    classPillText: {
      color: '#ffffff',
      fontSize: 9.5,
      fontWeight: '800',
    },
    descText: {
      marginTop: 3,
      color: palette.textSecondary,
      fontSize: 11.5,
      lineHeight: 15,
    },
    metaRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaText: {
      color: palette.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
      flexShrink: 1,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: palette.textSecondary,
    },
    emptyText: {
      textAlign: 'center',
      color: palette.textSecondary,
      marginTop: 18,
      fontSize: 12,
      fontWeight: '600',
    },
  });
