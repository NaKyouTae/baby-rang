'use client';

import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex shrink-0 items-center justify-center text-[12px] font-bold text-white"
        style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: palette.teal }}
      >
        {n}
      </span>
      <span className="flex-1 text-[14px] leading-relaxed" style={{ color: palette.gray600 }}>
        {children}
      </span>
    </li>
  );
}

function GuideSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-[12px] p-5"
      style={{ backgroundColor: palette.gray100, border: `1px solid ${palette.gray200}` }}
    >
      <h2 className="text-[15px] font-bold mb-1" style={{ color: palette.black }}>{title}</h2>
      {desc && <p className="text-[12px] mb-3" style={{ color: palette.gray500 }}>{desc}</p>}
      <ol className="flex flex-col gap-3">{children}</ol>
    </section>
  );
}

export default function WidgetGuidePage() {
  return (
    <div className="flex flex-col bg-white" style={{ paddingBottom: 'calc(var(--bottom-nav-space) + 40px)' }}>
      <PageHeader title="위젯 사용 방법" variant="back" />

      <div className="px-5 pt-5 flex flex-col gap-4">
        <p className="text-[14px] leading-relaxed" style={{ color: palette.gray600 }}>
          홈 화면·잠금 화면에 위젯을 추가하면 앱을 열지 않고도 마지막{' '}
          <b style={{ color: palette.black }}>수유·수면·대변</b> 시간을 바로 확인할 수 있어요.
        </p>

        <GuideSection title="홈 화면에 추가하기" desc="iOS 기준">
          <Step n={1}>홈 화면 빈 곳을 <b style={{ color: palette.black }}>길게 누르기</b></Step>
          <Step n={2}>좌측 상단 <b style={{ color: palette.black }}>＋</b> 버튼 → 검색창에 <b style={{ color: palette.black }}>&quot;아기랑&quot;</b> 입력</Step>
          <Step n={3}><b style={{ color: palette.black }}>아기랑 요약</b> 위젯 선택 → 추가</Step>
        </GuideSection>

        <GuideSection title="아이가 여러 명일 때 (홈 화면)" desc="탭으로 아이 전환">
          <Step n={1}>위젯 <b style={{ color: palette.black }}>우측 하단 ▶ 버튼</b>을 탭하면 다음 아이로 전환돼요</Step>
          <Step n={2}>좌측 하단의 <b style={{ color: palette.black }}>● ○ 점</b>으로 지금 몇 번째 아이인지 확인할 수 있어요</Step>
        </GuideSection>

        <GuideSection title="잠금 화면에 추가하기" desc="아이별로 지정 가능">
          <Step n={1}>잠금 화면을 <b style={{ color: palette.black }}>길게 누르기</b> → <b style={{ color: palette.black }}>사용자화</b> → <b style={{ color: palette.black }}>잠금 화면</b> 선택</Step>
          <Step n={2}>시계 아래 <b style={{ color: palette.black }}>위젯 칸</b>을 탭 → <b style={{ color: palette.black }}>아기랑</b> 위젯 추가</Step>
          <Step n={3}>추가한 위젯을 <b style={{ color: palette.black }}>탭 → 아이 선택</b></Step>
          <Step n={4}>아이별로 따로 보려면, <b style={{ color: palette.black }}>잠금 화면을 여러 개</b> 만들어 각각 다른 아이를 선택하세요 (잠금 화면을 좌우로 넘겨 전환)</Step>
        </GuideSection>

        <section className="rounded-[12px] p-4" style={{ backgroundColor: palette.gray100 }}>
          <h3 className="text-[13px] font-bold mb-2" style={{ color: palette.black }}>참고</h3>
          <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed" style={{ color: palette.gray500 }}>
            <li>• 위젯에 데이터가 보이려면 앱에 <b style={{ color: palette.gray600 }}>로그인</b>되어 있어야 해요.</li>
            <li>• &quot;~전&quot; 경과 시간은 <b style={{ color: palette.gray600 }}>실시간으로</b> 흘러가고, 기록은 약 15분마다 갱신돼요.</li>
            <li>• 로그인 직후 위젯에 반영되지 않으면, 앱을 한 번 열었다 닫아주세요.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
