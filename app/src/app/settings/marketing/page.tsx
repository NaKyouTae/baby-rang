'use client';

import PageHeader from '@/components/PageHeader';
import ConsentToggleBar from '@/components/ConsentToggleBar';
import { useAuth } from '@/hooks/useAuth';
import { palette } from '@/lib/colors';

export default function SettingsMarketingPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex flex-col bg-white" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 96px)' }}>
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
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>1. 수집·이용 목적</h2>
          <p>
            회사는 서비스 이용과 관련된 이벤트, 혜택, 신규 기능 안내 등 마케팅 정보를 이메일, 푸시
            알림 등의 방법으로 제공할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>2. 동의의 유효기간</h2>
          <p>
            마케팅 정보 수신 동의의 유효기간은 동의일로부터 <strong>2년</strong>이며, 유효기간이
            만료되면 동의 효력이 자동으로 종료되어 마케팅 정보 발송이 중단됩니다. 만료 이후 계속
            수신을 원하시는 경우 마이페이지의 동의 관리 또는 본 페이지에서 다시 동의해 주시기
            바랍니다. (개인정보 보호법 시행령 제48조의2)
          </p>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>3. 동의 철회</h2>
          <p>
            회원은 언제든지 설정 메뉴를 통해 마케팅 정보 수신 동의를 철회할 수 있으며, 동의를
            거부하거나 철회하시더라도 서비스 이용에는 제한이 없습니다.
          </p>
        </section>
      </article>

      {isAuthenticated && <ConsentToggleBar consentKey="marketing" />}
    </div>
  );
}
