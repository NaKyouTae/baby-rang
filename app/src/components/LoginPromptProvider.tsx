'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { palette } from '@/lib/colors';

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" style={{ padding: '0 24px' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-[8px] bg-white p-4 shadow-xl" style={{ maxWidth: 'calc(430px - 48px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-center rounded-[30px] bg-gray-100" style={{ width: 60, height: 60 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25.6667 16C25.6667 13.4363 24.6479 10.9778 22.8351 9.16494C21.0222 7.35209 18.5638 6.33334 16 6.33334C15.4477 6.33334 15 5.88563 15 5.33334C15 4.78106 15.4477 4.33334 16 4.33334C19.0942 4.33334 22.0621 5.56209 24.25 7.75001C26.4379 9.93793 27.6667 12.9058 27.6667 16C27.6667 19.0942 26.4379 22.0621 24.25 24.25C22.0621 26.4379 19.0942 27.6667 16 27.6667C15.4477 27.6667 15 27.219 15 26.6667C15 26.1144 15.4477 25.6667 16 25.6667C18.5638 25.6667 21.0222 24.6479 22.8351 22.8351C24.6479 21.0222 25.6667 18.5638 25.6667 16Z" fill="black" />
                  <path d="M13.9591 11.2926C14.3496 10.902 14.9835 10.902 15.3741 11.2926L19.3741 15.2926C19.7646 15.6831 19.7646 16.317 19.3741 16.7075L15.3741 20.7075C14.9835 21.098 14.3496 21.098 13.9591 20.7075C13.5686 20.317 13.5686 19.6831 13.9591 19.2926L16.2517 17H5.33325C4.78097 17 4.33325 16.5523 4.33325 16C4.33325 15.4477 4.78097 15 5.33325 15H16.2517L13.9591 12.7075C13.5686 12.317 13.5686 11.6831 13.9591 11.2926Z" fill="black" />
                </svg>
              </div>
            </div>
            <h3 className="text-center font-medium text-black" style={{ fontSize: 16 }}>
              육아 동반자 아기랑과 함께해요 !
            </h3>
            <p className="text-center font-medium leading-relaxed" style={{ fontSize: 12, color: palette.gray500, marginTop: 8 }}>
              {message ?? '로그인하고 편리한 맞춤 육아를 시작해 보세요.'}
            </p>
            <div className="flex flex-col" style={{ marginTop: 16, gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.location.href = `${API_URL}/auth/kakao`;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[4px] py-3 text-sm font-semibold active:opacity-80"
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919" aria-hidden="true">
                  <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.3 4.8 6.7-.2.7-.7 2.7-.8 3.1-.1.5.2.5.4.4.2-.1 2.7-1.8 3.7-2.5.6.1 1.2.1 1.9.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-[4px] bg-gray-200 py-3 font-semibold active:bg-gray-300"
                style={{ fontSize: 12, color: palette.gray500 }}
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
