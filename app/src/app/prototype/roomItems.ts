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
