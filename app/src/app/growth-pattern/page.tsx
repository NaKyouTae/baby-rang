import type { Metadata } from "next";
import GrowthPatternClient from "./GrowthPatternClient";

export const metadata: Metadata = {
  title: "성장 패턴",
  description:
    "우리 아이의 키·몸무게 성장 곡선을 WHO 기준과 비교하고, 발달 패턴을 한눈에 확인하세요.",
  alternates: { canonical: "/growth-pattern" },
};

export default function GrowthPatternPage() {
  return <GrowthPatternClient />;
}
