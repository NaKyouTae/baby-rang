"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";

interface Library {
  name: string;
  region: string;
  district: string;
  type: string;
  code: number;
  books: number;
  librarians: number;
  borrowers: number;
  loans: number;
  budget: number;
  year: number;
  address?: string;
  openHours?: string;
  closedDays?: string;
  homepage?: string;
  established?: number;
}

const REGIONS = [
  "전체",
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

const TYPE_LABELS: Record<string, string> = {
  LIBTYPE000002: "공공도서관",
  LIBTYPE000003: "어린이도서관",
  LIBTYPE000004: "작은도서관",
  LIBTYPE000005: "장애인도서관",
  LIBTYPE000006: "병영도서관",
  LIBTYPE000007: "교도소도서관",
};

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

function LibraryContent() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedCode, setExpandedCode] = useState<number | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const PER_PAGE = 100;

  const fetchLibraries = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          perPage: String(PER_PAGE),
        });
        if (selectedRegion !== "전체") params.set("region", selectedRegion);
        if (searchQuery.trim()) params.set("query", searchQuery.trim());

        const res = await fetch(`/api/libraries?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const newLibs: Library[] = data.libraries ?? [];
        setLibraries((prev) => (append ? [...prev, ...newLibs] : newLibs));
        setTotalCount(data.totalCount ?? 0);
        setHasMore(newLibs.length === PER_PAGE);
      } catch (e: any) {
        setError(e.message || "데이터를 불러올 수 없어요");
      } finally {
        setLoading(false);
      }
    },
    [selectedRegion, searchQuery],
  );

  useEffect(() => {
    setPage(1);
    setExpandedCode(null);
    fetchLibraries(1, false);
  }, [fetchLibraries]);

  // 무한 스크롤
  useEffect(() => {
    if (!observerRef.current || !hasMore || loading) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const next = page + 1;
          setPage(next);
          fetchLibraries(next, true);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(observerRef.current);
    return () => io.disconnect();
  }, [hasMore, loading, page, fetchLibraries]);

  // 검색 디바운스
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLibraries(1, false);
    }, 300);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* 헤더 */}
      <div
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100"
        style={{ paddingTop: "var(--safe-area-top)" }}
      >
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-lg font-bold text-gray-900">도서관</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            전국 공공도서관 {totalCount > 0 ? `${formatNumber(totalCount)}곳` : ""}
          </p>
        </div>

        {/* 검색바 */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3.5 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="도서관명 또는 지역 검색"
              className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-white"
                aria-label="지우기"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 지역 필터 칩 */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedRegion === region
                  ? "bg-amber-400 text-white"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* 도서관 리스트 */}
      <div className="flex-1 px-4 pt-3 pb-28 space-y-3">
        {error && (
          <div className="flex flex-col items-center gap-2 py-12">
            <p className="text-sm text-gray-500">{error}</p>
            <button
              onClick={() => fetchLibraries(1, false)}
              className="px-4 py-2 rounded-xl bg-amber-400 text-white text-sm font-semibold"
            >
              다시 시도
            </button>
          </div>
        )}

        {!error && !loading && libraries.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">검색 결과가 없어요</p>
          </div>
        )}

        {libraries.map((lib, idx) => {
          const isExpanded = expandedCode === lib.code;
          const hasDetail = lib.address || lib.openHours || lib.closedDays || lib.homepage;
          return (
            <div
              key={`${lib.code}-${idx}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                type="button"
                className="w-full text-left p-4"
                onClick={() => setExpandedCode(isExpanded ? null : lib.code)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[15px] text-gray-900 truncate">
                      {lib.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lib.region} {lib.district}
                      {TYPE_LABELS[lib.type] && (
                        <span className="ml-1.5 text-amber-600">
                          · {TYPE_LABELS[lib.type]}
                        </span>
                      )}
                    </p>
                    {lib.address && (
                      <p className="text-[11px] text-gray-400 mt-1 truncate">
                        {lib.address}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className="text-2xl">📚</span>
                    {hasDetail && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <StatItem label="장서수" value={formatNumber(lib.books)} unit="권" />
                  <StatItem label="대출" value={formatNumber(lib.loans)} unit="권" />
                  <StatItem label="이용자" value={formatNumber(lib.borrowers)} unit="명" />
                </div>
              </button>

              {/* 상세 정보 (펼침) */}
              {isExpanded && hasDetail && (
                <div className="px-4 pb-4 pt-0 space-y-2.5 border-t border-gray-50">
                  <div className="pt-3" />

                  {lib.address && (
                    <InfoRow
                      icon={<LocationIcon />}
                      text={lib.address}
                    />
                  )}

                  {lib.openHours && (
                    <InfoRow
                      icon={<ClockIcon />}
                      label="운영시간"
                      text={lib.openHours}
                    />
                  )}

                  {lib.closedDays && (
                    <InfoRow
                      icon={<CalendarIcon />}
                      label="휴관일"
                      text={lib.closedDays}
                    />
                  )}

                  {lib.established && (
                    <InfoRow
                      icon={<BuildingIcon />}
                      text={`${lib.established}년 설립`}
                    />
                  )}

                  {lib.homepage && (
                    <a
                      href={lib.homepage.startsWith("http") ? lib.homepage : `https://${lib.homepage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-500 font-medium pt-1"
                    >
                      <LinkIcon />
                      <span className="truncate underline underline-offset-2 decoration-blue-200">
                        홈페이지 방문
                      </span>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {hasMore && !loading && <div ref={observerRef} className="h-1" />}
      </div>
    </div>
  );
}

function StatItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">
        {value}
        <span className="text-[10px] text-gray-400 font-normal ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

function InfoRow({ icon, label, text }: { icon: React.ReactNode; label?: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        {label && <p className="text-[10px] text-gray-400 font-medium">{label}</p>}
        <p className="text-sm text-gray-700 leading-relaxed break-keep">{text}</p>
      </div>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22V12h6v10" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
