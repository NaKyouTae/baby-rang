import BottomNavServer from "@/components/BottomNavServer";

export default function NursingRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNavServer />
    </>
  );
}
