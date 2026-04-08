"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  bgColor: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

const empty = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: 0,
  isActive: true,
};

export default function BannersClient({ initial }: { initial: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/banners/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      setForm((prev: any) => ({ ...prev, imageUrl: data.url }));
    } catch (e) {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (b: Banner) => {
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl ?? "",
      linkUrl: b.linkUrl,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    });
    setEditing(b);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/banners/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`/api/banners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("배너를 삭제할까요?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">배너 관리</h1>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold"
        >
          + 새 배너
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {initial.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden flex items-center"
          >
            <div
              className="relative w-28 h-16 shrink-0 flex items-center px-3 text-white overflow-hidden"
              style={{
                background: b.bgColor
                  ? `linear-gradient(135deg, ${b.bgColor}, #FF7E5F)`
                  : "#888",
              }}
            >
              {b.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 px-4 py-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {b.title}
                </p>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] ${
                    b.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {b.isActive ? "활성" : "비활성"}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                → {b.linkUrl}
              </div>
            </div>
            <div className="shrink-0 text-xs text-gray-400 px-2 hidden sm:block">
              #{b.sortOrder}
            </div>
            <div className="flex gap-1 px-3">
              <button
                onClick={() => startEdit(b)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                수정
              </button>
              <button
                onClick={() => remove(b.id)}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {initial.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            등록된 배너가 없습니다
          </div>
        )}
      </div>

      <Modal open={creating || !!editing} onClose={close}>
            <h2 className="text-lg font-bold mb-4">
              {editing ? "배너 수정" : "새 배너"}
            </h2>
            <div className="space-y-3">
              <div className="block">
                <span className="text-xs text-gray-500">이미지</span>
                {form.imageUrl ? (
                  <div className="mt-1 relative rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="배너 이미지 미리보기"
                      className="w-full aspect-[16/7] object-cover"
                    />
                    <label className="absolute bottom-2 right-2 px-3 py-1.5 text-xs rounded-md bg-black/60 text-white cursor-pointer hover:bg-black/75">
                      이미지 변경
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadImage(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="absolute top-2 right-2 px-2 py-1 text-xs rounded-md bg-black/60 text-white hover:bg-black/75"
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex flex-col items-center justify-center gap-1 w-full aspect-[16/7] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 cursor-pointer text-gray-500 text-sm">
                    {uploading ? (
                      <span>업로드 중...</span>
                    ) : (
                      <>
                        <span className="text-2xl leading-none">+</span>
                        <span>이미지 선택</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              <Field label="제목" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label="부제목" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
              <Field label="이동 링크" value={form.linkUrl} onChange={(v) => setForm({ ...form, linkUrl: v })} />
              <Field
                label="정렬 순서"
                type="number"
                value={String(form.sortOrder)}
                onChange={(v) => setForm({ ...form, sortOrder: Number(v) || 0 })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                활성화
              </label>
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
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-900"
      />
    </label>
  );
}
