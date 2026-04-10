import BottomNav from "@/components/BottomNavServer";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
