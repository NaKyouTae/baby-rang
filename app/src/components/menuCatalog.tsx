import type { ReactNode } from "react";

export type MenuId =
  | "nursing-room"
  | "library"
  | "temperament"
  | "wonder-weeks"
  | "sleep-golden-time"
  | "growth-record"
  | "growth-pattern";

export type MenuItem = {
  id: MenuId;
  label: string;
  href: string;
  icon: (active: boolean, activeColor?: string) => ReactNode;
};

const stroke = (active: boolean, activeColor = "#222222") =>
  active ? activeColor : "#9ca3af";

export const MENU_CATALOG: Record<MenuId, MenuItem> = {
  "nursing-room": {
    id: "nursing-room",
    label: "수유실",
    href: "/nursing-room",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  library: {
    id: "library",
    label: "도서관",
    href: "/library",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </svg>
    ),
  },
  temperament: {
    id: "temperament",
    label: "기질검사",
    href: "/temperament",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 8h16" />
        <path d="M8 4v4" />
        <path d="M7 13l2 2 4-5" />
        <path d="M16.5 12.5l-2 6" />
      </svg>
    ),
  },
  "wonder-weeks": {
    id: "wonder-weeks",
    label: "원더윅스",
    href: "/wonder-weeks",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M7 14h2" />
        <path d="M11 14h2" />
        <path d="M15 14h2" />
        <path d="M7 18h2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  "sleep-golden-time": {
    id: "sleep-golden-time",
    label: "수면코칭",
    href: "/sleep-golden-time",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  "growth-record": {
    id: "growth-record",
    label: "기록",
    href: "/growth-record",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-6" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  "growth-pattern": {
    id: "growth-pattern",
    label: "패턴",
    href: "/growth-pattern",
    icon: (active, activeColor) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active, activeColor)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
  },
};

export const ALL_MENU_IDS: MenuId[] = [
  "nursing-room",
  "library",
  "temperament",
  "wonder-weeks",
  "sleep-golden-time",
  "growth-record",
  "growth-pattern",
];

export const HOME_QUICK_MENUS: MenuId[] = [
  "growth-record",
  "growth-pattern",
  "nursing-room",
  "library",
  "wonder-weeks",
  "sleep-golden-time",
];
