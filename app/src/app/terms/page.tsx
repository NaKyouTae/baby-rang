import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';

export const metadata: Metadata = {
  title: '이용약관',
  description:
    '아기랑 이용약관 - 서비스 이용 조건, 회원의 권리와 의무, 유료 서비스 및 결제, 계약 해지 등을 안내합니다.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)]">
        <BackButton />
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          이용약관
        </h1>
      </header>

      <article className="px-5 py-6 text-[14px] leading-relaxed text-gray-700 space-y-6">
        <p className="text-xs text-gray-400">시행일자: 2026년 4월 8일</p>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제1조 (목적)</h2>
          <p>
            본 약관은 아기랑(이하 &quot;회사&quot;)이 제공하는 모바일 웹 서비스 &quot;아기랑&quot;(이하
            &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자(이하 &quot;회원&quot;) 간의 권리, 의무
            및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제2조 (정의)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>&quot;서비스&quot;란 아기의 성장 기록, 발달 정보, 기질 검사, 수유실 정보 등 육아와 관련된 콘텐츠 및 기능을 제공하는 일체의 서비스를 의미합니다.</li>
            <li>&quot;회원&quot;이란 본 약관에 동의하고 회사와 이용계약을 체결한 자를 말합니다.</li>
            <li>&quot;유료 서비스&quot;란 회사가 제공하는 서비스 중 회원이 결제를 통해 이용할 수 있는 서비스를 말합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제3조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관은 서비스 화면에 게시하거나 기타 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 사유를 명시하여 최소 7일 전(회원에게 불리하거나 중대한 변경의 경우 30일 전)에 공지합니다.</li>
            <li>회원이 변경된 약관에 동의하지 않을 경우 이용계약을 해지할 수 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제4조 (회원가입 및 계정)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원가입은 이용자가 약관에 동의하고 회사가 정한 절차에 따라 가입을 신청한 후, 회사가 이를 승낙함으로써 성립됩니다.</li>
            <li>회원은 자신의 계정 정보를 제3자에게 양도, 대여할 수 없으며, 계정 관리에 대한 책임은 회원 본인에게 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제5조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 회원에게 아기 성장 기록, 발달 패턴, 기질 검사, 수유실 안내 등의 서비스를 제공합니다.</li>
            <li>회사는 서비스의 내용, 운영상·기술상 사항 등을 변경할 수 있으며, 변경 시 사전에 공지합니다.</li>
            <li>서비스에서 제공하는 정보(성장 기준, 발달 정보 등)는 일반적인 참고 자료이며, 의료 행위나 진단을 대체하지 않습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제6조 (유료 서비스 및 결제)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 회사가 정한 결제 수단을 통해 유료 서비스를 이용할 수 있습니다.</li>
            <li>유료 서비스의 가격, 이용 기간, 환불 조건 등은 각 상품 안내 페이지에 표시된 내용에 따릅니다.</li>
            <li>유료 서비스의 환불에 관한 사항은 별도로 정한 <a href="/refund" className="text-blue-600 underline">환불정책</a>을 따릅니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제7조 (회원의 의무)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 관계 법령, 본 약관, 이용 안내 및 회사가 공지한 사항을 준수하여야 합니다.</li>
            <li>회원은 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 됩니다.</li>
            <li>회원은 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 전송, 출판, 배포할 수 없습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제8조 (서비스 이용 제한)</h2>
          <p>
            회사는 회원이 본 약관 또는 관련 법령을 위반한 경우 사전 통지 없이 서비스 이용을 일시 정지하거나 이용계약을 해지할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제9조 (계약 해지 및 탈퇴)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 언제든지 서비스 내 설정 메뉴 또는 고객센터를 통해 이용계약 해지(회원 탈퇴)를 신청할 수 있습니다.</li>
            <li>탈퇴 시 회원의 개인정보는 개인정보처리방침에 따라 처리됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제10조 (면책조항)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 천재지변, 불가항력, 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.</li>
            <li>서비스에서 제공하는 육아·발달 관련 정보는 참고용이며, 이를 근거로 한 회원의 판단과 행동에 대한 책임은 회원에게 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">제11조 (분쟁 해결 및 준거법)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관은 대한민국 법령에 따라 해석됩니다.</li>
            <li>서비스 이용과 관련하여 회사와 회원 간 분쟁이 발생한 경우, 양 당사자는 성실히 협의하여 해결하며, 협의가 이루어지지 않을 경우 민사소송법상 관할 법원에 제소할 수 있습니다.</li>
          </ol>
        </section>

        <section className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">부칙: 본 약관은 2026년 4월 8일부터 시행됩니다.</p>
        </section>
      </article>
    </div>
  );
}
