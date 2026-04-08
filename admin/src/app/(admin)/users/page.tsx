import { adminFetch } from "@/lib/api";

type UserRow = {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImage: string | null;
  createdAt: string;
  _count: { children: number; payments: number };
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  let data = { items: [] as UserRow[], total: 0, page: 1, limit: 20 };
  try {
    data = await adminFetch(`/admin/users?page=${page}&limit=20`);
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">사용자</h1>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.items.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {u.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">{u.nickname ?? "(이름없음)"}</div>
                <div className="text-xs text-gray-500 truncate">{u.email ?? "-"}</div>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span>아이 {u._count.children}</span>
              <span>결제 {u._count.payments}</span>
              <span>{new Date(u.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">사용자</th>
              <th className="text-left px-5 py-3">이메일</th>
              <th className="text-right px-5 py-3">아이</th>
              <th className="text-right px-5 py-3">결제</th>
              <th className="text-right px-5 py-3">가입일</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {u.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                    )}
                    <span className="font-medium text-gray-900">{u.nickname ?? "(이름없음)"}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{u.email ?? "-"}</td>
                <td className="px-5 py-3 text-right">{u._count.children}</td>
                <td className="px-5 py-3 text-right">{u._count.payments}</td>
                <td className="px-5 py-3 text-right text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination current={data.page} total={totalPages} basePath="/users" />
    </div>
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
    <div className="flex justify-center gap-2 mt-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <a
          key={p}
          href={`${basePath}?page=${p}`}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            p === current ? "bg-gray-900 text-white" : "bg-white text-gray-700"
          }`}
        >
          {p}
        </a>
      ))}
    </div>
  );
}
