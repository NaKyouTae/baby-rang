'use client';

import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

export default function SettingsMarketingPage() {
  return (
    <div className="flex flex-col bg-white pb-[var(--bottom-nav-space)]">
      <PageHeader title="마케팅 정보 수신 동의" variant="back" />

      <article
        className="px-5 pt-6 pb-[41px] text-[14px] font-normal leading-relaxed space-y-6"
        style={{ color: palette.gray500 }}
      >
        <p
          className="text-[12px] font-normal"
          style={{ color: palette.gray500, textAlign: 'right' }}
        >
          시행일자: 2026년 4월 8일
        </p>

        <section>
          <p>
            회사는 서비스 이용과 관련된 이벤트, 혜택, 신규 기능 안내 등 마케팅 정보를 이메일, 푸시
            알림 등의 방법으로 제공할 수 있습니다.
          </p>
        </section>

        <section>
          <p>
            회원은 언제든지 설정 메뉴를 통해 마케팅 정보 수신 동의를 철회할 수 있으며, 동의를
            거부하더라도 서비스 이용에는 제한이 없습니다.
          </p>
        </section>
      </article>
    </div>
  );
}
