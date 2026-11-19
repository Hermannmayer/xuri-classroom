import { message } from 'antd';

/**
 * 错误提示去重：同一句话在窗口期内只弹一次。
 *
 * <p>为什么需要：一页一题的练习/错题本会并发逐题取题，一次网络或服务端故障会连弹十几个
 * 「服务出了点问题」，把屏幕糊满、还看不出真正的错误。这里按文案（或调用方给的 key）去重，
 * 保证一次故障只提示一次。
 */
const lastShown = new Map<string, number>();

export function notifyErrorOnce(text: string, key?: string, windowMs = 3000): void {
  const dedupeKey = key ?? text;
  const now = Date.now();
  const previous = lastShown.get(dedupeKey);
  if (previous !== undefined && now - previous < windowMs) {
    return;
  }
  lastShown.set(dedupeKey, now);
  // 顺手清掉过期键，避免长期使用时 Map 无限增长
  if (lastShown.size > 50) {
    for (const [k, at] of lastShown) {
      if (now - at > windowMs) lastShown.delete(k);
    }
  }
  message.error(text);
}
