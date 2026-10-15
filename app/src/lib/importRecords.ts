/**
 * 다른 육아 앱에서 내보낸 .txt 기록을 아기랑 성장 기록으로 바꾼다.
 * /settings/import-data 와 다마고치 화면의 데이터 가져오기가 함께 쓴다.
 */
import { TYPE_CONFIG, type GrowthType } from "@/app/growth-record/types";

/* ── 한글 라벨 → GrowthType 매핑 ── */
const LABEL_TO_TYPE: Record<string, GrowthType> = {
  분유: "FORMULA",
  분유수유: "FORMULA",
  모유수유: "BREASTFEEDING",
  유축수유: "PUMPED_FEEDING",
  유축: "PUMPING",
  수면: "SLEEP",
  낮잠: "SLEEP",
  밤잠: "SLEEP",
  목욕: "BATH",
  투약: "MEDICATION",
  기저귀: "DIAPER",
  이유식: "BABY_FOOD",
  병원: "HOSPITAL",
  체온: "TEMPERATURE",
  간식: "SNACK",
  놀이: "PLAY",
  터미타임: "TUMMY_TIME",
};

/* ── 배변 형태 매핑 ── */
const POOP_MAP: Record<string, string> = {
  대변: "POO",
  소변: "PEE",
  "소변+대변": "BOTH",
  둘다: "BOTH",
};

export interface ParsedRecord {
  type: GrowthType;
  typeLabel: string;
  startAt: string;
  endAt?: string;
  data: Record<string, unknown>;
  summary: string;
}

/* ── 날짜 파싱: "2026-04-01 07:55 AM" → ISO ── */
function parseDateTime(raw: string): string {
  const m = raw.trim().match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );
  if (!m) return new Date(raw).toISOString();
  const [, date, hStr, min, ampm] = m;
  let h = parseInt(hStr, 10);
  if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
  if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
  return new Date(
    `${date}T${String(h).padStart(2, "0")}:${min}:00+09:00`
  ).toISOString();
}

/* ── 파일 파싱 ── */
export function parseFile(text: string): ParsedRecord[] {
  const blocks = text
    .split(/={10,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const records: ParsedRecord[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // 첫 줄: 날짜 (또는 날짜 ~ 날짜)
    const timeLine = lines[0];
    let startAt: string;
    let endAt: string | undefined;

    if (timeLine.includes("~")) {
      const [s, e] = timeLine.split("~").map((t) => t.trim());
      startAt = parseDateTime(s);
      endAt = parseDateTime(e);
    } else {
      startAt = parseDateTime(timeLine);
    }

    // 나머지 줄에서 key: value 추출
    const kv: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const colonIdx = lines[i].indexOf(":");
      if (colonIdx === -1) continue;
      const key = lines[i].slice(0, colonIdx).trim();
      const val = lines[i].slice(colonIdx + 1).trim();
      kv[key] = val;
    }

    const rawType = kv["기록 종류"] ?? "";
    const type = LABEL_TO_TYPE[rawType];
    if (!type) continue;

    const data: Record<string, unknown> = {};
    const summaryParts: string[] = [];

    // 수면 종류 판별
    if (type === "SLEEP") {
      if (rawType === "낮잠") {
        data.kind = "NAP";
        summaryParts.push("낮잠");
      } else if (rawType === "밤잠") {
        data.kind = "NIGHT";
        summaryParts.push("밤잠");
      } else {
        data.kind = "NAP";
        summaryParts.push("수면");
      }
    }

    // 기저귀
    if (kv["배변 형태"]) {
      const kind = POOP_MAP[kv["배변 형태"]] ?? "PEE";
      data.kind = kind;
      summaryParts.push(kv["배변 형태"]);
    }

    // 분유 양
    const formulaAmount = kv["분유 총 양(ml)"];
    if (formulaAmount) {
      const ml = parseInt(formulaAmount.replace(/[^\d]/g, ""), 10);
      if (!isNaN(ml)) {
        data.amountMl = ml;
        summaryParts.push(`${ml}ml`);
      }
    }

    // 이유식
    if (kv["메뉴"]) {
      data.menu = kv["메뉴"];
      summaryParts.push(kv["메뉴"]);
    }
    const babyFoodAmount = kv["먹은 양(g)"] ?? kv["이유식양(g)"];
    if (babyFoodAmount) {
      const g = parseInt(babyFoodAmount.replace(/[^\d]/g, ""), 10);
      if (!isNaN(g)) {
        data.amountG = g;
        summaryParts.push(`${g}g`);
      }
    }

    // 체온
    if (kv["체온(℃)"] ?? kv["체온"]) {
      const raw = kv["체온(℃)"] ?? kv["체온"];
      const temp = parseFloat(raw.replace(/[^\d.]/g, ""));
      if (!isNaN(temp)) {
        data.tempC = temp;
        summaryParts.push(`${temp}℃`);
      }
    }

    // 투약
    if (kv["약 이름"]) {
      data.name = kv["약 이름"];
      summaryParts.push(kv["약 이름"]);
    }
    if (kv["용량"]) {
      data.dose = kv["용량"];
      summaryParts.push(kv["용량"]);
    }

    // 모유수유
    if (kv["왼쪽(분)"] ?? kv["왼쪽"]) {
      const min = parseInt((kv["왼쪽(분)"] ?? kv["왼쪽"]).replace(/[^\d]/g, ""), 10);
      if (!isNaN(min)) {
        data.leftMin = min;
        summaryParts.push(`좌 ${min}분`);
      }
    }
    if (kv["오른쪽(분)"] ?? kv["오른쪽"]) {
      const min = parseInt((kv["오른쪽(분)"] ?? kv["오른쪽"]).replace(/[^\d]/g, ""), 10);
      if (!isNaN(min)) {
        data.rightMin = min;
        summaryParts.push(`우 ${min}분`);
      }
    }

    // 소요시간 → endAt 계산 (endAt가 없을 때)
    if (!endAt && kv["소요시간"]) {
      const mins = parseInt(kv["소요시간"].replace(/[^\d]/g, ""), 10);
      if (!isNaN(mins)) {
        endAt = new Date(
          new Date(startAt).getTime() + mins * 60 * 1000
        ).toISOString();
        summaryParts.push(`${mins}분`);
      }
    }

    // endAt가 있으면 소요시간 표시
    if (endAt && !summaryParts.some((p) => p.includes("분"))) {
      const mins = Math.round(
        (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000
      );
      if (mins > 0) summaryParts.push(`${mins}분`);
    }

    const cfg = TYPE_CONFIG[type];
    records.push({
      type,
      typeLabel: `${cfg.emoji} ${cfg.label}`,
      startAt,
      endAt,
      data,
      summary: summaryParts.join(" · "),
    });
  }

  return records;
}
