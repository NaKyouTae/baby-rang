"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/Modal";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { DataTable, SortHeader, StatStrip } from "@/components/data-table";

export type UserRow = {
  id: string;
  // 소셜(카카오/네이버) 동의항목으로 받은 값. 서비스 안에서 입력받는 항목이 아니다.
  name: string | null;
  phone: string | null;
  gender: string | null;
  ageRange: string | null;
  email: string | null;
  profileImage: string | null;
  parentRole: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  /** 속한 가족(그룹)들의 아이 수 합계. 목록 응답에만 있다. */
  childCount?: number;
  _count: { groupMemberships: number; payments: number };
};

type ActivityItem = { kind: string; label: string; at: string };

type Account = { provider: string; createdAt: string };
type ChildRow = {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  profileImage: string | null;
};
type Membership = {
  id: string;
  joinedAt: string;
  group: { id: string; code: string; children: ChildRow[] };
};
type PaymentRow = {
  id: string;
  orderId: string;
  productName: string;
  productType: string;
  amount: number;
  status: string;
  createdAt: string;
};
type UserDetail = UserRow & {
  onboardedAt: string | null;
  updatedAt: string;
  termsAgreedAt: string | null;
  privacyAgreedAt: string | null;
  marketingAgreedAt: string | null;
  thirdPartyAgreedAt: string | null;
  recentActivity: ActivityItem[];
  accounts: Account[];
  groupMemberships: Membership[];
  payments: PaymentRow[];
};

const ROLE_LABELS: Record<string, string> = {
  mom: "엄마",
  dad: "아빠",
  grandmother: "할머니",
  grandfather: "할아버지",
  caregiver: "양육자",
  other: "기타",
};

const PROVIDER_LABELS: Record<string, string> = {
  KAKAO: "카카오",
  GOOGLE: "구글",
  NAVER: "네이버",
  APPLE: "애플",
};

const GENDER_LABELS: Record<string, string> = {
  male: "남아",
  female: "여아",
  boy: "남아",
  girl: "여아",
};

const PAYMENT_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "info" }
> = {
  PAID: { label: "결제완료", variant: "success" },
  PENDING: { label: "대기", variant: "warning" },
  FAILED: { label: "실패", variant: "destructive" },
  CANCELLED: { label: "취소", variant: "secondary" },
  REFUNDED: { label: "환불", variant: "info" },
  PARTIAL_REFUNDED: { label: "부분환불", variant: "info" },
};

function roleLabel(role: string | null) {
  if (!role) return "-";
  return ROLE_LABELS[role] ?? role;
}

// 소셜에서 받은 값의 표기. 저장 형식은 서버에서 한 가지로 통일해 둔다
// (server/src/auth/social-profile.ts). 가운데 자리는 가려서 보여준다(010-****-5678).
function fmtPhone(phone: string | null | undefined) {
  if (!phone) return "-";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-****-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-***-${d.slice(6)}`;
  return phone.replace(/\d(?=\d{4})/g, "*");
}

function genderLabel(gender: string | null | undefined) {
  if (gender === "male") return "남성";
  if (gender === "female") return "여성";
  // 선택 동의항목이라 비어 있는 것이 정상이다. 결측과 구분해 보여준다.
  return "미제공";
}

function ageRangeLabel(ageRange: string | null | undefined) {
  if (!ageRange) return "미제공";
  const start = ageRange.split("-")[0];
  if (!start) return "미제공";
  return ageRange.endsWith("-") ? `${start}대 이상` : `${start}대`;
}


// "3일 전"처럼 상대 시각으로 표기. 7일 이상은 날짜로.
function fmtRelative(v: string | null | undefined) {
  if (!v) return "활동 없음";
  const then = new Date(v).getTime();
  if (Number.isNaN(then)) return "-";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return formatDate(v);
}

const DAY = 86_400_000;

type ActivityStatus = "active" | "dormant" | "none";

/** 7일 안에 활동 = 활동 중, 30일 안 = 휴면 위험, 그 밖·기록 없음 = 활동 없음 */
function activityStatus(lastActiveAt: string | null): ActivityStatus {
  if (!lastActiveAt) return "none";
  const ago = Date.now() - new Date(lastActiveAt).getTime();
  if (ago <= 7 * DAY) return "active";
  if (ago <= 30 * DAY) return "dormant";
  return "none";
}

const STATUS_META: Record<ActivityStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "활동 중", variant: "success" },
  dormant: { label: "휴면 위험", variant: "warning" },
  none: { label: "활동 없음", variant: "secondary" },
};

const STATUS_FILTERS: { value: "all" | ActivityStatus; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "활동 중" },
  { value: "dormant", label: "휴면 위험" },
  { value: "none", label: "활동 없음" },
];

const columns: ColumnDef<UserRow>[] = [
  {
    id: "user",
    accessorFn: (u) => `${u.name ?? ""} ${u.email ?? ""} ${u.phone?.slice(-4) ?? ""}`,
    header: ({ column }) => <SortHeader label="사용자" column={column} />,
    sortingFn: (a, b) => (a.original.name ?? "").localeCompare(b.original.name ?? "", "ko"),
    enableHiding: false,
    meta: { label: "사용자" },
    cell: ({ row: { original: u } }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {u.profileImage && <AvatarImage src={u.profileImage} alt="" />}
          <AvatarFallback className="text-xs">{(u.name ?? "?")[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium">{u.name ?? "(이름없음)"}</div>
          <div className="text-xs text-muted-foreground">{u.email ?? "-"}</div>
        </div>
      </div>
    ),
  },
  {
    id: "phone",
    accessorFn: (u) => fmtPhone(u.phone),
    header: "전화번호",
    enableSorting: false,
    meta: { label: "전화번호", className: "text-muted-foreground tabular-nums" },
  },
  { id: "gender", accessorFn: (u) => genderLabel(u.gender), header: "성별", meta: { label: "성별", className: "text-muted-foreground" } },
  { id: "ageRange", accessorFn: (u) => ageRangeLabel(u.ageRange), header: "연령대", meta: { label: "연령대", className: "text-muted-foreground" } },
  { id: "role", accessorFn: (u) => roleLabel(u.parentRole), header: "역할", meta: { label: "역할", className: "text-muted-foreground" } },
  {
    id: "children",
    accessorFn: (u) => u.childCount ?? 0,
    header: ({ column }) => <SortHeader label="아이" column={column} align="right" />,
    meta: { label: "아이", align: "right" },
  },
  {
    id: "groups",
    accessorFn: (u) => u._count.groupMemberships,
    header: ({ column }) => <SortHeader label="그룹" column={column} align="right" />,
    meta: { label: "그룹", align: "right" },
  },
  {
    id: "payments",
    accessorFn: (u) => u._count.payments,
    header: ({ column }) => <SortHeader label="결제" column={column} align="right" />,
    meta: { label: "결제", align: "right" },
  },
  {
    id: "status",
    accessorFn: (u) => STATUS_META[activityStatus(u.lastActiveAt)].label,
    header: "상태",
    enableSorting: false,
    meta: { label: "상태" },
    cell: ({ row: { original: u } }) => {
      const m = STATUS_META[activityStatus(u.lastActiveAt)];
      return <Badge variant={m.variant}>{m.label}</Badge>;
    },
  },
  {
    id: "lastActive",
    accessorFn: (u) => (u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0),
    header: ({ column }) => <SortHeader label="마지막 활동" column={column} align="right" />,
    meta: { label: "마지막 활동", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: u } }) => fmtRelative(u.lastActiveAt),
  },
  {
    id: "createdAt",
    accessorFn: (u) => new Date(u.createdAt).getTime(),
    header: ({ column }) => <SortHeader label="가입일" column={column} align="right" />,
    meta: { label: "가입일", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: u } }) => formatDate(u.createdAt),
  },
];

export default function UsersClient({
  items,
  page,
  totalPages,
}: {
  items: UserRow[];
  page: number;
  totalPages: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<"all" | ActivityStatus>("all");
  const counts = useMemo(() => {
    const c = { active: 0, dormant: 0, none: 0 };
    for (const u of items) c[activityStatus(u.lastActiveAt)]++;
    return c;
  }, [items]);
  const visible = useMemo(
    () => (status === "all" ? items : items.filter((u) => activityStatus(u.lastActiveAt) === status)),
    [items, status],
  );
  const newIn30 = useMemo(
    () => items.filter((u) => Date.now() - new Date(u.createdAt).getTime() <= 30 * DAY).length,
    [items],
  );
  const payers = useMemo(() => items.filter((u) => u._count.payments > 0).length, [items]);

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const close = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetch(`/api/users/${selectedId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
        return res.json();
      })
      .then((data: UserDetail | null) => {
        if (cancelled) return;
        if (!data || !data.id) throw new Error("사용자 정보를 찾을 수 없습니다.");
        setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "오류가 발생했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // 백엔드 응답 형태가 달라도 크래시하지 않도록 방어적으로 파생
  const accounts = detail?.accounts ?? [];
  const memberships = detail?.groupMemberships ?? [];
  const payments = detail?.payments ?? [];
  // 그룹 전체의 아기(중복 제거)
  const children = Array.from(
    new Map(
      memberships
        .flatMap((m) => m?.group?.children ?? [])
        .map((c) => [c.id, c]),
    ).values(),
  );

  return (
    <>
      <div className="space-y-4">
        <StatStrip
          items={[
            { label: "전체 가입", value: items.length },
            { label: "최근 7일 활동", value: counts.active, hint: "기록·결제 등 활동 기준" },
            { label: "최근 30일 신규 가입", value: newIn30 },
            { label: "결제한 사용자", value: payers },
          ]}
        />
        <DataTable
          columns={columns}
          data={visible}
          searchPlaceholder="이름, 이메일, 전화번호 검색"
          onRowClick={(u) => openDetail(u.id)}
          emptyText="조건에 맞는 사용자가 없습니다."
          initialHidden={{ gender: false, ageRange: false }}
          toolbar={
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors",
                    status === f.value && "bg-background text-foreground shadow-xs",
                  )}
                >
                  {f.label}
                  <span className="ml-1 tabular-nums opacity-60">
                    {f.value === "all" ? items.length : counts[f.value]}
                  </span>
                </button>
              ))}
            </div>
          }
        />
      </div>

      {totalPages > 1 && <Pagination current={page} total={totalPages} basePath="/users" />}

      {/* 상세 팝업 */}
      <Modal open={!!selectedId} onClose={close}>
        {loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
        )}
        {error && (
          <div className="py-12 text-center text-sm text-destructive">{error}</div>
        )}
        {detail && !loading && (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {detail.profileImage && <AvatarImage src={detail.profileImage} alt="" />}
                <AvatarFallback className="text-lg">
                  {(detail.name ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-lg font-semibold">
                  {detail.name ?? "(이름없음)"}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {detail.email ?? "-"}
                </div>
              </div>
            </div>

            {/* 기본 정보 */}
            <Section title="기본 정보">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="역할" value={roleLabel(detail.parentRole)} />
                <Field label="전화번호" value={fmtPhone(detail.phone)} />
                <Field label="성별" value={genderLabel(detail.gender)} />
                <Field label="연령대" value={ageRangeLabel(detail.ageRange)} />
                <Field label="가입일" value={formatDateTime(detail.createdAt)} />
                <Field label="온보딩" value={formatDateTime(detail.onboardedAt)} />
                <Field
                  label="마지막 활동"
                  value={
                    detail.lastActiveAt ? (
                      <>
                        {fmtRelative(detail.lastActiveAt)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({formatDateTime(detail.lastActiveAt)})
                        </span>
                      </>
                    ) : (
                      "활동 없음"
                    )
                  }
                />
              </dl>
            </Section>

            {/* 최근 활동 */}
            <Section title="최근 활동">
              {(detail.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 활동이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.recentActivity.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <span className="font-medium">{a.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {fmtRelative(a.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 소셜 로그인 */}
            <Section title="소셜 로그인">
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">연결된 계정이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a, i) => (
                    <Badge key={i} variant="secondary">
                      {PROVIDER_LABELS[a.provider] ?? a.provider}
                    </Badge>
                  ))}
                </div>
              )}
            </Section>

            {/* 동의 현황 */}
            <Section title="약관 동의">
              <div className="flex flex-wrap gap-2">
                <ConsentBadge label="이용약관" at={detail.termsAgreedAt} />
                <ConsentBadge label="개인정보" at={detail.privacyAgreedAt} />
                <ConsentBadge label="마케팅" at={detail.marketingAgreedAt} />
                <ConsentBadge label="제3자제공" at={detail.thirdPartyAgreedAt} />
              </div>
            </Section>

            {/* 아기 */}
            <Section title={`아기 (${children.length})`}>
              {children.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 아기가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {children.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-9 w-9">
                        {c.profileImage && <AvatarImage src={c.profileImage} alt="" />}
                        <AvatarFallback className="text-xs">{c.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {GENDER_LABELS[c.gender] ?? c.gender} · {formatDate(c.birthDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* 결제 내역 */}
            <Section title={`결제 내역 (${payments.length})`}>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => {
                    const st = PAYMENT_STATUS[p.status] ?? {
                      label: p.status,
                      variant: "secondary" as const,
                    };
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{p.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(p.createdAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">
                            {p.amount.toLocaleString()}원
                          </span>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={close}>
                닫기
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function ConsentBadge({ label, at }: { label: string; at: string | null }) {
  return (
    <Badge variant={at ? "success" : "secondary"}>
      {label} {at ? "동의" : "미동의"}
    </Badge>
  );
}

function Pagination({
  current,
  total,
  basePath,
}: {
  current: number;
  total: number;
  basePath: string;
}) {
  if (total <= 1) return null;
  return (
    <div className="mt-6 flex justify-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <Button key={p} variant={p === current ? "default" : "outline"} size="sm" asChild>
          <a href={`${basePath}?page=${p}`}>{p}</a>
        </Button>
      ))}
    </div>
  );
}
