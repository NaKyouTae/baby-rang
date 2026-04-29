"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChildren } from "@/hooks/useChildren";
import { TYPE_CONFIG, GrowthType } from "@/app/growth-record/types";
import { palette } from "@/lib/colors";
import PageHeader from "@/components/PageHeader";

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
  우유: "MILK",
  물: "WATER",
  병원: "HOSPITAL",
  체온: "TEMPERATURE",
  간식: "SNACK",
  놀이: "PLAY",
  터미타임: "TUMMY_TIME",
  기타: "ETC",
};

/* ── 배변 형태 매핑 ── */
const POOP_MAP: Record<string, string> = {
  대변: "POO",
  소변: "PEE",
  "소변+대변": "BOTH",
  둘다: "BOTH",
};

interface ParsedRecord {
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
function parseFile(text: string): ParsedRecord[] {
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

    // 우유 양
    const milkAmount = kv["우유 총 양(ml)"] ?? kv["우유양(ml)"];
    if (milkAmount) {
      const ml = parseInt(milkAmount.replace(/[^\d]/g, ""), 10);
      if (!isNaN(ml)) {
        data.amountMl = ml;
        summaryParts.push(`${ml}ml`);
      }
    }

    // 물 양
    const waterAmount = kv["물 총 양(ml)"] ?? kv["물양(ml)"];
    if (waterAmount) {
      const ml = parseInt(waterAmount.replace(/[^\d]/g, ""), 10);
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

/* ── 날짜 포맷 ── */
function formatDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

const RECORD_ICONS: Record<string, string> = {
  FORMULA: "/icon-record-formula.svg",
  BREASTFEEDING: "/icon-record-breastfeeding.svg",
  PUMPED_FEEDING: "/icon-record-pumped-feeding.svg",
  PUMPING: "/icon-record-pumping.svg",
  SLEEP: "/icon-record-sleep.svg",
  BATH: "/icon-record-bath.svg",
  MEDICATION: "/icon-record-medication.svg",
  DIAPER: "/icon-record-diaper.svg",
  BABY_FOOD: "/icon-record-baby-food.svg",
  MILK: "/icon-record-milk.svg",
  WATER: "/icon-record-water.svg",
  ETC: "/icon-record-etc.svg",
  SNACK: "/icon-record-etc.svg",
  HOSPITAL: "/icon-record-etc.svg",
  TEMPERATURE: "/icon-record-etc.svg",
  PLAY: "/icon-record-etc.svg",
  TUMMY_TIME: "/icon-record-etc.svg",
};

export default function ImportDataPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { children, isLoaded } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState("");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checkedTypes, setCheckedTypes] = useState<Set<GrowthType>>(new Set());
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  // 첫 아기 자동 선택
  if (isLoaded && children.length > 0 && !selectedChildId) {
    setSelectedChildId(children[0].id);
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const parsed = parseFile(text);
    setRecords(parsed);
    // 모든 타입 기본 체크
    const allTypes = new Set(parsed.map((r) => r.type));
    setCheckedTypes(allTypes);
  };

  const toggleType = (type: GrowthType) => {
    setCheckedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // 체크된 타입의 레코드만 필터
  const selectedRecords = records.filter((r) => checkedTypes.has(r.type));

  const handleImport = async () => {
    if (!selectedChildId || selectedRecords.length === 0) return;
    setUploading(true);
    setResult(null);
    try {
      const payload = selectedRecords.map((r) => ({
        childId: selectedChildId,
        type: r.type,
        startAt: r.startAt,
        endAt: r.endAt ?? null,
        data: Object.keys(r.data).length > 0 ? JSON.stringify(r.data) : null,
      }));
      const res = await fetch("/api/growth-records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        alert("가져오기 중 오류가 발생했어요.");
      }
    } catch {
      alert("가져오기 중 오류가 발생했어요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader title="데이터 가져오기" variant="back" />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-5 space-y-4">
        {/* 아기 선택 */}
        {isLoaded && children.length > 1 && (
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full h-[44px] rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm font-medium text-black"
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {/* 파일 선택 */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`w-full h-[44px] rounded-lg border border-gray-200 bg-white px-4 text-sm text-center ${fileName ? 'font-medium text-black' : 'font-normal text-gray-400'}`}
          >
            {fileName || ".txt 형식의 기록 파일을 선택해 주세요."}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2.5 w-full h-8 rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
          >
            파일 선택
          </button>
        </div>

        {/* 미리보기 - 카테고리별 요약 */}
        {records.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-normal text-gray-500 mb-2.5">
              총 <span className="font-semibold" style={{ color: palette.teal }}>{records.length}</span>건의 기록
            </p>
            <ul className="space-y-2.5">
              {Object.entries(
                records.reduce<Record<GrowthType, number>>((acc, r) => {
                  acc[r.type] = (acc[r.type] || 0) + 1;
                  return acc;
                }, {} as Record<GrowthType, number>)
              ).map(([type, count]) => {
                const t = type as GrowthType;
                const cfg = TYPE_CONFIG[t];
                const checked = checkedTypes.has(t);
                const iconSrc = RECORD_ICONS[t] ?? RECORD_ICONS.ETC;
                return (
                  <li
                    key={type}
                    onClick={() => toggleType(t)}
                    className="flex items-center gap-3 h-16 rounded-lg border border-gray-200 bg-gray-100 px-4 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white overflow-hidden" style={{ border: `1px solid ${palette.teal}` }}>
                      <img src={iconSrc} alt={cfg.label} width={24} height={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-medium text-black">{cfg.label}</p>
                      <p className="text-xs mt-1.5">
                        <span className="font-semibold" style={{ color: palette.teal }}>{count}</span>
                        <span className="font-normal text-gray-500">건</span>
                      </p>
                    </div>
                    {checked ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <rect width="16" height="16" rx="8" fill="#3078C9"/>
                        <path d="M4 7.36957L7.48559 10.5L12 5.5" stroke="#FDFDFE" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 17 17" fill="none" className="shrink-0">
                        <rect x="0.5" y="0.5" width="16" height="16" rx="8" fill="#FDFDFE"/>
                        <rect x="0.5" y="0.5" width="16" height="16" rx="8" stroke="#EEF0F1" strokeLinejoin="bevel"/>
                        <path d="M4.5 7.86957L7.98559 11L12.5 6" stroke="#808991" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              가져오기 완료
            </p>
            <p className="text-xs text-green-600 mt-1">
              총 {result.total}건 중 {result.success}건 성공
              {result.failed > 0 && `, ${result.failed}건 실패`}
            </p>
          </div>
        )}
      </div>

      {/* 하단 CTA 버튼 */}
      {(result || records.length > 0) && (
        <div className="shrink-0 mb-24 pt-3 px-5">
          {result ? (
            <button
              onClick={() => router.push("/growth-record")}
              className="w-full h-[44px] rounded-lg font-semibold text-sm text-white active:opacity-80 transition-colors"
              style={{ backgroundColor: palette.teal }}
            >
              기록 확인하기
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={uploading || selectedRecords.length === 0 || !selectedChildId}
              className="w-full h-[44px] rounded-lg font-semibold text-sm text-white disabled:opacity-40 active:opacity-80 transition-colors"
              style={{ backgroundColor: palette.teal }}
            >
              {uploading ? "가져오는 중..." : `${selectedRecords.length}건 가져오기`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
