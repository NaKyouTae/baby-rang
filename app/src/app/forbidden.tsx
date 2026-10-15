import type { Metadata } from "next";
import PixelErrorScreen from "@/components/PixelErrorScreen";

export const metadata: Metadata = {
  title: "이 페이지에 접근할 수 없어요",
  robots: { index: false, follow: false },
};

export default function Forbidden() {
  return (
    <PixelErrorScreen
      title="이 페이지에 접근할 수 없어요."
      description="권한을 확인해 주세요."
    />
  );
}
