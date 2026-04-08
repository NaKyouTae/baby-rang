import Link from "next/link";

export default function TemperamentEventPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/home" className="text-gray-700" aria-label="뒤로가기">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">기질 검사 이벤트</h1>
      </header>

      <main className="flex-1 px-5 pt-6 pb-32">
        <div
          className="rounded-3xl p-6 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg,#FFB347,#FF7E5F)" }}
        >
          <p className="text-xs font-semibold opacity-90">#우리 아이를 더 깊이 이해하기</p>
          <h2 className="text-2xl font-bold leading-tight mt-2">
            기질 검사로 알아보는
            <br />
            우리 아이 양육 가이드
          </h2>
          <p className="text-sm opacity-90 mt-3">
            전문가가 설계한 기질 진단으로 우리 아이만의 강점과
            <br /> 맞춤 양육 팁을 받아보세요.
          </p>
        </div>

        <section className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">이런 분께 추천해요</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• 아이 행동의 이유가 궁금한 부모</li>
            <li>• 양육 방식에 확신이 필요한 부모</li>
            <li>• 형제·자매 간 차이를 이해하고 싶은 부모</li>
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">이렇게 진행돼요</h3>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal pl-5">
            <li>아이 정보 입력 (1분)</li>
            <li>기질 문항 응답 (약 5분)</li>
            <li>맞춤 결과 리포트 확인</li>
          </ol>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100">
        <Link
          href="/temperament"
          className="block w-full text-center bg-orange-500 text-white font-semibold py-4 rounded-2xl active:opacity-80"
        >
          기질 검사 시작하기
        </Link>
      </div>
    </div>
  );
}
