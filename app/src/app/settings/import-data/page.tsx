"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChildren } from "@/hooks/useChildren";
import { TYPE_CONFIG, GrowthType } from "@/app/growth-record/types";
import { palette } from "@/lib/colors";

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

export default function ImportDataPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { children, isLoaded } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState("");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  // 첫 아이 자동 선택
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
  };

  const handleImport = async () => {
    if (!selectedChildId || records.length === 0) return;
    setUploading(true);
    setResult(null);
    try {
      const payload = records.map((r) => ({
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
    <div className="absolute inset-0 z-50 flex flex-col bg-gray-50 px-6">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center h-12 px-6 bg-white border-b border-gray-100 -mx-6"
        style={{ paddingTop: "var(--safe-area-top)" }}>
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.gray600} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[15px] font-semibold text-gray-900">
          데이터 가져오기
        </h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto py-5 space-y-4">
        {/* 아이 선택 */}
        {isLoaded && children.length > 1 && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이 선택
            </label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 bg-white"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 파일 첨부 */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            파일 첨부
          </label>
          <p className="text-xs text-gray-400 mb-3">
            txt 형식의 기록 파일을 선택해주세요.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 active:bg-gray-50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {fileName || "파일 선택"}
          </button>
        </div>

        {/* 미리보기 - 카테고리별 요약 */}
        {records.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">
                총 <span className="text-primary-600 font-bold">{records.length}</span>건의 기록
              </p>
            </div>
            <div className="px-4 py-3 space-y-2">
              {Object.entries(
                records.reduce<Record<GrowthType, number>>((acc, r) => {
                  acc[r.type] = (acc[r.type] || 0) + 1;
                  return acc;
                }, {} as Record<GrowthType, number>)
              ).map(([type, count]) => {
                const cfg = TYPE_CONFIG[type as GrowthType];
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}건</span>
                  </div>
                );
              })}
            </div>
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
      <div className="shrink-0 pb-[calc(var(--safe-area-bottom)+16px)] pt-3 bg-gray-50 border-t border-gray-100 -mx-6 px-6">
        {result ? (
          <button
            onClick={() => router.push("/growth-record")}
            className="w-full rounded-xl bg-primary-500 py-3.5 text-[15px] font-semibold text-white active:bg-primary-600 transition-colors"
          >
            기록 확인하기
          </button>
        ) : (
          <button
            onClick={handleImport}
            disabled={uploading || records.length === 0 || !selectedChildId}
            className="w-full rounded-xl bg-primary-500 py-3.5 text-[15px] font-semibold text-white disabled:opacity-40 active:bg-primary-600 transition-colors"
          >
            {uploading ? "가져오는 중..." : `${records.length}건 가져오기`}
          </button>
        )}
      </div>
    </div>
  );
}
