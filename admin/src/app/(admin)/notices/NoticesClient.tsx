"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";

type Notice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

const empty = {
  title: "",
  content: "",
  isPinned: false,
  isPublished: true,
};

export default function NoticesClient({ initial }: { initial: Notice[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Notice | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (n: Notice) => {
    setForm({
      title: n.title,
      content: n.content,
      isPinned: n.isPinned,
      isPublished: n.isPublished,
    });
    setEditing(n);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/notices/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`/api/notices`, {
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
    if (!confirm("공지사항을 삭제할까요?")) return;
    await fetch(`/api/notices/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold"
        >
          + 새 공지
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {initial.map((n) => (
          <div
            key={n.id}
            className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {n.isPinned && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">
                    고정
                  </span>
                )}
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {n.title}
                </p>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] ${
                    n.isPublished
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {n.isPublished ? "공개" : "비공개"}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {new Date(n.publishedAt).toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => startEdit(n)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                수정
              </button>
              <button
                onClick={() => remove(n.id)}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {initial.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            등록된 공지사항이 없습니다
          </div>
        )}
      </div>

      <Modal open={creating || !!editing} onClose={close}>
        <h2 className="text-lg font-bold mb-4">
              {editing ? "공지 수정" : "새 공지"}
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-500">제목</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-900"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">내용</span>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-900 resize-y"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                />
                상단 고정
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                공개
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
