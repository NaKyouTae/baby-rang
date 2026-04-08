"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
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
  "기저귀교환대",
  "전자레인지",
  "정수기",
  "세면대",
  "소파/의자",
  "에어컨",
  "유아용 변기",
  "쓰레기통",
  "조명조절",
  "잠금장치",
];

const STATUS_LABEL: Record<NursingRoomStatus, string> = {
  PENDING: "검수 대기",
  APPROVED: "공개",
  REJECTED: "반려",
};
const STATUS_COLOR: Record<NursingRoomStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-gray-100 text-gray-500",
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">수유실 관리</h1>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold"
        >
          + 새 수유실
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {([
          ["", "전체"],
          ["PENDING", "검수 대기"],
          ["APPROVED", "공개"],
          ["REJECTED", "반려"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k as "" | NursingRoomStatus)}
            className={`px-3 py-1.5 text-xs rounded-full border ${
              filter === k
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => router.refresh()}
          aria-label="새로고침"
          title="새로고침"
          className="ml-auto flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] ${STATUS_COLOR[r.status]}`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] bg-pink-50 text-pink-600">
                  {r.type}
                </span>
                <p className="font-semibold text-sm text-gray-900 truncate">{r.name}</p>
                {r.dadAvailable && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600">
                    아빠 가능
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {r.sido} {r.sigungu ?? ""} {r.roadAddress}
                {r.detailLocation ? ` · ${r.detailLocation}` : ""}
              </div>
              {r.facilities.length > 0 && (
                <div className="text-[11px] text-gray-400 truncate mt-0.5">
                  편의시설: {r.facilities.join(", ")}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-1">
                {r.status !== "APPROVED" && (
                  <button
                    onClick={() => updateStatus(r.id, "APPROVED")}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    승인
                  </button>
                )}
                {r.status !== "REJECTED" && (
                  <button
                    onClick={() => updateStatus(r.id, "REJECTED")}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    반려
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(r)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  수정
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-10">등록된 수유실이 없습니다</div>
        )}
      </div>

      <Modal
        open={creating || !!editing}
        onClose={close}
        className="bg-white w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
            <h2 className="text-lg font-bold mb-4">
              {editing ? "수유실 수정" : "새 수유실"}
            </h2>
            <div className="space-y-3">
              <Field label="수유실 이름 *">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="종류">
                <div className="flex flex-wrap gap-2">
                  {ROOM_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        form.type === t
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="광역시/도 *">
                  <input
                    value={form.sido}
                    onChange={(e) => setForm({ ...form, sido: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="시/군/구">
                  <input
                    value={form.sigungu}
                    onChange={(e) => setForm({ ...form, sigungu: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="도로명 주소 *">
                <input
                  value={form.roadAddress}
                  onChange={(e) => setForm({ ...form, roadAddress: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="상세 위치">
                <input
                  value={form.detailLocation}
                  onChange={(e) => setForm({ ...form, detailLocation: e.target.value })}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="위도 (lat)">
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="경도 (lng)">
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="w-full py-2.5 rounded-xl border border-pink-300 bg-pink-50 text-pink-600 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                지도에서 정확한 위치 찾기
              </button>

              <Field label="연락처">
                <input
                  value={form.tel}
                  onChange={(e) => setForm({ ...form, tel: e.target.value })}
                  className="input"
                />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.dadAvailable}
                  onChange={(e) => setForm({ ...form, dadAvailable: e.target.checked })}
                />
                아빠 이용 가능
              </label>

              <Field label="편의시설">
                <div className="flex flex-wrap gap-2">
                  {FACILITIES.map((f) => {
                    const on = form.facilities.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFacility(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          on
                            ? "bg-pink-50 text-pink-600 border-pink-300"
                            : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {f}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="이용 시간">
                <input
                  value={form.openHours}
                  onChange={(e) => setForm({ ...form, openHours: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="추가 설명">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="input resize-y"
                />
              </Field>

              <Field label="제보자 닉네임">
                <input
                  value={form.reporterName}
                  onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="상태">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as NursingRoomStatus })
                  }
                  className="input"
                >
                  <option value="PENDING">검수 대기</option>
                  <option value="APPROVED">공개</option>
                  <option value="REJECTED">반려</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-2 pt-5">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50"
              >
                {busy ? "저장 중..." : "저장"}
              </button>
            </div>
      </Modal>

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

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          font-size: 0.875rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: #111827;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
