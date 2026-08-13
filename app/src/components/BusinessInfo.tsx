import Link from "next/link";
import { palette } from "@/lib/colors";

// 카드사 심사(전자결제 가맹점) 필수 노출 항목:
// 상호명 / 대표자명 / 사업자등록번호 / 통신판매업신고번호 / 사업장 주소 / 유선번호
// → 사업자등록증과 완전히 일치해야 하므로 임의로 수정하지 말 것.
export default function BusinessInfo() {
  return (
    <footer
      style={{
        backgroundColor: palette.gray100,
        paddingTop: 16,
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: "calc(var(--bottom-nav-space) + 16px)",
      }}
    >
      <p
        className="text-[12px] font-semibold"
        style={{ color: palette.gray600 }}
      >
        스펙트럼
      </p>
      <ul
        className="mt-2 text-[11px] font-normal"
        style={{ color: palette.gray500, lineHeight: "18px" }}
      >
        <li>대표자 : 나규태</li>
        <li>사업자등록번호 : 244-20-02381</li>
        <li>통신판매업신고번호 : 2026-다산-0719</li>
        <li>사업장 주소 : 다산중앙로82번안길 166-46</li>
        <li>
          유선번호 :{" "}
          <a href="tel:010-9109-2682" style={{ color: palette.gray500 }}>
            010-9109-2682
          </a>
        </li>
        <li>
          고객센터 :{" "}
          <a
            href="mailto:spectrum.mesh@gmail.com"
            style={{ color: palette.gray500 }}
          >
            spectrum.mesh@gmail.com
          </a>
        </li>
      </ul>
      <nav
        className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"
        style={{ color: palette.gray500 }}
      >
        <Link href="/terms" className="underline underline-offset-2">
          이용약관
        </Link>
        <Link href="/settings/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        <Link href="/refund" className="underline underline-offset-2">
          환불정책
        </Link>
      </nav>
    </footer>
  );
}
