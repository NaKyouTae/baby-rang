'use client';

import { useLoginPrompt } from './LoginPromptProvider';

type Props = {
  emoji: string;
  title: string;
  description: React.ReactNode;
  className?: string;
};

export default function EmptyChildState({
  emoji,
  title,
  description,
  className = '',
}: Props) {
  const { requireLogin } = useLoginPrompt();
  return (
    <main
      className={`flex flex-col items-center justify-center text-center min-h-[100dvh] pb-16 px-6 bg-white ${className}`}
    >
      <span className="text-7xl mb-4">{emoji}</span>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">
        {description}
      </p>
      <button
        type="button"
        onClick={() => {
          if (requireLogin('우리 아기를 등록하려면\n로그인이 필요해요.')) {
            window.location.href = '/settings/children';
          }
        }}
        className="bg-gray-900 text-white font-semibold py-3 px-8 rounded-xl active:opacity-80"
      >
        우리아기 등록하러 가기
      </button>
    </main>
  );
}
