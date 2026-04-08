"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "대시보드", icon: "📊" },
  { href: "/banners", label: "배너 관리", icon: "🖼️" },
  { href: "/notices", label: "공지사항", icon: "📢" },
  { href: "/nursing-rooms", label: "수유실 관리", icon: "🍼" },
  { href: "/temperament/questions", label: "기질 검사 문항", icon: "📝" },
  { href: "/temperament/results", label: "기질 검사 결과", icon: "🧠" },
  { href: "/users", label: "사용자", icon: "👤" },
  { href: "/payments", label: "결제 내역", icon: "💳" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 h-14 sticky top-0 z-20">
        <button
          onClick={() => setOpen(true)}
          aria-label="menu"
          className="p-2 -ml-2"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="font-semibold text-gray-900">아기랑 어드민</div>
        <button onClick={logout} className="text-xs text-gray-500">로그아웃</button>
      </header>

      {/* Sidebar (desktop) / Drawer (mobile) */}
      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r border-gray-200 transition-transform md:flex md:flex-col`}
      >
        <div className="hidden md:flex items-center h-16 px-6 border-b border-gray-200">
          <div className="font-bold text-gray-900">아기랑 어드민</div>
        </div>
        <div className="flex md:hidden items-center justify-between h-14 px-4 border-b border-gray-200">
          <div className="font-bold text-gray-900">아기랑 어드민</div>
          <button onClick={() => setOpen(false)} className="p-2 -mr-2" aria-label="close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${
                isActive(n.href)
                  ? "bg-gray-900 text-white font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="hidden md:block m-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl text-left"
        >
          로그아웃
        </button>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-20"
        />
      )}

      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
