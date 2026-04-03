import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import LoginScreen from './src/screen/auth/LoginScreen';
import SplashScreen from './src/screen/splash/SplashScreen';
import AdminDashboard from './src/screen/dashboard/AdminDashboard';
import TeacherDashboard from './src/screen/dashboard/TeacherDashboard';
import StudentDashboard from './src/screen/dashboard/StudentDashboard';
import { displayRemoteNotification } from './src/services/notificationService';
import { ThemeProvider } from './src/theme/ThemeContext';
import { setAuthToken, setUnauthorizedHandler } from './src/api/client';
import { getDeviceFcmToken, requestNotificationPermissionPrompt } from './src/services/fcmService';
import { updateMyFcmToken } from './src/services/authService';
import {
  clearLocalSession,
  readLocalSession,
  saveLocalSession,
} from './src/services/localSessionService';
import { useAppTheme } from './src/theme/ThemeContext';

const SESSION_RESTORE_TIMEOUT_MS = 2200;
const STARTUP_GUARD_TIMEOUT_MS = 7000;

function normalizeRole(role: string | undefined | null) {
  return String(role ?? '').toLowerCase();
}

function getMessagingSafe() {
  try {
    return messaging();
  } catch {
    return null;
  }
}

function AppStatusBar() {
  const { colors, isDark } = useAppTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      translucent={false}
      backgroundColor={Platform.OS === 'android' ? colors.background.app : undefined}
    />
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [restoringSession, setRestoringSession] = useState(true);
  const [session, setSession] = useState<null | {
    token: string;
    role: string;
    user?: Record<string, unknown> | null;
  }>(null);
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
    [],
  );

  const role = normalizeRole(session?.role);

  useEffect(() => {
    let alive = true;
    let restoreTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>(resolve => {
      restoreTimeoutId = setTimeout(() => resolve(null), SESSION_RESTORE_TIMEOUT_MS);
    });

    Promise.race([readLocalSession(), timeout])
      .then(savedSession => {
        if (!alive || !savedSession?.token) {
          return;
        }
        setAuthToken(savedSession.token);
        setSession(savedSession);
      })
      .finally(() => {
        if (alive) {
          setRestoringSession(false);
        }
      });
    return () => {
      alive = false;
      if (restoreTimeoutId) {
        clearTimeout(restoreTimeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const startupGuardTimer = setTimeout(() => {
      setRestoringSession(false);
      setShowSplash(false);
    }, STARTUP_GUARD_TIMEOUT_MS);

    return () => clearTimeout(startupGuardTimer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      requestNotificationPermissionPrompt().catch(() => {});
    }, 1800);

    const messagingInstance = getMessagingSafe();
    if (!messagingInstance) {
      return () => {
        clearTimeout(timer);
      };
    }

    const unsubscribeForeground = messagingInstance.onMessage(async remoteMessage => {
      const payload = await displayRemoteNotification(remoteMessage);
      setNotificationModal({
        visible: true,
        title: payload?.title || 'MMPS',
        message: payload?.body || 'New notification received',
      });
    });

    const unsubscribeOpen = messagingInstance.onNotificationOpenedApp(() => {});

    messagingInstance
      .getInitialNotification()
      .catch(() => {});

    return () => {
      clearTimeout(timer);
      unsubscribeForeground();
      unsubscribeOpen();
    };
  }, []);

  useEffect(() => {
    if (!session?.token || showSplash || restoringSession) {
      return;
    }
    getDeviceFcmToken()
      .then(token => {
        if (token) {
          return updateMyFcmToken(token);
        }
        return null;
      })
      .catch(() => {});
  }, [restoringSession, session?.token, showSplash]);

  const logout = useCallback(() => {
    setAuthToken('');
    queryClient.clear();
    setSession(null);
    clearLocalSession();
  }, [queryClient]);

  const handleLoginSuccess = useCallback(
    (nextSession: { token: string; role: string; user?: Record<string, unknown> | null }) => {
      setSession(nextSession);
      saveLocalSession(nextSession);
    },
    [],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const renderDashboard = () => {
    if (role === 'admin') {
      return <AdminDashboard session={session} onLogout={logout} />;
    }

    if (role === 'teacher') {
      return <TeacherDashboard session={session} onLogout={logout} />;
    }

    return <StudentDashboard session={session} onLogout={logout} />;
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStatusBar />
        <QueryClientProvider client={queryClient}>
          {showSplash || restoringSession ? (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          ) : session ? (
            renderDashboard()
          ) : (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          )}
          <Modal visible={notificationModal.visible} transparent animationType="fade">
            <View style={styles.notificationOverlay}>
              <View style={styles.notificationCard}>
                <Text style={styles.notificationTitle}>{notificationModal.title}</Text>
                <Text style={styles.notificationText}>{notificationModal.message}</Text>
                <Pressable
                  style={styles.notificationButton}
                  onPress={() => setNotificationModal({ visible: false, title: '', message: '' })}
                >
                  <Text style={styles.notificationButtonText}>OK</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 34, 53, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  notificationCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7e3fb',
    padding: 16,
  },
  notificationTitle: {
    color: '#193f60',
    fontSize: 18,
    fontWeight: '800',
  },
  notificationText: {
    marginTop: 8,
    color: '#5e7f9c',
    fontSize: 14,
    lineHeight: 20,
  },
  notificationButton: {
    marginTop: 14,
    alignSelf: 'flex-end',
    backgroundColor: '#2f80ed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  notificationButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
