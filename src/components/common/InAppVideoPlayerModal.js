import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import AppIcon from './AppIcon.js';
import { useAppTheme } from '../../theme/ThemeContext';

function paletteByVariant(colors, variant) {
  if (variant === 'teacher') return colors.teacher;
  if (variant === 'student') return colors.student;
  return colors.admin;
}

export default function InAppVideoPlayerModal({
  visible,
  onClose,
  videoItem,
  variant = 'student',
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);
  const [isLoading, setIsLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const sourceUrl = String(videoItem?.file?.openUrl || videoItem?.file?.url || '')
    .trim()
    .replace(/\s/g, '%20');
  const canPlay = Boolean(sourceUrl);
  const webPlayerHtml = useMemo(() => {
    if (!canPlay) return '';
    const escapedUrl = sourceUrl.replace(/"/g, '&quot;');
    return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #02070e;
        overflow: hidden;
      }
      video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #02070e;
      }
    </style>
  </head>
  <body>
    <video controls autoplay playsinline preload="auto" src="${escapedUrl}"></video>
  </body>
</html>`;
  }, [canPlay, sourceUrl]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AppIcon name="play-circle-outline" size={17} color={styles.title.color} />
              <Text numberOfLines={1} style={styles.title}>{videoItem?.title || 'Video Player'}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <AppIcon name="close" size={15} color={styles.title.color} />
            </Pressable>
          </View>

          <View style={styles.playerShell}>
            {canPlay ? (
              <View style={styles.previewWrap}>
                <WebView
                  style={styles.player}
                  source={{ html: webPlayerHtml, baseUrl: sourceUrl }}
                  originWhitelist={['*']}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  allowsFullscreenVideo
                  javaScriptEnabled
                  domStorageEnabled
                  onLoadStart={() => {
                    setVideoError('');
                    setIsLoading(true);
                  }}
                  onLoadEnd={() => setIsLoading(false)}
                  onError={(event) => {
                    setIsLoading(false);
                    setVideoError(
                      event?.nativeEvent?.description || 'Unable to play this video in app.'
                    );
                  }}
                />
                {isLoading ? (
                  <View style={styles.overlayStatus}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.overlayStatusText}>Loading video...</Text>
                  </View>
                ) : null}
                {videoError ? (
                  <View style={styles.overlayStatus}>
                    <Text style={styles.overlayStatusText}>{videoError}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyPlayer}>
                <Text style={styles.emptyText}>Video source unavailable.</Text>
              </View>
            )}
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {videoItem?.description || 'No description available.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors, variant) => {
  const palette = paletteByVariant(colors, variant);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(8, 15, 28, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 14,
    },
    card: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
      padding: 12,
      shadowColor: '#081c2f',
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    title: {
      color: palette.textPrimary,
      fontSize: 14,
      fontWeight: '900',
      flex: 1,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.surfaceStrong,
    },
    playerShell: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#02070e',
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    previewWrap: {
      flex: 1,
      overflow: 'hidden',
    },
    player: {
      width: '100%',
      height: '100%',
      backgroundColor: '#02070e',
    },
    overlayStatus: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(2, 7, 14, 0.58)',
      paddingHorizontal: 16,
      gap: 8,
    },
    overlayStatusText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyPlayer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: '#d7e7ff',
      fontSize: 12,
      fontWeight: '700',
    },
    description: {
      marginTop: 10,
      color: palette.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '600',
    },
  });
};
