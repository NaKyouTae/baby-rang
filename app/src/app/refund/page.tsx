'use client';

import { useRouter } from 'next/navigation';

export default function RefundPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="p-2"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          환불정책
        </h1>
      </header>

      <article className="px-5 py-6 text-[14px] leading-relaxed text-gray-700 space-y-6">
        <p className="text-xs text-gray-400">시행일자: 2026년 4월 8일</p>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">1. 기본 원칙</h2>
          <p>
            아기랑(이하 &quot;회사&quot;)은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 관련 법령에서 정한
            회원의 권리를 보장하며, 본 환불정책에 따라 결제 취소 및 환불을 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">2. 청약철회 (단순 변심에 의한 환불)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 유료 서비스 결제일로부터 <b>7일 이내</b>에 청약철회를 신청할 수 있습니다.</li>
            <li>다만, 다음의 경우에는 청약철회가 제한될 수 있습니다.
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>결제 후 유료 서비스(콘텐츠, 검사 결과 등)를 이미 사용했거나 일부라도 이용한 경우</li>
                <li>일회성으로 제공되는 디지털 콘텐츠가 즉시 제공 완료된 경우</li>
                <li>기타 관련 법령에서 청약철회가 제한되는 경우</li>
              </ul>
            </li>
            <li>청약철회 제한 사유에 해당하는 상품의 경우, 결제 화면 및 상품 안내에 그 사실을 명확히 표시합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">3. 회사의 귀책사유로 인한 환불</h2>
          <p>
            서비스 결함, 장기간 서비스 장애 등 회사의 귀책사유로 정상적인 서비스 이용이 불가능한 경우, 회원은
            이용 기간과 관계없이 전액 환불을 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">4. 정기결제(구독) 환불</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>정기결제 상품은 회원이 직접 다음 결제일 전까지 해지할 수 있으며, 해지 시 다음 결제부터 청구되지 않습니다.</li>
            <li>이미 결제된 이용 기간에 대한 환불은 사용 내역 및 잔여 일수에 따라 산정됩니다.</li>
            <li>해당 결제 주기 내에 유료 기능을 이용하지 않은 경우, 결제일로부터 7일 이내에 한해 전액 환불이 가능합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">5. 환불 신청 방법</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>설정 &gt; 결제 내역에서 환불 대상 결제 항목을 확인할 수 있습니다.</li>
            <li>고객센터(이메일)로 결제일, 결제 수단, 환불 사유를 기재하여 신청해 주세요.</li>
            <li>회사는 신청 접수 후 영업일 기준 3일 이내에 처리 결과를 안내합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">6. 환불 처리 기간</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>환불은 결제 시 사용한 결제 수단으로 동일하게 처리되는 것을 원칙으로 합니다.</li>
            <li>결제 수단별 환불 처리에는 영업일 기준 3~7일이 소요될 수 있으며, 카드사·은행·간편결제사의 정책에 따라 추가 시간이 소요될 수 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">7. 문의</h2>
          <p>
            환불 및 결제 관련 문의는 앱 내 설정 &gt; 고객센터 또는 공식 이메일을 통해 접수해 주세요.
          </p>
        </section>

        <section className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">부칙: 본 환불정책은 2026년 4월 8일부터 시행됩니다.</p>
        </section>
      </article>
    </div>
  );
}
