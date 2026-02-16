import React, { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screen/auth/LoginScreen';
import SplashScreen from './src/screen/splash/SplashScreen';
import AdminDashboard from './src/screen/dashboard/AdminDashboard';
import TeacherDashboard from './src/screen/dashboard/TeacherDashboard';
import StudentDashboard from './src/screen/dashboard/StudentDashboard';
import { ThemeProvider } from './src/theme/ThemeContext';

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
  const queryClient = useMemo(() => new QueryClient(), []);

  const role = normalizeRole(session?.role);

  const renderDashboard = () => {
    if (role === 'admin') {
      return <AdminDashboard session={session} />;
    }

    if (role === 'teacher') {
      return <TeacherDashboard session={session} />;
    }

    return <StudentDashboard session={session} />;
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
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
