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
  let data = { items: [] as UserRow[], total: 0, page: 1, limit: 20 };
  try {
    data = await adminFetch(`/admin/users?page=${page}&limit=20`);
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <PageHeader
        title="사용자"
        description="가입한 사용자 목록입니다. 행을 클릭하면 상세 정보를 확인할 수 있습니다."
      />
      <UsersClient items={data.items} page={data.page} totalPages={totalPages} />
    </div>
  );
}
