/**
 * 公告未读数的跨组件通知。
 *
 * <p>顶栏铃铛既按 60 秒轮询、也在 window focus 时刷新（4.6）。但「在站内点开一条公告」
 * 既不会触发 focus，也不一定落在下一次轮询上，铃铛会继续挂着旧数字，看起来像读不掉。
 * 公告中心读掉一条后广播这个事件，铃铛立刻重拉一次未读数。
 *
 * <p>常量放在这里，BasicLayout（经 NoticeBell）与公告中心都从这里取，避免两边写裸串。
 */
export const NOTICE_UNREAD_EVENT = 'sk-notice-unread-changed';

/** 广播「未读数可能变了」；非浏览器环境（测试/预渲染）下静默忽略 */
export function notifyNoticeUnreadChanged() {
  try {
    window.dispatchEvent(new Event(NOTICE_UNREAD_EVENT));
  } catch {
    // 没有 window 时不用通知，调用方已经拿到最新数据
  }
}
