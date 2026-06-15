import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import { palette } from '@/lib/colors';

export const metadata: Metadata = {
  title: '고객지원',
  description:
    '아기랑 고객지원 - 문의 방법, 자주 묻는 질문, 고객센터 연락처 및 사업자 정보를 안내합니다.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: '고객지원 | 아기랑',
    description:
      '아기랑 고객지원 - 문의 방법, 자주 묻는 질문, 고객센터 연락처 및 사업자 정보를 안내합니다.',
    url: 'https://baby-rang.spectrify.kr/support',
  },
};

export default function SupportPage() {
  return (
    <div className="flex flex-col bg-white pb-[var(--bottom-nav-space)] px-6">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)] -mx-6">
        <BackButton />
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          고객지원
        </h1>
      </header>

      <article className="py-6 text-[14px] font-normal leading-relaxed space-y-6" style={{ color: palette.gray500 }}>
        <section>
          <p>
            아기랑을 이용해 주셔서 감사합니다. 서비스 이용 중 궁금한 점이나 불편한 점이 있으시면
            아래 방법으로 문의해 주세요. 영업일 기준 1~2일 이내에 답변드립니다.
          </p>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>문의 방법</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              이메일 문의:{' '}
              <a href="mailto:spectrum.mesh@gmail.com" className="underline" style={{ color: palette.black }}>
                spectrum.mesh@gmail.com
              </a>
            </li>
            <li>운영 시간: 평일 10:00 ~ 18:00 (주말·공휴일 제외)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>자주 묻는 질문</h2>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <p className="font-medium" style={{ color: palette.black }}>로그인은 어떻게 하나요?</p>
              <p>카카오 또는 구글 계정으로 간편하게 로그인할 수 있습니다.</p>
            </li>
            <li>
              <p className="font-medium" style={{ color: palette.black }}>여러 아이를 등록할 수 있나요?</p>
              <p>네, 프로필을 여러 개 만들어 자녀별로 성장 기록을 따로 관리할 수 있습니다.</p>
            </li>
            <li>
              <p className="font-medium" style={{ color: palette.black }}>결제 및 환불은 어떻게 하나요?</p>
              <p>
                유료 서비스 결제 내역은 설정 메뉴에서 확인할 수 있으며, 환불은 환불정책에 따라
                고객센터 이메일로 요청해 주시면 처리해 드립니다.
              </p>
            </li>
            <li>
              <p className="font-medium" style={{ color: palette.black }}>회원 탈퇴는 어떻게 하나요?</p>
              <p>설정 메뉴에서 직접 탈퇴할 수 있으며, 탈퇴 시 개인정보는 개인정보처리방침에 따라 처리됩니다.</p>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>사업자 정보</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>사업자명 : 스펙트럼</li>
            <li>대표자 : 나규태</li>
            <li>사업자등록번호 : 244-20-02381</li>
            <li>고객센터 : spectrum.mesh@gmail.com</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
