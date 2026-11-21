import { message } from 'antd';








const lastShown = new Map<string, number>();

export function notifyErrorOnce(text: string, key?: string, windowMs = 3000): void {
  const dedupeKey = key ?? text;
  const now = Date.now();
  const previous = lastShown.get(dedupeKey);
  if (previous !== undefined && now - previous < windowMs) {
    return;
  }
  lastShown.set(dedupeKey, now);

  if (lastShown.size > 50) {
    for (const [k, at] of lastShown) {
      if (now - at > windowMs) lastShown.delete(k);
    }
  }
  message.error(text);
}
