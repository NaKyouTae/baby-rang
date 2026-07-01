"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/Modal";

export type UserRow = {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImage: string | null;
  parentRole: string | null;
  createdAt: string;
  _count: { groupMemberships: number; payments: number };
};

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
  birthYear: number | null;
  onboardedAt: string | null;
  updatedAt: string;
  termsAgreedAt: string | null;
  privacyAgreedAt: string | null;
  marketingAgreedAt: string | null;
  thirdPartyAgreedAt: string | null;
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

function fmtDate(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString() : "-";
}

function fmtDateTime(v: string | null | undefined) {
  return v ? new Date(v).toLocaleString() : "-";
}

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
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {items.map((u) => (
          <Card
            key={u.id}
            className="cursor-pointer p-4 transition-colors active:bg-accent"
            onClick={() => openDetail(u.id)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {u.profileImage && <AvatarImage src={u.profileImage} alt="" />}
                <AvatarFallback>{(u.nickname ?? "?")[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium">{u.nickname ?? "(이름없음)"}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email ?? "-"}</div>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>그룹 {u._count.groupMemberships}</span>
              <span>결제 {u._count.payments}</span>
              <span>{fmtDate(u.createdAt)}</span>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            사용자가 없습니다.
          </Card>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사용자</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead className="text-right">그룹</TableHead>
              <TableHead className="text-right">결제</TableHead>
              <TableHead className="text-right">가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={() => openDetail(u.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {u.profileImage && <AvatarImage src={u.profileImage} alt="" />}
                      <AvatarFallback className="text-xs">
                        {(u.nickname ?? "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.nickname ?? "(이름없음)"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{roleLabel(u.parentRole)}</TableCell>
                <TableCell className="text-right">{u._count.groupMemberships}</TableCell>
                <TableCell className="text-right">{u._count.payments}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {fmtDate(u.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  사용자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination current={page} total={totalPages} basePath="/users" />

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
                  {(detail.nickname ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-lg font-semibold">
                  {detail.nickname ?? "(이름없음)"}
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
                <Field
                  label="출생연도"
                  value={detail.birthYear ? `${detail.birthYear}년` : "-"}
                />
                <Field label="가입일" value={fmtDateTime(detail.createdAt)} />
                <Field label="온보딩" value={fmtDateTime(detail.onboardedAt)} />
              </dl>
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
                          {GENDER_LABELS[c.gender] ?? c.gender} · {fmtDate(c.birthDate)}
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
                            {fmtDate(p.createdAt)}
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
