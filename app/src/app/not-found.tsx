import type { Metadata } from "next";
import PixelErrorScreen from "@/components/PixelErrorScreen";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PixelErrorScreen
      title="페이지를 찾을 수 없어요."
      description="페이지를 다시 확인해 주세요."
    />
  );
}
