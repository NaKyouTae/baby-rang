type Result = { value: string | null; error?: boolean };
type Request = { requestId: string; action: 'open' | 'cancel'; title?: string; value?: string; mode?: 'dateTime' | 'time' };
interface PickerWindow {
  webkit?: { messageHandlers?: { dateTimePicker?: { postMessage: (request: Request) => void } } };
  Android?: { dateTimePicker?: (json: string) => void };
  __dateTimePickerBridge?: { resolve: (id: string, result: Result) => void };
}
const pending = new Map<string, (result: Result) => void>();
let sequence = 0;
export function openNativeDateTimePicker(title: string, value: string,
  onResult: (result: Result) => void, mode: 'dateTime' | 'time' = 'dateTime'): (() => void) | null {
  const w = window as unknown as PickerWindow;
  const ios = w.webkit?.messageHandlers?.dateTimePicker;
  if (!ios && !w.Android?.dateTimePicker) return null;
  const send = (request: Request) => {
    if (ios) ios.postMessage(request);
    else w.Android!.dateTimePicker!(JSON.stringify(request));
  };
  w.__dateTimePickerBridge ??= { resolve(id, result) {
    const callback = pending.get(id);
    pending.delete(id);
    if (result.value !== null && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(result.value)) {
      callback?.({ value: null, error: true });
    } else callback?.(result);
  } };
  const requestId = `date-picker-${Date.now()}-${++sequence}`;
  pending.set(requestId, onResult);
  try { send({ requestId, action: 'open', title, value, mode }); }
  catch { pending.delete(requestId); return null; }
  return () => {
    if (!pending.delete(requestId)) return;
    try { send({ requestId, action: 'cancel' }); } catch { /* already closed */ }
  };
}
