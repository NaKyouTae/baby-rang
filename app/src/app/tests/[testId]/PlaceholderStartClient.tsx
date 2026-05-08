'use client';

import TestStartShell from './TestStartShell';
import type { TestInfo } from './types';

export default function PlaceholderStartClient({ test }: { test: TestInfo }) {
  return (
    <TestStartShell
      test={test}
      bottomSlot={
        <button
          disabled
          className="w-full max-w-xs py-4 bg-gray-200 text-gray-500 font-bold rounded-2xl cursor-not-allowed"
        >
          준비 중인 테스트입니다
        </button>
      }
    />
  );
}
