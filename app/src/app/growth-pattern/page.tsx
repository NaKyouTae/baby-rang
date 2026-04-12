import dynamic from "next/dynamic";
import BottomNav from "@/components/BottomNavServer";

const GrowthPatternClient = dynamic(() => import("./GrowthPatternClient"), {
  ssr: false,
});

export default function GrowthPatternPage() {
  return (
    <>
      <GrowthPatternClient />
      <BottomNav />
    </>
  );
}
