'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { calcChildAge } from '@/lib/childAge';
import PixelScreen from '../home/_components/PixelScreen';
import { fromServerPlacement, imageOf, preloadSprites, type ServerPlacement } from '../home/_components/placements';
import { useWindowSky } from '../home/_components/useWindowSky';

type ViewData = {
  child: { id: string; name: string; gender: string; birthDate: string };
  room: { wallpaper: { imageUrl: string | null } | null; flooring: { imageUrl: string | null } | null } | null;
  placements: ServerPlacement[];
};

const noop = () => {};

export default function RoomViewClient() {
  const sp = useSearchParams();
  const childId = sp.get('childId') ?? '';
  const ticket = sp.get('ticket') ?? '';
  const [data, setData] = useState<ViewData | null>(null);
  const [failed, setFailed] = useState(false);
  const error = failed || !childId || !ticket;

  useEffect(() => {
    if (!childId || !ticket) return;
    let alive = true;
    fetch(`/api/room-view/${encodeURIComponent(childId)}?ticket=${encodeURIComponent(ticket)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ViewData) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [childId, ticket]);

  const placements = useMemo(() => (data?.placements ?? []).map(fromServerPlacement), [data]);
  useEffect(() => {
    preloadSprites([
      ...placements.map(imageOf),
      data?.room?.wallpaper?.imageUrl ?? null,
      data?.room?.flooring?.imageUrl ?? null,
    ]);
  }, [placements, data]);
  const windowSky = useWindowSky(placements.some((p) => p.dynamicSlot === 'WEATHER'));

  const kids = useMemo(
    () =>
      data
        ? [
            {
              id: data.child.id,
              name: data.child.name,
              gender: data.child.gender,
              months: calcChildAge(data.child.birthDate).months,
            },
          ]
        : [],
    [data],
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
        방을 불러오지 못했어요. 어드민에서 다시 열어 주세요.
      </div>
    );
  }
  if (!data) return <div className="h-full bg-[#EEF0F1]" />;

  return (
    <div
      className="relative h-full overflow-hidden select-none bg-[#EEF0F1]"
      style={{ fontFamily: 'Galmuri11Fig, Galmuri11, monospace' }}
    >
      <PixelScreen
        kids={kids}
        wallpaperUrl={data.room?.wallpaper?.imageUrl ?? null}
        flooringUrl={data.room?.flooring?.imageUrl ?? null}
        placements={placements}
        editing={false}
        onMovePlacement={noop}
        onRotatePlacement={noop}
        onFlipPlacement={noop}
        onLongPressPlacement={noop}
        onPet={noop}
        windowSky={windowSky}
      />
    </div>
  );
}
