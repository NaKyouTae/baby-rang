import { DocDate, DocOl, DocSection, DocUl } from '@/components/PixelDocPage';

const SUPPORT_EMAIL = 'spectrum.mesh@gmail.com';

const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  '[아기랑] 환불 요청',
)}&body=${encodeURIComponent(
  '아래 내용을 작성해 주세요.\n\n- 결제 일시: \n- 결제 수단: \n- 결제 상품명: \n- 환불 사유: \n- 연락 가능한 이메일: \n',
)}`;

function EmailLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#3078C9] underline">
      {SUPPORT_EMAIL}
    </a>
  );
}

/** 환불정책 본문. /refund 와 /settings/refund 가 같이 쓴다. */
export default function RefundContent({ company }: { company: string }) {
  return (
    <>
      <DocDate>시행일자: 2026년 4월 8일</DocDate>

      <DocSection title="1. 기본 원칙">
        <p>
          {company}(이하 &quot;회사&quot;)이 운영하는 &quot;아기랑&quot; 서비스는 「전자상거래 등에서의
          소비자보호에 관한 법률」 및 관련 법령에서 정한 회원의 권리를 보장하며, 본 환불정책에 따라 결제
          취소 및 환불을 처리합니다.
        </p>
      </DocSection>

      <DocSection title="2. 청약철회 (단순 변심에 의한 환불)">
        <DocOl>
          <li>회원은 유료 서비스 결제일로부터 7일 이내에 청약철회를 신청할 수 있습니다.</li>
          <li>
            다만, 다음의 경우에는 청약철회가 제한될 수 있습니다.
            <DocUl nested>
              <li>결제 후 유료 서비스(콘텐츠, 검사 결과 등)를 이미 사용했거나 일부라도 이용한 경우</li>
              <li>일회성으로 제공되는 디지털 콘텐츠가 즉시 제공 완료된 경우</li>
              <li>기타 관련 법령에서 청약철회가 제한되는 경우</li>
            </DocUl>
          </li>
          <li>
            청약철회 제한 사유에 해당하는 상품의 경우, 결제 화면 및 상품 안내에 그 사실을 명확히 표시하고
            회원의 동의를 받습니다.
          </li>
        </DocOl>
      </DocSection>

      <DocSection title="3. 회사의 귀책사유로 인한 환불">
        <p>
          서비스 결함, 장기간 서비스 장애 등 회사의 귀책사유로 정상적인 서비스 이용이 불가능한 경우, 회원은
          이용 기간과 관계없이 전액 환불을 요청할 수 있습니다.
        </p>
      </DocSection>

      <DocSection title="4. 정기결제(구독) 환불">
        <DocOl>
          <li>
            정기결제 상품은 회원이 직접 다음 결제일 전까지 해지할 수 있으며, 해지 시 다음 결제부터 청구되지
            않습니다.
          </li>
          <li>이미 결제된 이용 기간에 대한 환불은 사용 내역 및 잔여 일수에 따라 산정됩니다.</li>
          <li>
            해당 결제 주기 내에 유료 기능을 이용하지 않은 경우, 결제일로부터 7일 이내에 한해 전액 환불이
            가능합니다.
          </li>
        </DocOl>
      </DocSection>

      <DocSection title="5. 환불 신청 방법">
        <DocOl>
          <li>설정 &gt; 결제 내역에서 환불 대상 결제 항목을 확인할 수 있습니다.</li>
          <li>
            환불은 고객센터 이메일(<EmailLink />)로 접수해 주세요.
          </li>
          <li>
            원활한 처리를 위해 아래 내용을 함께 기재해 주세요.
            <DocUl nested>
              <li>결제 일시 및 결제 수단</li>
              <li>결제 상품명</li>
              <li>환불 사유</li>
              <li>연락 가능한 이메일</li>
            </DocUl>
          </li>
          <li>회사는 신청 접수 후 영업일 기준 3일 이내에 처리 결과를 이메일로 회신합니다.</li>
        </DocOl>
        <a
          href={MAILTO_HREF}
          className="h-[52px] flex items-center justify-center rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] active:translate-y-px"
        >
          이메일로 환불 요청하기
        </a>
      </DocSection>

      <DocSection title="6. 환불 처리 기간">
        <DocOl>
          <li>환불은 결제 시 사용한 결제 수단으로 동일하게 처리되는 것을 원칙으로 합니다.</li>
          <li>
            결제 수단별 환불 처리에는 영업일 기준 3~7일이 소요될 수 있으며, 카드사·은행·간편결제사의 정책에
            따라 추가 시간이 소요될 수 있습니다.
          </li>
        </DocOl>
      </DocSection>

      <DocSection title="7. 문의">
        <p>
          환불 및 결제 관련 문의는 고객센터 이메일(<EmailLink />)로 접수해 주세요.
        </p>
        <ul>
          <li>사업자명 : 스펙트럼</li>
          <li>대표자 : 나규태</li>
          <li>사업자등록번호 : 244-20-02381</li>
          <li>고객센터 : {SUPPORT_EMAIL}</li>
        </ul>
      </DocSection>

      <DocDate>부칙: 본 환불정책은 2026년 4월 8일부터 시행됩니다.</DocDate>
    </>
  );
}
