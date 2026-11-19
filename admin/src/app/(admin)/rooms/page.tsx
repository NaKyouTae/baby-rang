import { adminFetch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatStrip } from "@/components/data-table";
import { RoomsTable, type RoomRow } from "./RoomsTable";

export default async function RoomsPage() {
  let items: RoomRow[] = [];
  try {
    items = (await adminFetch<{ items: RoomRow[] }>("/room-view")).items;
  } catch {}

  const decorated = items.filter((r) => r.placements > 0);
  const avg = decorated.length ? decorated.reduce((s, r) => s + r.placements, 0) / decorated.length : 0;
  const week = Date.now() - 7 * 86_400_000;
  const recent = items.filter((r) => new Date(r.updatedAt).getTime() >= week).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="아기방"
        description="사용자들이 꾸민 아기방을 앱 화면 그대로 봅니다. 아기를 고르면 오른쪽에 방이 보이고, 보기만 할 수 있습니다."
      />
      <StatStrip
        items={[
          { label: "만들어진 방", value: items.length },
          { label: "가구를 놓은 방", value: decorated.length },
          { label: "방당 평균 가구", value: avg.toFixed(1), hint: "가구를 놓은 방 기준" },
          { label: "최근 7일 꾸민 방", value: recent },
        ]}
      />
      <RoomsTable items={items} />
    </div>
  );
}
