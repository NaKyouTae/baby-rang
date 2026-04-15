import type { ReactNode } from "react";
import {
  NursingRoomNavIcon,
  TemperamentNavIcon,
  WonderWeeksNavIcon,
  SleepNavIcon,
  GrowthRecordNavIcon,
  GrowthPatternNavIcon,
  AirQualityNavIcon,
} from "./nav-icons";

export type MenuId =
  | "nursing-room"
  | "temperament"
  | "wonder-weeks"
  | "sleep-golden-time"
  | "growth-record"
  | "growth-pattern"
  | "air-quality";

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
    label: "기질검사",
    href: "/temperament",
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
};

export const ALL_MENU_IDS: MenuId[] = [
  "nursing-room",
  "temperament",
  "wonder-weeks",
  "sleep-golden-time",
  "growth-record",
  "growth-pattern",
  "air-quality",
];

export const HOME_QUICK_MENUS: MenuId[] = [
  "growth-record",
  "growth-pattern",
  "nursing-room",
  "air-quality",
  "wonder-weeks",
  "sleep-golden-time",
];
