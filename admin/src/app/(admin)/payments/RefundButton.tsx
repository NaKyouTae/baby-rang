"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  orderId: string;
  amount: number;
  status: string;
  /** 'TOSS' | 'APP_STORE' | 'GOOGLE_PLAY' */
  provider: string;
  variant?: "table" | "card";
};

/**
 * 어드민에서 환불할 수 있는 결제인지.
 *
 * 환불 API 는 Toss 취소만 호출한다(payments.service.ts refundTossByAdmin).
 * 인앱결제의 paymentKey 는 스토어 트랜잭션 ID 라서 Toss 가 모르는 값이고,
 * 애초에 Apple 은 판매자에게 환불 API 를 주지 않는다.
 * 그래서 스토어 결제에는 버튼 대신 처리 경로를 안내한다.
 */
function storeRefundNotice(provider: string): string | null {
  if (provider === "APP_STORE") {
    return "App Store 환불은 Apple 만 처리할 수 있습니다. 고객이 reportaproblem.apple.com 에서 직접 신청해야 합니다.";
  }
  if (provider === "GOOGLE_PLAY") {
    return "Google Play 환불은 Play Console 의 주문 관리에서 처리합니다.";
  }
  return null;
}

export function RefundButton({ orderId, amount, status, provider, variant = "table" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [partial, setPartial] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(amount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refundable = status === "PAID" || status === "PARTIAL_REFUNDED";

  if (!refundable) return null;

  // 스토어 결제는 여기서 환불할 수 없다. 버튼을 그대로 두면 눌렀을 때
  // Toss API 가 호출되어 실패하므로, 어디서 처리하는지만 알려준다.
  const notice = storeRefundNotice(provider);
  if (notice) {
    return (
      <span
        className={
          variant === "card"
            ? "flex-1 text-xs text-muted-foreground"
            : "text-xs text-muted-foreground"
        }
      >
        {notice}
      </span>
    );
  }

  async function submit() {
    if (!reason.trim()) {
      setError("환불 사유를 입력해주세요.");
      return;
    }
    if (partial && (refundAmount <= 0 || refundAmount > amount)) {
      setError("환불 금액이 올바르지 않습니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/payments/${encodeURIComponent(orderId)}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: reason.trim(),
            ...(partial ? { amount: refundAmount } : {}),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "환불 요청 실패");
      }
      setOpen(false);
      setReason("");
      setPartial(false);
      setRefundAmount(amount);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "환불 요청 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className={variant === "card" ? "flex-1" : ""}
        onClick={() => setOpen(true)}
      >
        환불
      </Button>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>결제 환불</DialogTitle>
            <DialogDescription>
              주문번호: {orderId} / 결제금액: {amount.toLocaleString()}원
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={partial} onCheckedChange={setPartial} />
              <Label>부분 환불</Label>
            </div>
            {partial && (
              <div className="space-y-2">
                <Label>환불 금액</Label>
                <Input
                  type="number"
                  min={1}
                  max={amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  placeholder="환불 금액"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>
                환불 사유 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="예: 고객 요청에 의한 환불"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button variant="destructive" onClick={submit} disabled={loading}>
              {loading ? "처리 중..." : "환불 진행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
