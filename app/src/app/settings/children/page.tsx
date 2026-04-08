'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useChildren, GENDER_LABEL } from '@/hooks/useChildren';
import DatePickerModal from '@/components/DatePickerModal';
import { calcChildAge } from '@/lib/childAge';

type Gender = 'male' | 'female' | '';

export default function ChildrenSettingsPage() {
  const router = useRouter();
  const { children, isLoaded, addChild, removeChild, updateChild } = useChildren();

  // 새 아이 추가 폼
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [birthDate, setBirthDate] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // 수정 중인 아이
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<Gender>('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (isEdit) {
      setEditPhotoFile(file);
      setEditPhotoPreview(url);
    } else {
      setPhotoFile(file);
      setPhotoPreview(url);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setGender('');
    setBirthDate('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleAdd = async () => {
    if (!name.trim() || !gender || !birthDate) return;
    setSubmitting(true);
    await addChild(name.trim(), gender, birthDate, photoFile || undefined);
    resetForm();
    setSubmitting(false);
  };

  const startEdit = (child: { id: string; name: string; gender: string; birthDate: string; profileImage?: string | null }) => {
    setEditingId(child.id);
    setEditName(child.name);
    setEditGender(child.gender as Gender);
    setEditBirthDate(child.birthDate);
    setEditPhotoFile(null);
    setEditPhotoPreview(child.profileImage || null);
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim() || !editGender || !editBirthDate) return;
    setSubmitting(true);
    await updateChild(editingId, editName.trim(), editGender, editBirthDate, editPhotoFile || undefined);
    setEditingId(null);
    setSubmitting(false);
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-gray-50 px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-primary-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">우리아이 등록하기</h1>
      </header>

      {/* 등록된 아이 목록 */}
      <section className="mx-4 mt-2 space-y-3">
        {children.length === 0 && !showForm && (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">👶</span>
            <p className="text-sm text-gray-400">등록된 아이가 없어요</p>
            <p className="text-xs text-gray-300 mt-1">아래 버튼을 눌러 아이를 등록해주세요</p>
          </div>
        )}

        {children.map((child) =>
          editingId === child.id ? (
            /* 수정 모드 — 등록 폼과 동일 */
            <div key={child.id} className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => editFileRef.current?.click()}
                  className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center border-2 border-dashed border-gray-200"
                >
                  {editPhotoPreview ? (
                    <Image src={editPhotoPreview} alt="프로필" fill className="object-cover" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e, true)} />

                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="이름"
                    className="w-12 shrink-0 text-sm font-bold text-gray-900 placeholder-gray-300 border-b border-gray-200 pb-0.5 outline-none focus:border-gray-400 transition-colors bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setEditGender('male')}
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      editGender === 'male'
                        ? 'bg-blue-50 text-blue-500'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {GENDER_LABEL.male}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGender('female')}
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      editGender === 'female'
                        ? 'bg-pink-50 text-pink-500'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {GENDER_LABEL.female}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDatePickerOpen(true)}
                    className={`flex-1 min-w-0 text-sm font-bold text-left border-b border-gray-200 pb-0.5 outline-none focus:border-gray-400 transition-colors bg-transparent ${
                      editBirthDate ? 'text-gray-900' : 'text-gray-300'
                    }`}
                  >
                    {editBirthDate ? editBirthDate.replace(/-/g, '. ') : '생년월일'}
                  </button>
                </div>

                <button onClick={() => setEditingId(null)} className="p-2 text-gray-300" disabled={submitting}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleUpdate}
                disabled={submitting || !editName.trim() || !editGender || !editBirthDate}
                className="w-full py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-40"
              >
                {submitting ? '저장 중...' : '저장하기'}
              </button>
            </div>
          ) : (
            /* 표시 모드 */
            <div key={child.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3">
              <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center">
                {child.profileImage ? (
                  <Image src={child.profileImage} alt={child.name} fill className="object-cover" />
                ) : (
                  <span className="text-xl">{child.gender === 'male' ? '👦' : '👧'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-gray-900">{child.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    child.gender === 'male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'
                  }`}>
                    {GENDER_LABEL[child.gender as 'male' | 'female']}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {child.birthDate.replace(/-/g, '. ')}
                </p>
                {(() => {
                  const { days, months, extraDays } = calcChildAge(child.birthDate);
                  return (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      D+{days} · {months}개월 {extraDays}일
                    </p>
                  );
                })()}
              </div>
              <button onClick={() => startEdit(child)} className="p-2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button onClick={() => removeChild(child.id)} className="p-2 text-gray-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )
        )}

        {/* 인라인 등록 폼 — 기존 아이 카드와 동일한 레이아웃 */}
        {showForm && (
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              {/* 프로필 사진 */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center border-2 border-dashed border-gray-200"
              >
                {photoPreview ? (
                  <Image src={photoPreview} alt="프로필" fill className="object-cover" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e)} />

              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름"
                  className="w-12 shrink-0 text-sm font-bold text-gray-900 placeholder-gray-300 border-b border-gray-200 pb-0.5 outline-none focus:border-gray-400 transition-colors bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    gender === 'male'
                      ? 'bg-blue-50 text-blue-500'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {GENDER_LABEL.male}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    gender === 'female'
                      ? 'bg-pink-50 text-pink-500'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {GENDER_LABEL.female}
                </button>
                <button
                  type="button"
                  onClick={() => setDatePickerOpen(true)}
                  className={`flex-1 min-w-0 text-sm font-bold text-left border-b border-gray-200 pb-0.5 outline-none focus:border-gray-400 transition-colors bg-transparent ${
                    birthDate ? 'text-gray-900' : 'text-gray-300'
                  }`}
                >
                  {birthDate ? birthDate.replace(/-/g, '. ') : '생년월일'}
                </button>
              </div>

              <button onClick={resetForm} className="p-2 text-gray-300" disabled={submitting}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleAdd}
              disabled={submitting || !name.trim() || !gender || !birthDate}
              className="w-full py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-40"
            >
              {submitting ? '등록 중...' : '저장하기'}
            </button>
          </div>
        )}
      </section>

      {/* 아이 추가 버튼 */}
      {!showForm && editingId === null && (
        <div className="mx-4 mt-4">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 active:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            아이 추가하기
          </button>
        </div>
      )}

      {/* 생년월일 캘린더 모달 — 등록 */}
      <DatePickerModal
        open={datePickerOpen}
        value={birthDate}
        max={new Date().toISOString().slice(0, 10)}
        title="생년월일 선택"
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(d) => setBirthDate(d)}
      />
      {/* 생년월일 캘린더 모달 — 수정 */}
      <DatePickerModal
        open={editDatePickerOpen}
        value={editBirthDate}
        max={new Date().toISOString().slice(0, 10)}
        title="생년월일 선택"
        onClose={() => setEditDatePickerOpen(false)}
        onConfirm={(d) => setEditBirthDate(d)}
      />
    </div>
  );
}
