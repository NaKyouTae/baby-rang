import type { ReactNode } from "react";
import {
  NursingRoomNavIcon,
  TemperamentNavIcon,
  WonderWeeksNavIcon,
  SleepNavIcon,
  GrowthRecordNavIcon,
  GrowthPatternNavIcon,
  AirQualityNavIcon,
  PhysicalGrowthNavIcon,
} from "./nav-icons";

export type MenuId =
  | "nursing-room"
  | "temperament"
  | "wonder-weeks"
  | "sleep-golden-time"
  | "growth-record"
  | "growth-pattern"
  | "air-quality"
  | "physical-growth";

export type MenuItem = {
  id: MenuId;
  label: string;
  href: string;
  icon: (active: boolean, activeColor?: string) => ReactNode;
};

export const MENU_CATALOG: Record<MenuId, MenuItem> = {
  "nursing-room": {
    id: "nursing-room",
    label: "수유실",
    href: "/nursing-room",
    icon: (active, activeColor) => <NursingRoomNavIcon active={active} colorOverride={activeColor} />,
  },
  temperament: {
    id: "temperament",
    label: "테스트",
    href: "/tests",
    icon: (active, activeColor) => <TemperamentNavIcon active={active} colorOverride={activeColor} />,
  },
  "wonder-weeks": {
    id: "wonder-weeks",
    label: "원더윅스",
    href: "/wonder-weeks",
    icon: (active, activeColor) => <WonderWeeksNavIcon active={active} colorOverride={activeColor} />,
  },
  "sleep-golden-time": {
    id: "sleep-golden-time",
    label: "수면추천",
    href: "/sleep-golden-time",
    icon: (active, activeColor) => <SleepNavIcon active={active} colorOverride={activeColor} />,
  },
  "growth-record": {
    id: "growth-record",
    label: "기록",
    href: "/growth-record",
    icon: (active, activeColor) => <GrowthRecordNavIcon active={active} colorOverride={activeColor} />,
  },
  "growth-pattern": {
    id: "growth-pattern",
    label: "패턴",
    href: "/growth-pattern",
    icon: (active, activeColor) => <GrowthPatternNavIcon active={active} colorOverride={activeColor} />,
  },
  "air-quality": {
    id: "air-quality",
    label: "미세먼지",
    href: "/air-quality",
    icon: (active, activeColor) => <AirQualityNavIcon active={active} colorOverride={activeColor} />,
  },
  "physical-growth": {
    id: "physical-growth",
    label: "성장",
    href: "/physical-growth",
    icon: (active, activeColor) => <PhysicalGrowthNavIcon active={active} colorOverride={activeColor} />,
  },
};

export const ALL_MENU_IDS: MenuId[] = [
  "growth-record",
  "growth-pattern",
  "physical-growth",
  "wonder-weeks",
  "sleep-golden-time",
  "nursing-room",
  "temperament",
  "air-quality",
];

export const DEFAULT_NAV_SLOTS: (MenuId | null)[] = [
  "growth-record",
  "growth-pattern",
  "physical-growth",
  null,
];

export const HOME_QUICK_MENUS: MenuId[] = [
  "growth-record",
  "growth-pattern",
  "physical-growth",
  "wonder-weeks",
  "sleep-golden-time",
];

// 홈 경로 — 초기 화면 기본값.
export const HOME_HREF = "/home";

// 초기 화면(첫 진입) 설정에서 선택 가능한 메뉴 순서.
// 기록 → 패턴 → 수유실 → 성장 → 원더윅스 → 수면추천 → 미세먼지
export const INITIAL_SCREEN_MENUS: MenuId[] = [
  "growth-record",
  "growth-pattern",
  "nursing-room",
  "physical-growth",
  "wonder-weeks",
  "sleep-golden-time",
  "air-quality",
];

// 초기 화면 설정값('home' | MenuId)을 실제 라우트 경로로 변환한다.
export function resolveHomeTargetHref(target: string): string {
  if (target === "home") return HOME_HREF;
  const item = MENU_CATALOG[target as MenuId];
  return item ? item.href : HOME_HREF;
}

// 초기 화면 설정값('home' | MenuId)을 표시용 라벨로 변환한다.
export function resolveHomeTargetLabel(target: string): string {
  if (target === "home") return "홈";
  const item = MENU_CATALOG[target as MenuId];
  return item ? item.label : "홈";
}
