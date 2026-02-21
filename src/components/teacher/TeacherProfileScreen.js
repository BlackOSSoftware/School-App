import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppTheme } from '../../theme/ThemeContext';
import ConfirmModal from '../common/ConfirmModal';

export default function TeacherProfileScreen({ session, onLogout }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [message, setMessage] = useState('');

  const name = session?.user?.name || 'Teacher';
  const role = String(session?.role || 'teacher').toUpperCase();

  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = setTimeout(() => setMessage(''), 2400);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroName}>{name}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{role}</Text>
          </View>
          <Text style={styles.heroSub}>Keep your teaching account secure and ready.</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={15} style={styles.infoIcon} />
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{session?.user?.email || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={15} style={styles.infoIcon} />
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>Active</Text>
        </View>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Session Action</Text>
        <Pressable
          style={styles.logoutRow}
          onPress={() => {
            setMessage('Please confirm logout.');
            setLogoutVisible(true);
          }}
        >
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={16} color={colors.state.error} />
          </View>
          <View style={styles.logoutBody}>
            <Text style={styles.logoutTitle}>Logout</Text>
            <Text style={styles.logoutSub}>Sign out and return to login</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.state.error} />
        </Pressable>
      </View>

      {message ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{message}</Text>
        </View>
      ) : null}

      <ConfirmModal
        visible={logoutVisible}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        danger
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          onLogout?.();
        }}
      />
    </ScrollView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 26,
    },
    heroCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.teacher.navBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.text.inverse,
      fontSize: 23,
      fontWeight: '900',
    },
    heroBody: {
      flex: 1,
    },
    heroName: {
      color: colors.teacher.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    rolePill: {
      marginTop: 4,
      alignSelf: 'flex-start',
      borderRadius: 14,
      backgroundColor: colors.teacher.surfaceStrong,
      borderWidth: 1,
      borderColor: colors.teacher.borderSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    rolePillText: {
      color: colors.teacher.textPrimary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    heroSub: {
      marginTop: 6,
      color: colors.teacher.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    infoCard: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    infoRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.teacher.borderSubtle,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    infoIcon: {
      color: colors.teacher.accent,
    },
    infoLabel: {
      color: colors.teacher.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      minWidth: 56,
    },
    infoValue: {
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '700',
      flex: 1,
      textAlign: 'right',
    },
    actionCard: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.teacher.borderStrong,
      backgroundColor: colors.teacher.surface,
      padding: 12,
    },
    actionTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 8,
    },
    logoutRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.teacher.dangerBorder,
      backgroundColor: colors.teacher.dangerBg,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    logoutIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teacher.surface,
    },
    logoutBody: {
      flex: 1,
    },
    logoutTitle: {
      color: colors.teacher.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
    },
    logoutSub: {
      marginTop: 2,
      color: colors.teacher.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    banner: {
      marginTop: 10,
      borderRadius: 10,
      backgroundColor: colors.teacher.successBg,
      borderWidth: 1,
      borderColor: colors.teacher.successBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    bannerText: {
      color: colors.teacher.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
