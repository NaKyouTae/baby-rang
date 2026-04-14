import { adminFetch } from "@/lib/api";
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
      <h1 className="text-2xl font-bold tracking-tight mb-6">사용자</h1>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.items.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {u.profileImage && <AvatarImage src={u.profileImage} alt="" />}
                <AvatarFallback>{(u.nickname ?? "?")[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium truncate">{u.nickname ?? "(이름없음)"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email ?? "-"}</div>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>아이 {u._count.children}</span>
              <span>결제 {u._count.payments}</span>
              <span>{new Date(u.createdAt).toLocaleDateString()}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사용자</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="text-right">아이</TableHead>
              <TableHead className="text-right">결제</TableHead>
              <TableHead className="text-right">가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((u) => (
              <TableRow key={u.id}>
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
                <TableCell className="text-right">{u._count.children}</TableCell>
                <TableCell className="text-right">{u._count.payments}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
    <div className="flex justify-center gap-1 mt-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          variant={p === current ? "default" : "outline"}
          size="sm"
          asChild
        >
          <a href={`${basePath}?page=${p}`}>{p}</a>
        </Button>
      ))}
    </div>
  );
}
