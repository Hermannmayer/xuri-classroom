/** 公告未读数的跨组件通知 */
export const NOTICE_UNREAD_EVENT = 'sk-notice-unread-changed';

/** 广播「未读数可能变了」；非浏览器环境（测试/预渲染）下静默忽略 */
export function notifyNoticeUnreadChanged() {
  try {
    window.dispatchEvent(new Event(NOTICE_UNREAD_EVENT));
  } catch {
    // 没有 window 时不用通知，调用方已经拿到最新数据
  }
}
