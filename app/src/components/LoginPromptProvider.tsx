'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

type LoginPromptContextValue = {
  /** Returns true if already logged in. Otherwise opens the login prompt and returns false. */
  requireLogin: (message?: string) => boolean;
  openLoginPrompt: (message?: string) => void;
};

const LoginPromptContext = createContext<LoginPromptContextValue | null>(null);

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) throw new Error('useLoginPrompt must be used within LoginPromptProvider');
  return ctx;
}

export default function LoginPromptProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const openLoginPrompt = useCallback((msg?: string) => {
    setMessage(msg);
    setOpen(true);
  }, []);

  const requireLogin = useCallback(
    (msg?: string) => {
      if (isAuthenticated) return true;
      openLoginPrompt(msg);
      return false;
    },
    [isAuthenticated, openLoginPrompt],
  );

  return (
    <LoginPromptContext.Provider value={{ requireLogin, openLoginPrompt }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <h3 className="text-center text-base font-bold text-gray-900">
              로그인이 필요해요
            </h3>
            <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">
              {message ?? '이 기능을 사용하려면\n로그인이 필요해요.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.location.href = `${API_URL}/auth/kakao`;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold active:opacity-80"
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919" aria-hidden="true">
                  <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.3 4.8 6.7-.2.7-.7 2.7-.8 3.1-.1.5.2.5.4.4.2-.1 2.7-1.8 3.7-2.5.6.1 1.2.1 1.9.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" />
                </svg>
                카카오로 로그인
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 active:bg-gray-200"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}
    </LoginPromptContext.Provider>
  );
}
