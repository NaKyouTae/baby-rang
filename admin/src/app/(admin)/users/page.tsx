import { adminFetch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import UsersClient, { type UserRow } from "./UsersClient";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  let data = { items: [] as UserRow[], total: 0, page: 1, limit: 100 };
  try {
    // 표에서 바로 검색·정렬하도록 한 번에 100명까지 받는다. 넘으면 아래 페이지로 넘긴다.
    data = await adminFetch(`/admin/users?page=${page}&limit=100`);
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <PageHeader
        title="사용자"
        description="가입한 사용자입니다. 행을 누르면 아기·결제·최근 활동을 볼 수 있습니다."
      />
      <UsersClient items={data.items} page={data.page} totalPages={totalPages} />
    </div>
  );
}
