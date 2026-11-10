package cn.surveyking.server.core.audit;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.Repo;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.RepoMapper;
import cn.surveyking.server.mapper.RoleMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 审计日志的「目标名称」解析：把 {@code targetId}（一串数字 id）翻译成人能看懂的名称。
 *
 * <p>由 {@link AuditAspect} 在 {@code joinPoint.proceed()} <b>之前</b>调用，因为删除类接口
 * 执行完以后对象已经不在了。约定：
 *
 * <ul>
 * <li>按 URI 前缀选择实体：{@code /system/dept/*} 与 {@code /teaching/classes/*} 都是
 * {@code t_dept}（班级就是用户组）；{@code /system/user/*} → 用户；{@code /system/role/*} → 角色；
 * {@code /project/*} → 考试；{@code /repo/*} → 题库；</li>
 * <li>创建类请求还没有 id，退回请求 DTO 里的 {@code name} 字段；</li>
 * <li>参数里没 {@code getId()} 时再试 {@code getDeptId()} / {@code getProjectId()} / {@code getRepoId()}
 * （授权、成员类请求的目标是「组 / 考试 / 题库」，不是被授权人）；</li>
 * <li>解析任何异常都吞掉，只留 debug 日志——审计不能影响业务。</li>
 * </ul>
 *
 * @author backend-ops
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditTargetResolver {

	private final DeptMapper deptMapper;

	private final UserMapper userMapper;

	private final RoleMapper roleMapper;

	private final ProjectMapper projectMapper;

	private final RepoMapper repoMapper;

	/**
	 * 解析目标名称；解析不到返回 null（前端会回退显示 targetId）。
	 * @param uri 请求 URI
	 * @param args Controller 方法参数
	 * @return 目标名称或 null
	 */
	public String resolve(String uri, Object[] args) {
		try {
			String path = pathOf(uri);
			if (!StringUtils.hasText(path)) {
				return null;
			}
			// 班级 = 用户组：teaching 的成员/老师授权请求携带的是 deptId
			if (path.startsWith("/system/dept") || path.startsWith("/teaching/classes")) {
				return resolveDeptName(args, path.startsWith("/teaching/classes"));
			}
			if (path.startsWith("/system/user")) {
				return resolveUserName(args);
			}
			if (path.startsWith("/system/role")) {
				return resolveRoleName(args);
			}
			if (path.startsWith("/project")) {
				// select* 是候选查询，本身不产生「目标对象」，不要拿 SelectUserRequest 的模糊查询词当名称
				if (path.contains("/select")) {
					return null;
				}
				return resolveProjectName(args);
			}
			if (path.startsWith("/repo")) {
				return resolveRepoName(args);
			}
			// 答卷类请求没有「答卷名称」，用所属考试名更可读
			if (path.startsWith("/answer")) {
				String projectName = joinNames(projectMapper, splitIds(firstArg(args, "projectId")),
						Project::getName);
				return StringUtils.hasText(projectName) ? projectName : nameFromArgs(args);
			}
			// 个人资料 / 界面偏好：目标就是当前登录用户
			if ("/user".equals(path) || path.startsWith("/user/")) {
				return resolveCurrentUserName();
			}
			return nameFromArgs(args);
		}
		catch (Exception e) {
			log.debug("解析审计目标名称失败 uri={}", uri, e);
			return null;
		}
	}

	private String resolveDeptName(Object[] args, boolean preferDeptId) {
		String id = preferDeptId ? firstArg(args, "deptId", "id") : firstArg(args, "id", "deptId");
		String name = joinNames(deptMapper, splitIds(id), Dept::getName);
		return StringUtils.hasText(name) ? name : nameFromArgs(args);
	}

	private String resolveUserName(Object[] args) {
		String name = joinNames(userMapper, splitIds(firstArg(args, "id")), User::getName);
		return StringUtils.hasText(name) ? name : nameFromArgs(args);
	}

	private String resolveRoleName(Object[] args) {
		String name = joinNames(roleMapper, splitIds(firstArg(args, "id")), Role::getName);
		return StringUtils.hasText(name) ? name : nameFromArgs(args);
	}

	private String resolveProjectName(Object[] args) {
		String name = joinNames(projectMapper, splitIds(firstArg(args, "projectId", "id")), Project::getName);
		return StringUtils.hasText(name) ? name : nameFromArgs(args);
	}

	private String resolveRepoName(Object[] args) {
		String name = joinNames(repoMapper, splitIds(firstArg(args, "repoId", "id")), Repo::getName);
		return StringUtils.hasText(name) ? name : nameFromArgs(args);
	}

	private String resolveCurrentUserName() {
		try {
			return joinNames(userMapper, splitIds(SecurityContextUtils.getUserId()), User::getName);
		}
		catch (Exception e) {
			return null;
		}
	}

	/** 批量 id → 名称；最多拼接 3 个，更多时给「等 N 个」 */
	private <T> String joinNames(BaseMapper<T> mapper, List<String> ids, Function<T, String> nameGetter) {
		if (ids == null || ids.isEmpty()) {
			return null;
		}
		List<T> rows;
		try {
			rows = mapper.selectBatchIds(ids);
		}
		catch (Exception e) {
			return null;
		}
		if (rows == null || rows.isEmpty()) {
			return null;
		}
		List<String> names = rows.stream().filter(Objects::nonNull).map(nameGetter).filter(StringUtils::hasText)
				.collect(Collectors.toList());
		if (names.isEmpty()) {
			return null;
		}
		if (names.size() == 1) {
			return names.get(0);
		}
		String head = names.stream().limit(3).collect(Collectors.joining("、"));
		return names.size() > 3 ? head + " 等" + names.size() + "个" : head;
	}

	/**
	 * 反射取第一个非空字符串参数。跳过 MultipartFile：它的 {@code getName()} 返回表单字段名，
	 * 会把「上传文件」的目标误记成 file。
	 */
	private static String firstArg(Object[] args, String... getters) {
		if (args == null || getters == null) {
			return null;
		}
		for (String getter : getters) {
			for (Object arg : args) {
				if (arg == null || arg instanceof CharSequence || arg instanceof Number || arg instanceof Collection
						|| arg instanceof Map || arg instanceof MultipartFile) {
					continue;
				}
				try {
					Method method = arg.getClass().getMethod(getter);
					Object value = method.invoke(arg);
					if (value == null) {
						continue;
					}
					String text = String.valueOf(value).trim();
					if (StringUtils.hasText(text)) {
						return text;
					}
				}
				catch (Exception ignored) {
					// 参数没有这个 getter 是常态，继续找下一个
				}
			}
		}
		return null;
	}

	/** 创建/修改类请求：直接取 DTO 的 name；模糊查询用的「%xxx%」不当名称 */
	private static String nameFromArgs(Object[] args) {
		String name = firstArg(args, "getName");
		if (!StringUtils.hasText(name) || (name.startsWith("%") && name.endsWith("%"))) {
			return null;
		}
		return name;
	}

	private static List<String> splitIds(String raw) {
		if (!StringUtils.hasText(raw)) {
			return Collections.emptyList();
		}
		return Arrays.stream(raw.split(",")).map(String::trim).filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
	}

	private static String pathOf(String uri) {
		String path = uri == null ? "" : uri.trim();
		int queryIndex = path.indexOf('?');
		if (queryIndex >= 0) {
			path = path.substring(0, queryIndex);
		}
		if (path.startsWith("/api/")) {
			path = path.substring(4);
		}
		return path;
	}

}
