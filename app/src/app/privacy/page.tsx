import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description:
    '아기랑 개인정보처리방침 - 수집 항목, 이용 목적, 보유 기간, 파기 절차 등 개인정보 보호 정책을 안내합니다.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-white pb-24 px-6">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)] -mx-6">
        <BackButton />
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          개인정보처리방침
        </h1>
      </header>

      <article className="py-6 text-[14px] leading-relaxed text-gray-700 space-y-6">
        <p className="text-xs text-gray-400">시행일자: 2026년 4월 8일</p>

        <section>
          <p>
            아기랑(이하 &quot;회사&quot;)은 「개인정보 보호법」 등 관련 법령을 준수하며, 회원의 개인정보를
            보호하기 위해 최선을 다하고 있습니다. 본 개인정보처리방침은 회사가 제공하는 서비스
            &quot;아기랑&quot;(이하 &quot;서비스&quot;)에서 회원의 개인정보를 어떻게 수집·이용·보관·파기하는지를
            안내합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">1. 수집하는 개인정보 항목</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <b>회원가입 시</b>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>필수: 이메일 주소, 소셜 로그인 식별자(카카오/구글 등 제공값), 닉네임</li>
                <li>선택: 프로필 이미지</li>
              </ul>
            </li>
            <li>
              <b>서비스 이용 시</b>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>아기 정보: 이름(또는 태명), 생년월일, 성별, 출생 시 신체 정보(키·몸무게 등)</li>
                <li>성장 기록, 수유·수면 기록, 기질 검사 응답 결과</li>
              </ul>
            </li>
            <li>
              <b>유료 결제 시</b>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>결제 정보(결제 수단, 결제 일시, 결제 금액, PG사 거래번호)</li>
                <li>환불 처리 시: 환불 사유, 환불 계좌 정보(현금 환불 시에 한함)</li>
                <li>※ 카드번호·계좌번호 등 결제 인증 정보는 회사가 직접 보관하지 않으며, PG사가 처리합니다.</li>
              </ul>
            </li>
            <li>
              <b>자동 수집 항목</b>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>서비스 이용 기록, 접속 로그, 기기 정보, IP 주소, 쿠키</li>
              </ul>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">2. 개인정보의 수집·이용 목적</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원 식별, 회원가입 의사 확인, 본인 인증 및 계정 관리</li>
            <li>아기 성장·발달 기록 및 맞춤형 콘텐츠 제공</li>
            <li>유료 서비스 결제, 환불, 청구 및 분쟁 처리</li>
            <li>공지사항 전달, 고객 문의 응대</li>
            <li>서비스 품질 개선, 부정 이용 방지, 통계 분석</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원 탈퇴 시 회사가 수집한 개인정보는 지체 없이 파기하는 것을 원칙으로 합니다.</li>
            <li>다만, 관련 법령에 따라 일정 기간 보관해야 하는 정보는 아래와 같이 보관합니다.
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>계약 또는 청약철회에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금 결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)</li>
                <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
                <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
              </ul>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">4. 개인정보의 제3자 제공</h2>
          <p>
            회사는 회원의 개인정보를 본 방침에서 명시한 목적 범위 내에서만 처리하며, 회원의 사전 동의 없이
            제3자에게 제공하지 않습니다. 다만, 관련 법령에 따라 수사기관의 요청이 있는 경우 등 법령에서 정한
            예외적인 경우는 그러하지 아니합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">5. 개인정보 처리 위탁</h2>
          <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁할 수 있습니다.</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">수탁업체</th>
                  <th className="px-3 py-2 text-left font-medium">위탁 업무</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2">Supabase</td>
                  <td className="px-3 py-2">데이터베이스, 인증, 스토리지</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">PG사 (토스페이먼츠 등)</td>
                  <td className="px-3 py-2">결제 처리 및 환불</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">카카오, 구글</td>
                  <td className="px-3 py-2">소셜 로그인 인증</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            ※ 수탁업체 및 위탁 업무가 변경되는 경우 본 방침을 통해 고지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">6. 개인정보의 파기 절차 및 방법</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>개인정보의 보유 기간이 경과하거나 처리 목적이 달성된 경우, 회사는 지체 없이 해당 정보를 파기합니다.</li>
            <li>전자적 파일 형태의 정보는 복구할 수 없는 기술적 방법으로 삭제하며, 출력물 등은 분쇄 또는 소각하여 파기합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">7. 회원의 권리 및 행사 방법</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 언제든지 자신의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해 개인정보 처리 정지를 요청할 수 있습니다.</li>
            <li>설정 메뉴 또는 고객센터를 통해 권리 행사를 요청할 수 있으며, 회사는 지체 없이 조치합니다.</li>
            <li>만 14세 미만 아동의 개인정보는 법정대리인의 동의를 받아 수집·처리합니다. 본 서비스에서 등록되는 아기의 정보는 회원(보호자)이 직접 관리하는 정보로 간주합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">8. 개인정보의 안전성 확보 조치</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>관리적 조치: 내부 관리계획 수립·운영, 접근 권한 최소화</li>
            <li>기술적 조치: 비밀번호 암호화, 전송 구간 암호화(HTTPS), 접근 통제</li>
            <li>물리적 조치: 데이터센터의 출입 통제 (위탁사 정책 준용)</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">9. 쿠키 및 유사 기술의 사용</h2>
          <p>
            회사는 서비스 제공 및 사용자 경험 개선을 위해 쿠키 및 로컬 스토리지 등 유사 기술을 사용할 수
            있습니다. 회원은 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용에
            제약이 발생할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">10. 개인정보 보호책임자</h2>
          <p>
            회사는 개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 회원의 불만 처리 및 피해 구제
            등을 위하여 아래와 같이 개인정보 보호책임자를 지정합니다.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보 보호책임자: (담당자명)</li>
            <li>이메일: (고객센터 이메일)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">11. 권익 침해 구제 방법</h2>
          <p>개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보분쟁조정위원회: 1833-6972 (privacy.go.kr)</li>
            <li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li>
            <li>대검찰청 사이버수사과: 1301 (spo.go.kr)</li>
            <li>경찰청 사이버수사국: 182 (ecrm.police.go.kr)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">12. 개인정보처리방침의 변경</h2>
          <p>
            본 방침은 법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 수 있으며,
            변경 시 최소 7일 전(중대한 변경의 경우 30일 전)에 서비스 내 공지사항을 통해 안내합니다.
          </p>
        </section>

        <section className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">부칙: 본 개인정보처리방침은 2026년 4월 8일부터 시행됩니다.</p>
        </section>
      </article>
    </div>
  );
}
