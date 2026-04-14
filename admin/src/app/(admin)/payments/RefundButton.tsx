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
  variant?: "table" | "card";
};

export function RefundButton({ orderId, amount, status, variant = "table" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [partial, setPartial] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(amount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refundable = status === "PAID" || status === "PARTIAL_REFUNDED";

  if (!refundable) return null;

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
