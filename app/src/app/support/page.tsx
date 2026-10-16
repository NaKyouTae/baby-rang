import type { Metadata } from 'next';
import PixelDocPage from '@/components/PixelDocPage';

const SUPPORT_EMAIL = 'spectrum.mesh@gmail.com';

export const metadata: Metadata = {
  title: '문의하기',
  description:
    '아기랑 문의 방법, 자주 묻는 질문, 고객센터 연락처 및 사업자 정보를 안내합니다.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: '문의하기 | 아기랑',
    description:
      '아기랑 문의 방법, 자주 묻는 질문, 고객센터 연락처 및 사업자 정보를 안내합니다.',
    url: 'https://baby-rang.spectrify.kr/support',
  },
};

export default function SupportPage() {
  return (
    <PixelDocPage title="문의하기">
      <p className="text-[#121212]" style={{ lineHeight: 1.6 }}>
        아기랑을 이용해 주셔서 감사합니다. 서비스 이용 중 궁금한 점이나 불편한 점이 있으시면
        아래 방법으로 문의해 주세요. 영업일 기준 1~2일 이내에 답변드립니다.
      </p>

      <section className="flex flex-col gap-[10px]">
        <h2 className="font-normal text-[#121212]">문의 방법</h2>
        <ul className="list-disc pl-[21px]" style={{ lineHeight: 1.6 }}>
          <li>
            이메일 문의 :{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
          </li>
          <li>운영 시간 : 평일 10시~18시(공휴일 제외)</li>
        </ul>
      </section>

      <section className="flex flex-col gap-[10px]">
        <h2 className="font-normal text-[#121212]">자주 묻는 질문</h2>
        <ol className="support-page-faq-list list-decimal pl-[21px] flex flex-col gap-[10px]">
          <li>
            <p className="text-[#121212]">로그인은 어떻게 하나요?</p>
            <p style={{ lineHeight: 1.6 }}>
              카카오, 네이버, 애플 계정으로 간편하게 로그인할 수 있습니다.
            </p>
          </li>
          <li>
            <p className="text-[#121212]">결제 및 환불은 어떻게 하나요?</p>
            <p style={{ lineHeight: 1.6 }}>
              유료 서비스 결제 내역은 설정 메뉴에서 확인하실 수 있으며 환불은 환불정책에 따라
              고객센터 이메일로 요청주시면 처리해 드립니다.
            </p>
          </li>
          <li>
            <p className="text-[#121212]">회원 탈퇴는 어떻게 하나요?</p>
            <p style={{ lineHeight: 1.6 }}>
              설정 메뉴에서 직접 탈퇴가 가능하며 탈퇴 시 개인정보는 개인정보처리방침에 따라
              처리됩니다.
            </p>
          </li>
        </ol>
      </section>

      <ul className="list-disc pl-[21px]">
        <li>사업자명 : 스펙트럼</li>
        <li>대표자 : 나규태</li>
        <li>사업자 등록 번호 : 224-20-02381</li>
        <li>고객센터 : {SUPPORT_EMAIL}</li>
      </ul>
    </PixelDocPage>
  );
}
