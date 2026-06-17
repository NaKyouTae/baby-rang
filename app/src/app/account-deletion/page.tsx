import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import { palette } from '@/lib/colors';

export const metadata: Metadata = {
  title: '계정 및 데이터 삭제',
  description:
    '아기랑 계정 삭제 안내 - 회원 탈퇴 방법, 삭제되는 데이터와 법령에 따라 보관되는 데이터 및 보관 기간을 안내합니다.',
  alternates: { canonical: '/account-deletion' },
  openGraph: {
    title: '계정 및 데이터 삭제 | 아기랑',
    description:
      '아기랑 계정 삭제 안내 - 회원 탈퇴 방법, 삭제되는 데이터와 법령에 따라 보관되는 데이터 및 보관 기간을 안내합니다.',
    url: 'https://baby-rang.spectrify.kr/account-deletion',
  },
};

export default function AccountDeletionPage() {
  return (
    <div className="flex flex-col bg-white pb-[var(--bottom-nav-space)] px-6">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)] -mx-6">
        <BackButton />
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          계정 및 데이터 삭제
        </h1>
      </header>

      <article className="py-6 text-[14px] font-normal leading-relaxed space-y-6" style={{ color: palette.gray500 }}>
        <section>
          <p>
            본 페이지는 모바일 애플리케이션 &quot;아기랑&quot;(개발자: 스펙트럼)의 계정 및 데이터 삭제
            방법을 안내합니다. 회원은 아래 방법으로 언제든지 계정 삭제(회원 탈퇴)를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>1. 앱에서 직접 탈퇴하기</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>아기랑 앱에 로그인합니다.</li>
            <li>하단 메뉴에서 <b>설정</b> 화면으로 이동합니다.</li>
            <li>화면 하단의 <b>회원탈퇴</b>를 누릅니다.</li>
            <li>안내 팝업에서 <b>탈퇴하기</b>를 눌러 확정합니다.</li>
          </ol>
          <p className="mt-2">
            탈퇴가 완료되면 계정과 모든 서비스 데이터가 삭제되며 복구할 수 없습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>2. 이메일로 삭제 요청하기</h2>
          <p>
            앱에 접근할 수 없는 경우, 가입한 이메일 주소로 아래 주소에 삭제를 요청해 주세요. 본인 확인 후
            지체 없이 처리해 드립니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>이메일: spectrum.mesh@gmail.com</li>
            <li>제목: [아기랑] 계정 삭제 요청</li>
            <li>내용: 가입한 이메일 주소 또는 소셜 로그인 계정</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>3. 삭제되는 데이터</h2>
          <p>탈퇴 시 다음 데이터가 지체 없이 파기됩니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>계정 정보: 이메일 주소, 소셜 로그인 식별자, 닉네임, 프로필 이미지</li>
            <li>아기 정보: 이름(또는 태명), 생년월일, 성별, 신체 정보</li>
            <li>활동 기록: 성장 기록, 수유·수면 기록, 기질 검사 응답 결과</li>
            <li>서비스 이용 기록, 접속 로그, 기기 정보 등 자동 수집 정보</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[14px] font-medium mb-[10px]" style={{ color: palette.black }}>4. 법령에 따라 보관되는 데이터 및 기간</h2>
          <p>
            관련 법령에 따라 아래 정보는 탈퇴 후에도 정해진 기간 동안 보관된 뒤 파기됩니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>계약 또는 청약철회에 관한 기록: 5년 (전자상거래법)</li>
            <li>대금 결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)</li>
            <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
            <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
          </ul>
          <p className="mt-2">
            ※ 카드번호·계좌번호 등 결제 인증 정보는 회사가 직접 보관하지 않으며 결제대행사(PG)가 처리합니다.
          </p>
        </section>

        <section className="pt-4 border-t border-gray-200">
          <p className="text-[12px] font-normal" style={{ color: palette.gray500 }}>
            계정 삭제 관련 문의: spectrum.mesh@gmail.com
          </p>
        </section>
      </article>
    </div>
  );
}
