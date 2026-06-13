'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/store';
import AuthScreen from '@/components/AuthScreen';

export default function LoginPage() {
  const setAuthView = useAppStore((state) => state.setAuthView);

  useEffect(() => {
    setAuthView('login');
  }, [setAuthView]);

  return <AuthScreen />;
}
