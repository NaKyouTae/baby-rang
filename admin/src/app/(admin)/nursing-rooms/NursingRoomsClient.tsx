"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin, RefreshCw, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import MapPicker from "./MapPicker";

export type NursingRoomStatus = "PENDING" | "APPROVED" | "REJECTED";

export type NursingRoom = {
  id: string;
  name: string;
  type: string;
  sido: string;
  sigungu: string | null;
  roadAddress: string;
  detailLocation: string | null;
  tel: string | null;
  dadAvailable: boolean;
  facilities: string[];
  openHours: string | null;
  notes: string | null;
  reporterName: string | null;
  lat: number | null;
  lng: number | null;
  status: NursingRoomStatus;
  createdAt: string;
  updatedAt: string;
};

const ROOM_TYPES = ["가족수유실", "모유수유실", "착유실", "기저귀교환대", "기타"];
const FACILITIES = [
  "기저귀교환대", "전자레인지", "정수기", "세면대", "소파/의자",
  "에어컨", "유아용 변기", "쓰레기통", "조명조절", "잠금장치",
];

const STATUS_LABEL: Record<NursingRoomStatus, string> = {
  PENDING: "검수 대기",
  APPROVED: "공개",
  REJECTED: "반려",
};
const STATUS_VARIANT: Record<NursingRoomStatus, "warning" | "success" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "secondary",
};

const empty = {
  name: "",
  type: "가족수유실",
  sido: "",
  sigungu: "",
  roadAddress: "",
  detailLocation: "",
  tel: "",
  dadAvailable: false,
  facilities: [] as string[],
  openHours: "",
  notes: "",
  reporterName: "",
  lat: "" as string | number,
  lng: "" as string | number,
  status: "APPROVED" as NursingRoomStatus,
};

export default function NursingRoomsClient({ initial }: { initial: NursingRoom[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<NursingRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [busy, setBusy] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [filter, setFilter] = useState<"" | NursingRoomStatus>("");

  const filtered = filter ? initial.filter((r) => r.status === filter) : initial;

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (r: NursingRoom) => {
    setForm({
      name: r.name,
      type: r.type,
      sido: r.sido,
      sigungu: r.sigungu ?? "",
      roadAddress: r.roadAddress,
      detailLocation: r.detailLocation ?? "",
      tel: r.tel ?? "",
      dadAvailable: r.dadAvailable,
      facilities: r.facilities ?? [],
      openHours: r.openHours ?? "",
      notes: r.notes ?? "",
      reporterName: r.reporterName ?? "",
      lat: r.lat ?? "",
      lng: r.lng ?? "",
      status: r.status,
    });
    setEditing(r);
    setCreating(false);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const toggleFacility = (f: string) => {
    setForm((s) => ({
      ...s,
      facilities: s.facilities.includes(f)
        ? s.facilities.filter((x) => x !== f)
        : [...s.facilities, f],
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.sido.trim() || !form.roadAddress.trim()) {
      alert("이름, 광역시/도, 도로명 주소는 필수입니다.");
      return;
    }
    const payload = {
      ...form,
      lat: form.lat === "" ? null : Number(form.lat),
      lng: form.lng === "" ? null : Number(form.lng),
    };
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/nursing-rooms/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/nursing-rooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("수유실 데이터를 삭제할까요?")) return;
    await fetch(`/api/nursing-rooms/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const updateStatus = async (id: string, status: NursingRoomStatus) => {
    await fetch(`/api/nursing-rooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">수유실 관리</h1>
        <Button onClick={startCreate} size="sm">
          <Plus className="h-4 w-4" />
          새 수유실
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {([
          ["", "전체"],
          ["PENDING", "검수 대기"],
          ["APPROVED", "공개"],
          ["REJECTED", "반려"],
        ] as const).map(([k, label]) => (
          <Button
            key={k}
            variant={filter === k ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(k as "" | NursingRoomStatus)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          className="ml-auto"
          onClick={() => router.refresh()}
          title="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px]">
                  {STATUS_LABEL[r.status]}
                </Badge>
                <Badge variant="pink" className="text-[10px]">{r.type}</Badge>
                <p className="font-medium text-sm truncate">{r.name}</p>
                {r.dadAvailable && (
                  <Badge variant="info" className="text-[10px]">아빠 가능</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {r.sido} {r.sigungu ?? ""} {r.roadAddress}
                {r.detailLocation ? ` · ${r.detailLocation}` : ""}
              </p>
              {r.facilities.length > 0 && (
                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                  편의시설: {r.facilities.join(", ")}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-1">
                {r.status !== "APPROVED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => updateStatus(r.id, "APPROVED")}
                  >
                    <Check className="h-3 w-3" />
                    승인
                  </Button>
                )}
                {r.status !== "REJECTED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(r.id, "REJECTED")}
                  >
                    <XIcon className="h-3 w-3" />
                    반려
                  </Button>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => startEdit(r)}>
                  <Pencil className="h-3 w-3" />
                  수정
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3 w-3" />
                  삭제
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-10">등록된 수유실이 없습니다</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "수유실 수정" : "새 수유실"}</DialogTitle>
            <DialogDescription>
              {editing ? "수유실 정보를 수정합니다." : "새로운 수유실을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>수유실 이름 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>종류</Label>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={form.type === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, type: t })}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>광역시/도 *</Label>
                <Input
                  value={form.sido}
                  onChange={(e) => setForm({ ...form, sido: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>시/군/구</Label>
                <Input
                  value={form.sigungu}
                  onChange={(e) => setForm({ ...form, sigungu: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>도로명 주소 *</Label>
              <Input
                value={form.roadAddress}
                onChange={(e) => setForm({ ...form, roadAddress: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>상세 위치</Label>
              <Input
                value={form.detailLocation}
                onChange={(e) => setForm({ ...form, detailLocation: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>위도 (lat)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>경도 (lng)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setMapPickerOpen(true)}
            >
              <MapPin className="h-4 w-4" />
              지도에서 정확한 위치 찾기
            </Button>

            <div className="space-y-2">
              <Label>연락처</Label>
              <Input
                value={form.tel}
                onChange={(e) => setForm({ ...form, tel: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.dadAvailable}
                onCheckedChange={(v) => setForm({ ...form, dadAvailable: v })}
              />
              <Label>아빠 이용 가능</Label>
            </div>

            <div className="space-y-2">
              <Label>편의시설</Label>
              <div className="flex flex-wrap gap-2">
                {FACILITIES.map((f) => {
                  const on = form.facilities.includes(f);
                  return (
                    <Button
                      key={f}
                      type="button"
                      variant={on ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFacility(f)}
                    >
                      {on && <Check className="h-3 w-3" />}
                      {f}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>이용 시간</Label>
              <Input
                value={form.openHours}
                onChange={(e) => setForm({ ...form, openHours: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>추가 설명</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>제보자 닉네임</Label>
              <Input
                value={form.reporterName}
                onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as NursingRoomStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">검수 대기</SelectItem>
                  <SelectItem value="APPROVED">공개</SelectItem>
                  <SelectItem value="REJECTED">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              취소
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MapPicker
        open={mapPickerOpen}
        initialLat={form.lat === "" ? null : Number(form.lat)}
        initialLng={form.lng === "" ? null : Number(form.lng)}
        initialAddress={[form.sido, form.sigungu, form.roadAddress, form.detailLocation]
          .filter(Boolean)
          .join(" ")}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={(lat, lng) => {
          setForm((s) => ({ ...s, lat, lng }));
          setMapPickerOpen(false);
        }}
      />
    </div>
  );
}
