'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/store';
import AuthScreen from '@/components/AuthScreen';

export default function SignupPage() {
  const { setAuthView } = useAppStore();

  useEffect(() => {
    setAuthView('signup');
  }, [setAuthView]);

  return <AuthScreen />;
}
