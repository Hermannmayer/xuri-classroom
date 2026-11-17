import NoticeCenter from './NoticeCenter';

/**
 * 公告管理台（系统管理 → 公告管理）。
 *
 * <p>与顶栏铃铛进入的只读中心（/notice）共用一份列表组件，区别只在 mode：
 * 这里能新建、编辑、发布、归档、删除，还有草稿与已归档两个分类；那里只能读和标记已读。
 * 谁的公告能发到哪一层由后端判（notice:manage:system 全站 / notice:manage:class 自己带的班）。
 */
export default function NoticeAdmin() {
  return <NoticeCenter mode="manage" />;
}
