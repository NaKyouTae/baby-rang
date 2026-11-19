"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Baby,
  Bot,
  Brain,
  ClipboardList,
  CreditCard,
  Gem,
  HelpCircle,
  Image,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  PersonStanding,
  RectangleHorizontal,
  Smile,
  Users,
  Sofa,
  BedDouble,
  Rocket,
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
  /** unused: 어드민에서 관리는 되지만 지금 앱에는 노출되지 않는 기능 */
  items: { href: string; label: string; icon: typeof LayoutDashboard; unused?: boolean }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "개요",
    items: [{ href: "/", label: "대시보드", icon: LayoutDashboard }],
  },
  {
    title: "운영",
    items: [
      { href: "/users", label: "사용자", icon: Users },
      { href: "/payments", label: "결제 내역", icon: CreditCard },
      { href: "/coins", label: "보석함", icon: Gem },
      { href: "/notices", label: "공지사항", icon: Megaphone },
      { href: "/room-items", label: "방 꾸미기 아이템", icon: Sofa },
    ],
  },
  {
    title: "모델링",
    items: [
      { href: "/rooms", label: "아기방", icon: BedDouble },
      { href: "/modeling", label: "아기 모델", icon: PersonStanding },
      { href: "/record-modeling", label: "기록 모델", icon: Smile },
    ],
  },
  {
    title: "시스템",
    items: [
      { href: "/ads", label: "광고 설정", icon: RectangleHorizontal },
      { href: "/launch-ads", label: "스플래시", icon: Rocket },
      { href: "/crawler-visits", label: "AI 크롤러 유입", icon: Bot },
    ],
  },
  {
    // 어드민에서 관리는 되지만 지금 앱에는 노출되지 않는 기능
    title: "미사용",
    items: [
      { href: "/banners", label: "배너 관리", icon: Image, unused: true },
      { href: "/tests", label: "테스트 관리", icon: ListChecks, unused: true },
      { href: "/faqs", label: "자주 묻는 질문", icon: HelpCircle, unused: true },
      { href: "/nursing-rooms", label: "수유실 관리", icon: Baby, unused: true },
      { href: "/temperament/questions", label: "기질 검사 문항", icon: ClipboardList, unused: true },
      { href: "/temperament/results", label: "기질 검사 결과", icon: Brain, unused: true },
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
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-2 mb-1 text-xs font-medium text-sidebar-foreground/60">
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
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                    )}
                  />
                  <span className={cn("truncate", n.unused && "text-sidebar-foreground/60")}>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-logo.png" alt="베이비룸" width={28} height={28} className="rounded-md" />
          <span className="text-sm font-semibold text-foreground">베이비룸 어드민</span>
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
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/95 backdrop-blur px-4">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-logo.png" alt="베이비룸" width={28} height={28} />
          <span className="font-semibold text-sm">베이비룸 어드민</span>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/header-logo.png" alt="베이비룸" width={32} height={32} />
              베이비룸 어드민
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
      <main className="flex-1 min-w-0 md:ml-60">
        <div className="pt-14 md:pt-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
