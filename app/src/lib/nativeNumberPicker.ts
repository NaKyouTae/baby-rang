export interface NumberPickerOption { value: number; label: string }
type Result = { index: number | null; error?: boolean };
type Request = { requestId: string; action: 'open' | 'cancel'; title?: string; labels?: string[]; selectedIndex?: number };
interface PickerWindow {
  webkit?: { messageHandlers?: { numberPicker?: { postMessage: (request: Request) => void } } };
  Android?: { numberPicker?: (json: string) => void };
  __numberPickerBridge?: { resolve: (id: string, result: Result) => void };
}
const pending = new Map<string, (result: Result) => void>();
let sequence = 0;

export function numberPickerOptions(value: number, min: number, max: number, step: number,
  decimals: number, unit = ''): NumberPickerOption[] {
  const values = Array.from({ length: Math.round((max - min) / step) + 1 },
    (_, i) => Number((min + i * step).toFixed(decimals)));
  if (Number.isFinite(value) && !values.includes(value)) values.push(value);
  return values.sort((a, b) => a - b).map(value => ({ value,
    label: `${decimals ? value.toFixed(decimals) : value}${unit}` }));
}

/** 미지원 구버전 앱과 브라우저는 null을 반환해 웹 휠을 사용한다. */
export function openNativeNumberPicker(title: string, options: NumberPickerOption[], value: number,
  onResult: (result: { value: number | null; error?: boolean }) => void): (() => void) | null {
  const w = window as unknown as PickerWindow;
  const ios = w.webkit?.messageHandlers?.numberPicker;
  const android = w.Android?.numberPicker;
  if (!ios && !android) return null;
  const send = (request: Request) => {
    if (ios) ios.postMessage(request);
    else w.Android!.numberPicker!(JSON.stringify(request));
  };
  w.__numberPickerBridge ??= { resolve(id, result) {
    const callback = pending.get(id);
    pending.delete(id);
    callback?.(result);
  } };
  const requestId = `picker-${Date.now()}-${++sequence}`;
  pending.set(requestId, result => {
    const option = result.index === null ? undefined : options[result.index];
    onResult({ value: option?.value ?? null, error: result.error || (result.index !== null && !option) });
  });
  try {
    send({ requestId, action: 'open', title, labels: options.map(option => option.label),
      selectedIndex: Math.max(0, options.findIndex(option => option.value === value)) });
  } catch {
    pending.delete(requestId);
    return null;
  }
  return () => {
    if (!pending.delete(requestId)) return;
    try { send({ requestId, action: 'cancel' }); } catch { /* already closed */ }
  };
}
