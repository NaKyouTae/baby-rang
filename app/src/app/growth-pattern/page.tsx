import dynamic from "next/dynamic";
import BottomNav from "@/components/BottomNavServer";
import { GrowthPatternSkeleton } from "@/components/Skeleton";

const GrowthPatternClient = dynamic(() => import("./GrowthPatternClient"), {
  loading: () => <GrowthPatternSkeleton />,
});

export default function GrowthPatternPage() {
  return (
    <>
      <GrowthPatternClient />
      <BottomNav />
    </>
  );
}
