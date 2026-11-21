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





















@Service
@RequiredArgsConstructor
public class UserDeptScopeService {








	public static final String DEPT_SCOPE_SQL = "SELECT id FROM (WITH RECURSIVE dept_anc AS ("
			+ "SELECT id, parent_id FROM t_dept WHERE id IN ("
			+ "SELECT dept_id FROM t_user WHERE id = {0} AND dept_id IS NOT NULL "
			+ "UNION SELECT dept_id FROM t_user_dept WHERE user_id = {0} AND dept_id IS NOT NULL) "
			+ "UNION ALL SELECT d.id, d.parent_id FROM t_dept d JOIN dept_anc a ON d.id = a.parent_id) "
			+ "SELECT id FROM dept_anc) anc";


	private static final String ROOT_DEPT_PARENT_ID = "0";


	private static final int MAX_DEPT_DEPTH = 32;

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final DeptMapper deptMapper;

	/** 解析用户的可见组集合：主组 + 附加组 + 各自祖先链；返回 去重后的组 id 集合，按「主组 → 附加组 → 由近到远的祖先」顺序 */
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

	/** 用户被显式绑定的附加组（不含主组） */
	public List<String> listExtraDeptIds(String userId) {
		if (!StringUtils.hasText(userId)) {
			return new ArrayList<>();
		}
		return userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, userId)).stream()
				.map(UserDept::getDeptId).filter(StringUtils::hasText).distinct()
				.collect(java.util.stream.Collectors.toList());
	}

}
