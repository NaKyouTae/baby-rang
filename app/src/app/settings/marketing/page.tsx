import PixelDocPage, { DocLead } from '@/components/PixelDocPage';

// 디자인(Figma 5010:40754)은 조항 제목·시행일 없이 검정 단락만 쌓는다.
// 유효기간 단락은 디자인에 없지만 법령(개인정보 보호법 시행령 제48조의2) 고지라 같은 꼴로 남긴다.
export default function SettingsMarketingPage() {
  return (
    <PixelDocPage title="마케팅 정보 수신 동의">
      <DocLead>
        회사는 서비스 이용과 관련된 이벤트, 혜택, 신규 기능 안내 등 마케팅 정보를 이메일, 푸시
        알림 등의 방법으로 제공할 수 있습니다.
      </DocLead>

      <DocLead>
        마케팅 정보 수신 동의의 유효기간은 동의일로부터 2년이며, 유효기간이
        만료되면 동의 효력이 자동으로 종료되어 마케팅 정보 발송이 중단됩니다. 만료 이후 계속
        수신을 원하시는 경우 마이페이지에서 다시 동의해 주시기
        바랍니다. (개인정보 보호법 시행령 제48조의2)
      </DocLead>

      <DocLead>
        회원은 언제든지 설정 메뉴를 통해 마케팅 정보 수신 동의를 철회할 수 있으며, 동의를
        거부하거나 철회하시더라도 서비스 이용에는 제한이 없습니다.
      </DocLead>
    </PixelDocPage>
  );
}
