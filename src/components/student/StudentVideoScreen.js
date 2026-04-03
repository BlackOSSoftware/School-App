import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../common/AppIcon.js';
import InAppVideoPlayerModal from '../common/InAppVideoPlayerModal';
import { useStudentVideosQuery } from '../../hooks/useVideoQueries';
import { useAppTheme } from '../../theme/ThemeContext';

export default function StudentVideoScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [playerItem, setPlayerItem] = useState(null);
  const query = useStudentVideosQuery({ page: 1, limit: 50 });
  const rows = Array.isArray(query.data?.data) ? query.data.data : [];

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroOverline}>VIDEO ZONE</Text>
        <Text style={styles.heroTitle}>Class Videos</Text>
        <Text style={styles.heroSub}>Watch all uploaded videos without leaving the app.</Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setPlayerItem(item)}>
              <View style={styles.iconWrap}>
                <AppIcon name="play-circle-outline" size={20} color={colors.student.accent} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.meta}>{Math.max(1, Math.round((item.file?.size || 0) / (1024 * 1024)))} MB</Text>
                <View style={styles.actionRow}>
                  <Pressable style={styles.playBtn} onPress={() => setPlayerItem(item)}>
                    <AppIcon name="play-circle-outline" size={14} color={colors.text.inverse} />
                    <Text style={styles.playBtnText}>Play</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No videos available right now.</Text>}
        />
      )}

      <InAppVideoPlayerModal
        visible={Boolean(playerItem)}
        onClose={() => setPlayerItem(null)}
        videoItem={playerItem}
        variant="student"
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, marginTop: 10 },
  heroCard: { borderRadius: 20, backgroundColor: colors.student.heroBgAlt, padding: 14, marginBottom: 10 },
  heroOverline: { color: colors.auth.subtitle, fontSize: 10.5, letterSpacing: 1.3, fontWeight: '800' },
  heroTitle: { marginTop: 6, color: colors.text.inverse, fontSize: 22, fontWeight: '900' },
  heroSub: { marginTop: 5, color: colors.auth.subtitle, fontSize: 12.2, lineHeight: 17 },
  listContent: { paddingBottom: 12 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: colors.student.borderStrong, backgroundColor: colors.student.surface, padding: 12, marginBottom: 10, flexDirection: 'row', gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.student.borderSoft, backgroundColor: colors.student.surfaceStrong },
  body: { flex: 1 },
  title: { color: colors.student.textPrimary, fontSize: 14, fontWeight: '900' },
  desc: { marginTop: 4, color: colors.student.textSecondary, fontSize: 12.5, lineHeight: 17 },
  meta: { marginTop: 6, color: colors.student.accent, fontSize: 11.5, fontWeight: '800' },
  actionRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-start' },
  playBtn: { borderRadius: 8, backgroundColor: colors.student.accent, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  playBtnText: { color: colors.text.inverse, fontSize: 11.5, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: colors.student.textSecondary, marginTop: 18, fontSize: 12.5, fontWeight: '600' },
});
