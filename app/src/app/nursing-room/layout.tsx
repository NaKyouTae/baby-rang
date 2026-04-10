import BottomNavServer from "@/components/BottomNavServer";

export default function NursingRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNavServer />
    </div>
  );
}
