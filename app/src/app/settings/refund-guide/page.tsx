import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/settings/refund-guide`;

export const metadata: Metadata = {
  title: '환불 안내 (iOS · Android)',
  description:
    '아기랑 인앱 결제의 환불 신청 방법을 iOS(App Store)와 Android(Google Play)로 나누어 안내합니다. 스토어별 신청 경로와 처리 기간, 환불 후 리포트 열람 변화를 확인하세요.',
  alternates: { canonical: '/settings/refund-guide' },
  openGraph: {
    title: '환불 안내 (iOS · Android) | 아기랑',
    description:
      '아기랑 인앱 결제의 환불 신청 방법을 iOS(App Store)와 Android(Google Play)로 나누어 안내합니다.',
    url: PAGE_URL,
  },
};

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

function GuideSection({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[12px] p-5"
      style={{ backgroundColor: palette.gray100, border: `1px solid ${palette.gray200}` }}
    >
      <h2 className="text-[15px] font-bold mb-1" style={{ color: palette.black }}>
        {title}
      </h2>
      {desc && (
        <p className="text-[12px] mb-3" style={{ color: palette.gray500 }}>
          {desc}
        </p>
      )}
      <ol className="flex flex-col gap-3">{children}</ol>
    </section>
  );
}

const B = ({ children }: { children: React.ReactNode }) => (
  <b style={{ color: palette.black }}>{children}</b>
);

export default function RefundGuidePage() {
  return (
    <div
      className="flex flex-col bg-white"
      style={{ paddingBottom: 'calc(var(--bottom-nav-space) + 40px)' }}
    >
      <PageHeader title="환불 안내" variant="back" />

      <div className="px-5 pt-5 flex flex-col gap-4">
        <p className="text-[14px] leading-relaxed" style={{ color: palette.gray600 }}>
          아기랑의 인앱 결제는 <B>App Store</B>와 <B>Google Play</B>를 통해 이루어집니다.
          결제 대금을 스토어가 받기 때문에 환불도 <B>스토어에 직접 신청</B>해야 하며,
          아기랑이 임의로 결제를 취소해 드릴 수는 없습니다.
        </p>

        <GuideSection title="iPhone · iPad에서 결제했다면" desc="App Store (Apple)">
          <Step n={1}>
            브라우저에서 <B>reportaproblem.apple.com</B> 접속 후 Apple 계정으로 로그인
          </Step>
          <Step n={2}>
            <B>원하는 항목을 탭하거나 클릭하세요</B>에서 <B>환불 요청</B> 선택
          </Step>
          <Step n={3}>환불 사유를 고르고 <B>아기랑</B> 결제 항목 선택</Step>
          <Step n={4}>
            <B>제출</B>을 누르면 Apple이 심사합니다. 보통 <B>24~48시간</B>,
            길면 영업일 기준 1주일까지 걸립니다
          </Step>
        </GuideSection>

        <GuideSection title="Android에서 결제했다면" desc="Google Play (Google)">
          <Step n={1}>
            Play 스토어 앱 → 우측 상단 <B>프로필</B> → <B>결제 및 정기 결제</B> →{' '}
            <B>예산 및 주문 내역</B>
          </Step>
          <Step n={2}>
            <B>아기랑</B> 주문을 선택한 뒤 <B>환불 요청</B> 또는 <B>문제 신고</B>
          </Step>
          <Step n={3}>
            구매 후 <B>48시간 이내</B>라면 대부분 자동으로 즉시 처리됩니다
          </Step>
          <Step n={4}>
            48시간이 지났다면 같은 화면에서 Google에 요청하거나, 아래 문의 경로로 알려주세요.
            판단에 따라 아기랑이 Google에 환불을 요청할 수 있습니다
          </Step>
        </GuideSection>

        <GuideSection title="환불이 처리되면" desc="두 스토어 공통">
          <Step n={1}>
            결제 내역의 상태가 <B>환불됨</B>으로 바뀝니다
          </Step>
          <Step n={2}>
            해당 결제로 열어 본 <B>기질 검사 상세 리포트는 다시 잠깁니다</B>.
            기록한 성장 데이터는 지워지지 않습니다
          </Step>
          <Step n={3}>
            Android는 스토어 반영까지 최대 <B>6시간</B>이 걸릴 수 있습니다.
            그 사이에는 리포트가 열려 있을 수 있어요
          </Step>
        </GuideSection>

        <div
          className="rounded-[12px] p-5"
          style={{ backgroundColor: palette.gray100, border: `1px solid ${palette.gray200}` }}
        >
          <h2 className="text-[15px] font-bold mb-2" style={{ color: palette.black }}>
            알아두실 점
          </h2>
          <ul className="flex flex-col gap-2 text-[14px] leading-relaxed" style={{ color: palette.gray600 }}>
            <li>
              • 환불 승인 여부는 <B>Apple과 Google이 각자의 정책으로 판단</B>합니다.
              아기랑이 결과를 보장하거나 뒤집을 수 없습니다
            </li>
            <li>
              • 환불 금액은 결제 수단에 따라 입금까지 <B>영업일 기준 3~10일</B>이 더 걸릴 수 있습니다
            </li>
            <li>
              • 같은 상품을 다시 구매하면 리포트를 다시 열람할 수 있습니다
            </li>
          </ul>
        </div>

        <p className="text-[12px] leading-relaxed" style={{ color: palette.gray500 }}>
          환불 기준과 적용 범위는{' '}
          <Link href="/settings/refund" className="underline underline-offset-2">
            환불정책
          </Link>
          에서 확인하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
