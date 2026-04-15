export default function WonderWeeksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <div className="flex-1 pb-24">{children}</div>
    </div>
  );
}
