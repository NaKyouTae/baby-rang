import type { RoomItem } from './DecorateSheet';

/** 디코드까지 마친 이미지. 참조를 들고 있어야 브라우저가 메모리 캐시에서 내리지 않는다. */
const decoded: HTMLImageElement[] = [];

/** 이미지 하나가 늦어도 시트가 마냥 안 열리면 안 되니 이만큼만 기다린다. */
const IMAGE_WAIT_MS = 3000;

let itemsPromise: Promise<RoomItem[]> | null = null;

function decodeImage(url: string): Promise<void> {
  const img = new Image();
  img.src = url;
  decoded.push(img);
  return img.decode().catch(() => undefined);
}

/**
 * 꾸미기 카탈로그와 그 이미지를 함께 불러온다.
 * 시트가 먼저 뜨고 이미지가 뒤늦게 채워지지 않도록, 시트는 이게 끝난 뒤에 연다.
 * 한 번 받은 결과는 계속 쓴다. 실패하면 다음 호출에서 다시 시도한다.
 */
export function loadRoomItems(): Promise<RoomItem[]> {
  if (!itemsPromise) {
    itemsPromise = fetch('/api/room-items')
      .then((r) => r.json())
      .then(async (d) => {
        const items: RoomItem[] = d.items ?? [];
        const urls = items.map((i) => i.imageUrl).filter((u): u is string => !!u);
        await Promise.race([
          Promise.all(urls.map(decodeImage)),
          new Promise((resolve) => setTimeout(resolve, IMAGE_WAIT_MS)),
        ]);
        return items;
      })
      .catch(() => {
        itemsPromise = null;
        return [];
      });
  }
  return itemsPromise;
}

/**
 * 카탈로그를 서버에서 다시 받는다(이미지는 기다리지 않는다).
 *
 * loadRoomItems 는 한 번 받은 결과를 계속 쓰므로, 시트를 연 뒤 운영자가 가격을 바꾸면
 * 유료가 된 아이템을 무료로 알고 그냥 놓게 된다. 시트를 열 때와 아이템을 누를 때 이걸로 가격을 새로 맞춘다.
 * 받은 결과는 캐시도 갈아 끼운다. 실패하면 null — 쓰는 쪽은 가진 값으로 진행하고 서버 저장 검사에 맡긴다.
 */
export async function refreshRoomItems(): Promise<RoomItem[] | null> {
  try {
    const res = await fetch('/api/room-items', { cache: 'no-store' });
    if (!res.ok) return null;
    const items: RoomItem[] = (await res.json()).items ?? [];
    itemsPromise = Promise.resolve(items);
    return items;
  } catch {
    return null;
  }
}
