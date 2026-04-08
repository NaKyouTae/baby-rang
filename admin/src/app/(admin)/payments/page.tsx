import { adminFetch } from "@/lib/api";
import { RefundButton } from "./RefundButton";

type PaymentRow = {
  id: string;
  orderId: string;
  productName: string;
  productType: string;
  amount: number;
  status: string;
  provider: string;
  method: string | null;
  receiptUrl: string | null;
  createdAt: string;
  user: { id: string; nickname: string | null; email: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-purple-100 text-purple-700",
  PARTIAL_REFUNDED: "bg-purple-100 text-purple-700",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  const status = sp.status ?? "";
  let data = { items: [] as PaymentRow[], total: 0, page: 1, limit: 20 };
  try {
    data = await adminFetch(
      `/admin/payments?page=${page}&limit=20${status ? `&status=${status}` : ""}`,
    );
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const filters = ["", "PAID", "PENDING", "FAILED", "CANCELLED", "REFUNDED"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">결제 내역</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <a
            key={f || "all"}
            href={`/payments${f ? `?status=${f}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              status === f
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {f || "전체"}
          </a>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.items.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">{p.productName}</div>
                <div className="text-xs text-gray-500 truncate">{p.user?.nickname ?? p.user?.email ?? "-"}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100"}`}>
                {p.status}
              </span>
            </div>
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span>{p.amount.toLocaleString()}원</span>
              <span>{new Date(p.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {p.receiptUrl && (
                <a
                  href={p.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold py-2"
                >
                  영수증
                </a>
              )}
              <RefundButton
                orderId={p.orderId}
                amount={p.amount}
                status={p.status}
                variant="card"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">상품</th>
              <th className="text-left px-5 py-3">사용자</th>
              <th className="text-right px-5 py-3">금액</th>
              <th className="text-left px-5 py-3">상태</th>
              <th className="text-left px-5 py-3">결제수단</th>
              <th className="text-right px-5 py-3">일시</th>
              <th className="text-right px-5 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{p.productName}</div>
                  <div className="text-xs text-gray-500">{p.productType}</div>
                </td>
                <td className="px-5 py-3 text-gray-700">
                  {p.user?.nickname ?? p.user?.email ?? "-"}
                </td>
                <td className="px-5 py-3 text-right font-semibold">
                  {p.amount.toLocaleString()}원
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{p.method ?? p.provider}</td>
                <td className="px-5 py-3 text-right text-gray-500">
                  {new Date(p.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100"
                      >
                        영수증
                      </a>
                    )}
                    <RefundButton
                      orderId={p.orderId}
                      amount={p.amount}
                      status={p.status}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <a
              key={pg}
              href={`/payments?page=${pg}${status ? `&status=${status}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                pg === data.page ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              }`}
            >
              {pg}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
