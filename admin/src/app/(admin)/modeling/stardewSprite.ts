/**
 * 스타듀밸리풍 아기 시안 — 픽셀을 손으로 한 점씩 찍은 그림.
 *
 * 코드로 원·캡슐을 계산해 그리는 babySprite 와 달리, 아래 글자 지도가 곧 그림이다(글자 하나 = 픽셀 하나).
 * 크기는 16×25 로 방 타일 1칸 너비에 1.5칸 남짓 높이, 방과 같은 굵은 픽셀이다.
 *   - 외곽선은 검정이 아니라 재질마다 가장 어두운 색
 *   - 그늘은 붉은·보라 쪽, 빛은 노란 쪽으로 색조를 비튼 3~4단 명암
 *   - 눈은 1×2 점, 입 대신 노란 쪽쪽이(색 고정)
 * 옷은 기본 옷인 나시 바디슈트. 걸음마 아기 앞모습(서 있기·걷기 4프레임)만 있고 어드민 시안 보기에서만 쓴다.
 */

export const SD_W = 16;
export const SD_H = 25;

const PAL: Record<string, string> = {"K": "#3A1E17", "h": "#5E3424", "H": "#8A5634", "L": "#B98250", "k": "#8E4B3A", "s": "#E39B7B", "S": "#F8C9A2", "l": "#FFE3C6", "E": "#2B1A1D", "W": "#FFFFFF", "P": "#F28B86", "N": "#2F3F7A", "b": "#5B7FC4", "B": "#82B4E6", "V": "#B4DCF7", "n": "#5F5A78", "f": "#C7C3DA", "F": "#F6F3EC", "Y": "#FFCF3A", "y": "#E2881A", "w": "#FFF4B8"};

/** 여아는 옷 색만 분홍으로 바꾼다 — 머리 장식은 달지 않는다 */
const FEMALE: Record<string, string> = { N: "#7A2F55", b: "#D8799E", B: "#F5A9C4", V: "#FCD3E2" };

const HEAD = [
  ".....KKKKKK.....",
  "...KKHHLLHHKK...",
  "..KHHLLHHHHHhK..",
  ".KHHLHHHHHHHhhK.",
  ".KHHHHHHHHHHhhK.",
  ".KhHHhHHHhHHhhK.",
  ".KhShhSHhSShhhK.",
  ".kSSSSSSSSSSShk.",
  ".kSSESSSSSESSsk.",
  "ksSSESSSSSESSssk",
  ".kSPSSyyyySPSsk.",
  "..kSSyYwYYySsk..",
  "...kkyYYYYykk...",
  "......yyyy......",
];


/** 둥근 콩 모양 몸에 나시 바디슈트 — 팔·다리·발은 맨살 */
const BODY = [
  ".....NVBBbN.....",
  "...NNVBBBBbbN...",
  "..kSNVBBBBBbNsk.",
  "..kSNBBBBBBbNsk.",
  "..kSSNBBBBbbNSsk",
  "...kkNBBBBbbNkk.",
  "....NbBBBBbbN...",
];

/** 발을 들 때 디딘 다리가 한 줄 길어진다(몸이 1px 위로 튄다) */
const LEG_EXT = ".....kSskSsk....";

const LEGS: Record<"stand" | "left" | "right", string[]> = {
  stand: [
    ".....kSskSsk....",
    "....kSSskSSsk...",
    "....kkkk.kkkk...",
  ],
  left: [
    ".....kSskSsk....",
    ".....kkk.kSSsk..",
    ".........kkkk...",
  ],
  right: [
    ".....kSskSsk....",
    "....kSSskkkk....",
    "....kkkk........",
  ],
};

export type SdFrame = { w: number; h: number; data: Uint8ClampedArray };

function frame(legs: keyof typeof LEGS, bob: boolean, gender: "male" | "female"): SdFrame {
  const top = [...HEAD, ...BODY];
  const rows = [...(bob ? [...top, LEG_EXT] : ["................", ...top]), ...LEGS[legs]];
  const pal = gender === "female" ? { ...PAL, ...FEMALE } : PAL;
  const data = new Uint8ClampedArray(SD_W * SD_H * 4);
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      const hex = pal[c];
      if (!hex) return;
      const i = (y * SD_W + x) * 4;
      data[i] = parseInt(hex.slice(1, 3), 16);
      data[i + 1] = parseInt(hex.slice(3, 5), 16);
      data[i + 2] = parseInt(hex.slice(5, 7), 16);
      data[i + 3] = 255;
    });
  });
  return { w: SD_W, h: SD_H, data };
}

/** 서 있기 */
export const sdStand = (gender: "male" | "female") => frame("stand", false, gender);

/** 걷기 4프레임 — 왼발 들기 → 디딤 → 오른발 들기 → 디딤 */
export const sdWalk = (gender: "male" | "female") => [
  frame("left", true, gender),
  frame("stand", false, gender),
  frame("right", true, gender),
  frame("stand", false, gender),
];
