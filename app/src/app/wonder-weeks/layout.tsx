import BottomNav from "@/components/BottomNavServer";

export default function WonderWeeksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
