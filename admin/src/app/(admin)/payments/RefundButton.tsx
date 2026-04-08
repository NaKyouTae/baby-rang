"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading]);

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

  const btnClass =
    variant === "card"
      ? "flex-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold py-2"
      : "px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        환불
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">결제 환불</h2>
            <p className="mt-1 text-xs text-gray-500 break-all">
              주문번호: {orderId}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              결제금액: {amount.toLocaleString()}원
            </p>

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={partial}
                  onChange={(e) => setPartial(e.target.checked)}
                />
                부분 환불
              </label>
              {partial && (
                <input
                  type="number"
                  min={1}
                  max={amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="환불 금액"
                />
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-700 mb-1">
                환불 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                placeholder="예: 고객 요청에 의한 환불"
              />
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-500">{error}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "처리 중..." : "환불 진행"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
