package cn.surveyking.server.service;

import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 「用户能看到哪些用户组」的唯一出口：主组（t_user.dept_id）+ 附加组（t_user_dept）+ 各组祖先链。
 *
 * <p>
 * 背景：附加组过去只参与权限与有效期，不参与数据可见范围 —— 题库/考试按组授权、题库模板可读性这些
 * SQL 都只认 t_user.dept_id，导致「授权给附加组 B、主组是 A」的老师看不到东西。这里把口径收敛成
 * 一份，各处直接复用，避免 5 份 SQL 各改各的。
 *
 * <p>
 * 两种消费方式，语义完全一致：
 * <ul>
 * <li>{@link #DEPT_SCOPE_SQL}：给 {@code apply(sql, userId)} / {@code exists(sql, userId)} 这种
 * 「SQL 里带 {0} 占位符」的场景用，返回可见组 id 的子查询（含祖先链）；</li>
 * <li>{@link #resolveDeptScope(String)}：给能用 Wrapper 的 {@code in(...)} 的场景用，返回 Java 集合。</li>
 * </ul>
 *
 * <p>
 * 调用约定：一次操作里只解析一次，不要在循环里反复调用（SQL 版本由数据库一次算完）。
 * 匿名用户（userId 为空）返回空集合，调用方应跳过部门条件，保持原有公开逻辑。
 */
@Service
@RequiredArgsConstructor
public class UserDeptScopeService {

	/**
	 * 可见组 id 的子查询（占位符 {0} = 用户 id），已包含主组、附加组与各自的祖先链。
	 *
	 * <p>
	 * 用法：{@code apply("dept_id IS NOT NULL AND dept_id IN (" + UserDeptScopeService.DEPT_SCOPE_SQL + ")", userId)}。
	 * 与改造前的单主组版本相比，唯一区别是递归起点从「一个主组」变成「主组 ∪ 附加组」。
	 */
	public static final String DEPT_SCOPE_SQL = "SELECT id FROM (WITH RECURSIVE dept_anc AS ("
			+ "SELECT id, parent_id FROM t_dept WHERE id IN ("
			+ "SELECT dept_id FROM t_user WHERE id = {0} AND dept_id IS NOT NULL "
			+ "UNION SELECT dept_id FROM t_user_dept WHERE user_id = {0} AND dept_id IS NOT NULL) "
			+ "UNION ALL SELECT d.id, d.parent_id FROM t_dept d JOIN dept_anc a ON d.id = a.parent_id) "
			+ "SELECT id FROM dept_anc) anc";

	/** 组织树的根 parent_id（t_dept 里顶层节点的 parent_id 是 "0"） */
	private static final String ROOT_DEPT_PARENT_ID = "0";

	/** 祖先链最多走多少层，防脏数据成环卡死 */
	private static final int MAX_DEPT_DEPTH = 32;

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final DeptMapper deptMapper;

	/**
	 * 解析用户的可见组集合：主组 + 附加组 + 各自祖先链。
	 * @param userId 用户 id；为空（匿名）时返回空集合
	 * @return 去重后的组 id 集合，按「主组 → 附加组 → 由近到远的祖先」顺序
	 */
	public Set<String> resolveDeptScope(String userId) {
		Set<String> scope = new LinkedHashSet<>();
		if (!StringUtils.hasText(userId)) {
			return scope;
		}
		List<String> roots = new ArrayList<>();
		User user = userMapper.selectById(userId);
		if (user != null && StringUtils.hasText(user.getDeptId())) {
			roots.add(user.getDeptId());
		}
		roots.addAll(listExtraDeptIds(userId));
		for (String root : roots) {
			// 沿 parent_id 往上走；已收录的节点直接停，天然防环
			String cursor = root;
			int depth = 0;
			while (StringUtils.hasText(cursor) && !ROOT_DEPT_PARENT_ID.equals(cursor) && scope.add(cursor)
					&& depth++ < MAX_DEPT_DEPTH) {
				Dept dept = deptMapper.selectById(cursor);
				cursor = dept == null ? null : dept.getParentId();
			}
		}
		return scope;
	}

	/** 用户被显式绑定的附加组（不含主组）。 */
	public List<String> listExtraDeptIds(String userId) {
		if (!StringUtils.hasText(userId)) {
			return new ArrayList<>();
		}
		return userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, userId)).stream()
				.map(UserDept::getDeptId).filter(StringUtils::hasText).distinct()
				.collect(java.util.stream.Collectors.toList());
	}

}
