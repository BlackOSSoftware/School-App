import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

function normalizeRole(role: string | undefined | null) {
  return String(role ?? '').toLowerCase();
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
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
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      const payload = await displayRemoteNotification(remoteMessage);
      setNotificationModal({
        visible: true,
        title: payload?.title || 'School App',
        message: payload?.body || 'New notification received',
      });
    });

    const unsubscribeOpen = messaging().onNotificationOpenedApp(() => {});

    messaging()
      .getInitialNotification()
      .catch(() => {});

    return () => {
      unsubscribeForeground();
      unsubscribeOpen();
    };
  }, []);

  const logout = useCallback(() => {
    setAuthToken('');
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

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
        <QueryClientProvider client={queryClient}>
          {showSplash ? (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          ) : session ? (
            renderDashboard()
          ) : (
            <LoginScreen onLoginSuccess={setSession} />
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
