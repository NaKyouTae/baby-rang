'use client';

import { useCallback, useEffect, useState } from 'react';

export type ConsentKey = 'terms' | 'privacy' | 'marketing' | 'thirdParty';
export type OptionalConsentKey = 'marketing' | 'thirdParty';

export type ConsentState = { agreed: boolean; agreedAt: string | null };
export type MarketingConsentState = ConsentState & {
  expiresAt: string | null;
  expired: boolean;
};
export type ConsentsResponse = {
  terms: ConsentState;
  privacy: ConsentState;
  marketing: MarketingConsentState;
  thirdParty: ConsentState;
};

export function useConsents() {
  const [consents, setConsents] = useState<ConsentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<OptionalConsentKey | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/consents', { cache: 'no-store' });
      if (res.ok) setConsents((await res.json()) as ConsentsResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // optimistic 업데이트 — 실패 시 throw, 호출부에서 토스트/롤백 처리.
  const setConsent = useCallback(
    async (key: OptionalConsentKey, next: boolean) => {
      if (!consents || updating) return;
      setUpdating(key);
      const prev = consents;
      const nowIso = new Date().toISOString();
      if (key === 'marketing') {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 2);
        setConsents({
          ...consents,
          marketing: {
            agreed: next,
            agreedAt: next ? nowIso : null,
            expiresAt: next ? expires.toISOString() : null,
            expired: false,
          },
        });
      } else {
        setConsents({
          ...consents,
          [key]: { agreed: next, agreedAt: next ? nowIso : null },
        });
      }
      try {
        const res = await fetch('/api/auth/consents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: next }),
        });
        if (!res.ok) throw new Error('failed');
        const updated = (await res.json()) as ConsentsResponse;
        setConsents(updated);
      } catch (e) {
        setConsents(prev);
        throw e;
      } finally {
        setUpdating(null);
      }
    },
    [consents, updating],
  );

  return { consents, loading, updating, setConsent, refresh };
}

export function formatAgreedAt(iso: string | null): string {
  if (!iso) return '동의 안 함';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '동의 안 함';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}. ${m}. ${day}. 동의`;
}

export function formatExpiresAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}. ${m}. ${day}. 만료`;
}
