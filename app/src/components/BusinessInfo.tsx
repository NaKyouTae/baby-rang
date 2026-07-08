import { palette } from "@/lib/colors";

export default function BusinessInfo() {
  return (
    <footer
      style={{
        backgroundColor: palette.gray100,
        paddingTop: 16,
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 32,
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
        <li>사업장 주소 : 다산중앙로82번안길 166-46</li>
        <li>
          연락처 :{" "}
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
    </footer>
  );
}
