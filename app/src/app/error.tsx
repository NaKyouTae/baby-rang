"use client";

import { useEffect } from "react";
import PixelErrorScreen from "@/components/PixelErrorScreen";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PixelErrorScreen
      title="예기치 못한 문제가 생겼어요."
      description="잠시 후 다시 이용해 주세요."
    />
  );
}
