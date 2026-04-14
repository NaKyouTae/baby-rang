"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Image,
  Megaphone,
  Baby,
  ClipboardList,
  Brain,
  Users,
  CreditCard,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/banners", label: "배너 관리", icon: Image },
  { href: "/notices", label: "공지사항", icon: Megaphone },
  { href: "/nursing-rooms", label: "수유실 관리", icon: Baby },
  { href: "/temperament/questions", label: "기질 검사 문항", icon: ClipboardList },
  { href: "/temperament/results", label: "기질 검사 결과", icon: Brain },
  { href: "/users", label: "사용자", icon: Users },
  { href: "/payments", label: "결제 내역", icon: CreditCard },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {NAV.map((n) => {
        const Icon = n.icon;
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
        <div className="flex h-14 items-center px-6 border-b">
          <span className="font-bold text-lg">아기랑 어드민</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems />
        </div>
        <Separator />
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold">아기랑 어드민</span>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Mobile Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>아기랑 어드민</SheetTitle>
          </SheetHeader>
          <NavItems onNavigate={() => setOpen(false)} />
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 md:ml-64">
        <div className="pt-14 md:pt-0 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
