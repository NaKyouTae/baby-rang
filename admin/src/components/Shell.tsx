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
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavSection = {
  title: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "개요",
    items: [{ href: "/", label: "대시보드", icon: LayoutDashboard }],
  },
  {
    title: "콘텐츠",
    items: [
      { href: "/banners", label: "배너 관리", icon: Image },
      { href: "/tests", label: "테스트 관리", icon: ListChecks },
      { href: "/notices", label: "공지사항", icon: Megaphone },
      { href: "/nursing-rooms", label: "수유실 관리", icon: Baby },
    ],
  },
  {
    title: "기질 검사",
    items: [
      { href: "/temperament/questions", label: "검사 문항", icon: ClipboardList },
      { href: "/temperament/results", label: "검사 결과", icon: Brain },
    ],
  },
  {
    title: "운영",
    items: [
      { href: "/users", label: "사용자", icon: Users },
      { href: "/payments", label: "결제 내역", icon: CreditCard },
    ],
  },
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
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[hsl(212_25%_97%)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar-background">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            아
          </div>
          <span className="font-bold text-base text-foreground">아기랑 어드민</span>
        </div>
        <NavItems />
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar-background/95 backdrop-blur px-4">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
            아
          </div>
          <span className="font-semibold text-sm">아기랑 어드민</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Mobile Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-sidebar-border">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                아
              </div>
              아기랑 어드민
            </SheetTitle>
          </SheetHeader>
          <NavItems onNavigate={() => setOpen(false)} />
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
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
        <div className="pt-14 md:pt-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
