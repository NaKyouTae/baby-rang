'use client';

import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

export default function SettingsThirdPartyPage() {
  return (
    <div className="flex flex-col bg-white pb-[var(--bottom-nav-space)]">
      <PageHeader title="개인정보 제3자 제공 동의" variant="back" />

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
            회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보를 제3자에게 제공할 수 있습니다.
          </p>
        </section>

        <section>
          <ul className="list-disc pl-5 space-y-1">
            <li>제공받는 자: PG사(토스페이먼츠 등)</li>
            <li>제공 목적: 결제 처리 및 환불 처리</li>
            <li>제공 항목: 결제 관련 정보(결제 수단, 결제 금액, 거래번호 등)</li>
            <li>보유 및 이용 기간: 관련 법령에 따른 보관 기간까지</li>
          </ul>
        </section>

        <section>
          <ul className="list-disc pl-5 space-y-1">
            <li>제공받는 자: 카카오, 구글 등 소셜 로그인 제공자</li>
            <li>제공 목적: 간편 로그인 인증</li>
            <li>제공 항목: 소셜 로그인 식별자 및 기본 프로필 정보</li>
            <li>보유 및 이용 기간: 회원 탈퇴 시까지</li>
          </ul>
        </section>

        <section>
          <p>
            회원은 개인정보 제3자 제공에 대한 동의를 거부할 권리가 있으며, 동의하지 않을 경우 일부
            서비스(결제, 소셜 로그인 등) 이용에 제한이 있을 수 있습니다.
          </p>
        </section>
      </article>
    </div>
  );
}
