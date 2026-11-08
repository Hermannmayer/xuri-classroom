package cn.surveyking.server.core.constant;

import lombok.Getter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 权限目录：权限串的唯一来源，供「角色权限矩阵」页面列出可勾选项。
 *
 * <p>
 * 盘点依据 docs/permissions.md：
 * <ul>
 * <li>第 2 节的 56 个权限串，全部来自 {@code @PreAuthorize("hasAuthority('...')")}，
 * 这类条目的 {@code suggested=false}；</li>
 * <li>第 4 节建议新增的条目，{@code suggested=true}，本版本只进目录、暂未接到注解上，
 * 勾选后对现有接口没有实际约束力，等后续接口补注解时即可生效。</li>
 * </ul>
 *
 * <p>
 * 权限串保持「域:对象:动作」约定；分组仅用于展示排序，不参与鉴权。
 * 权限目录分两类听众：管理权限（管理员自动全量）与 {@code studentOnly} 学员能力
 * （开始答题/开始练习/错题本/学员视角）。学员能力不自动注入管理员，避免
 * 「管理员=全部权限」和「管理员不该看到开始答题」互相打架。
 * 注意：{@code t_role.authority} 里还存在 {@code answer}、{@code system:role}、{@code position}
 * 这类历史遗留的前缀串（早期权限提取器把层级前缀一并写库），它们不是真正的权限点，不在本目录内，
 * 前端保存角色权限时应原样保留，避免误删。
 *
 * @author perm-matrix
 */
@Getter
public enum PermissionEnum {

	/* ---------------------------------------------------------------- 考试 / 项目 */

	PROJECT_LIST("project:list", "查看考试列表", Group.EXAM, "考试与问卷列表；学员的「我的考试」用 exercise:list 兜底"),
	PROJECT_DETAIL("project:detail", "查看考试详情", Group.EXAM, "读取考试基本信息与设置、答题页与预览"),
	PROJECT_CREATE("project:create", "新建考试", Group.EXAM, "新建考试/问卷、复制、从回收站恢复"),
	PROJECT_UPDATE("project:update", "编辑考试", Group.EXAM, "保存题目、修改考试设置"),
	PROJECT_DELETE("project:delete", "删除考试", Group.EXAM, "移入回收站；回收站内的项目不会被物理删除"),
	PROJECT_REPORT("project:report", "查看考试报表", Group.EXAM, "按题目统计的图表报表"),
	PROJECT_PUBLISH("project:publish", "开启/关闭收集", Group.EXAM, "关闭后学员打不开问卷，属于高风险操作", true),
	PROJECT_PARTNER("project:partner", "协作者与班级授权", Group.EXAM, "把考试授权给协作者或班级，目前混在编辑考试里", false),
	PROJECT_ANSWER("project:answer", "开始答题", Group.EXAM, "进入考试/问卷答题页作答；学员功能，老师/管理员默认不给", false, true),

	/* ---------------------------------------------------------------- 答卷 */

	ANSWER_LIST("answer:list", "查看答卷列表", Group.ANSWER, "答卷列表与答卷数据页"),
	ANSWER_DETAIL("answer:detail", "查看单份答卷", Group.ANSWER, "查看单份答卷的作答明细"),
	ANSWER_CREATE("answer:create", "补录答卷", Group.ANSWER, "后台代填、批量导入答卷"),
	ANSWER_UPDATE("answer:update", "修改答卷", Group.ANSWER, "改答卷内容与批注"),
	ANSWER_DELETE("answer:delete", "删除答卷", Group.ANSWER, "把答卷移入回收站"),
	ANSWER_EXPORT("answer:export", "导出答卷", Group.ANSWER, "导出 Excel，含作答人信息，可单独关闭"),
	ANSWER_UPLOAD("answer:upload", "上传答卷附件", Group.ANSWER, "为答卷补充附件材料"),
	ANSWER_RESTORE("answer:restore", "恢复答卷", Group.ANSWER, "从回收站恢复答卷，与删除答卷对称", false),

	/* ---------------------------------------------------------------- 题库 */

	REPO_LIST("repo:list", "查看题库列表", Group.REPO, "题库列表、练习册入口"),
	REPO_DETAIL("repo:detail", "查看题库详情", Group.REPO, "读取题库信息与题目；学员靠它浏览题库"),
	REPO_CREATE("repo:create", "新建题库", Group.REPO, "新建题库、从题库复制"),
	REPO_UPDATE("repo:update", "编辑题库", Group.REPO, "改题库、改题目、导入题目"),
	REPO_DELETE("repo:delete", "删除题库", Group.REPO, "删题库/删题目；代价高，建议改为归档"),
	REPO_BOOK("repo:book", "错题本/收藏", Group.REPO, "错题本与收藏，属于学员功能；练习入口已拆到 repo:practice", false, true),
	REPO_PRACTICE("repo:practice", "开始练习", Group.REPO, "题库的开始/随机/继续练习；学员功能，老师/管理员默认不给", false, true),
	REPO_EXPORT("repo:export", "导出题库", Group.REPO, "题库是最核心资产，导出必须能单独关闭"),
	REPO_IMPORT("repo:import", "导入题库", Group.REPO, "批量导入题目，建议配合操作日志"),
	REPO_GRANT("repo:grant", "题库授权给组", Group.REPO, "把题库授权给班级；与「编辑题库」分开，避免随手扩大可见范围", false),

	/* ---------------------------------------------------------------- 题目 */

	TEMPLATE_LIST("template:list", "查看题目列表", Group.TEMPLATE, "题目列表与题目详情"),
	TEMPLATE_CREATE("template:create", "新增题目", Group.TEMPLATE, "新建题目并入库"),
	TEMPLATE_UPDATE("template:update", "修改题目", Group.TEMPLATE, "修改题干、选项与属性"),
	TEMPLATE_DELETE("template:delete", "删除题目", Group.TEMPLATE, "删除题库中的题目，不可恢复"),

	/* ---------------------------------------------------------------- 练习 */

	EXERCISE_LIST("exercise:list", "练习记录与练习页", Group.EXERCISE, "我的练习、练习作答；同时给考试列表兜底"),

	/* ---------------------------------------------------------------- 班级 */

	CLASS_LIST("class:list", "查看班级管理", Group.CLASS, "班级管理页入口；班主任看自己创建/负责的班，其他人看被授权的班"),
	CLASS_DETAIL("class:detail", "查看班级成员与学情", Group.CLASS, "查看班级成员名单与成员信息"),
	CLASS_GRANT("class:grant", "分配班级给老师", Group.CLASS, "把班级的查看权限分配给老师；拥有者可看到全部班级用于分配"),
	CLASS_MEMBER_CREATE("class:member:create", "在班级中新增学员", Group.CLASS, "班主任在自己可见的班里添加学员账号"),
	CLASS_MEMBER_UPDATE("class:member:update", "编辑班级学员", Group.CLASS, "改学员姓名/联系方式/状态、重置密码；不改角色与所属组"),
	CLASS_MEMBER_DELETE("class:member:delete", "删除班级学员", Group.CLASS, "删除学员账号；管理员与班主任可用"),

	/* ---------------------------------------------------------------- 文件 */

	FILE_LIST("file:list", "查看附件列表", Group.FILE, "附件与导入文件列表"),
	FILE_DETAIL("file:detail", "下载/预览附件", Group.FILE, "按 id 读取附件内容"),
	FILE_IMPORT("file:import", "导入文件", Group.FILE, "上传并导入外部文件"),
	FILE_DELETE("file:delete", "删除文件", Group.FILE, "删除已上传的附件"),

	/* ---------------------------------------------------------------- 用户 */

	USER_UPDATE("user:update", "修改本人资料", Group.USER, "改自己的资料与密码，三个角色都应具备"),
	USER_IMPORT("user:import", "批量导入用户", Group.USER, "目前隐含在新建用户里，单独拆出来便于审计", false),

	/* ---------------------------------------------------------------- 系统 */

	SYSTEM_USER_LIST("system:user:list", "查看用户列表", Group.SYSTEM, "用户管理列表、协作者候选"),
	SYSTEM_USER_CREATE("system:user:create", "新建用户", Group.SYSTEM, "后台创建账号"),
	SYSTEM_USER_UPDATE("system:user:update", "修改用户", Group.SYSTEM, "改用户资料、状态与角色"),
	SYSTEM_USER_DELETE("system:user:delete", "删除用户", Group.SYSTEM, "删除账号并清理角色关联"),
	SYSTEM_ROLE_LIST("system:role:list", "查看角色", Group.SYSTEM, "角色列表与权限目录；权限矩阵页的进入条件"),
	SYSTEM_ROLE_CREATE("system:role:create", "新建角色", Group.SYSTEM, "新建角色并授予权限"),
	SYSTEM_ROLE_UPDATE("system:role:update", "修改角色", Group.SYSTEM, "改角色信息与权限串；权限矩阵保存所需"),
	SYSTEM_ROLE_DELETE("system:role:delete", "删除角色", Group.SYSTEM, "删除角色；至少保留一个角色"),
	SYSTEM_DEPT_LIST("system:dept:list", "查看用户组", Group.SYSTEM, "用户组（班级）树"),
	ORG_LIST("org:list", "读取组织树", Group.SYSTEM, "只读组织树，供题库/考试授权选组；不含用户组管理"),
	USER_SELECT("user:select", "读取用户候选", Group.SYSTEM, "只读用户 id/姓名/组，供授权选人；不含用户管理"),
	SYSTEM_DEPT_CREATE("system:dept:create", "新建用户组", Group.SYSTEM, "新建分组、调整分组排序"),
	SYSTEM_DEPT_UPDATE("system:dept:update", "修改用户组", Group.SYSTEM, "重命名、调整上级分组"),
	SYSTEM_DEPT_DELETE("system:dept:delete", "删除用户组", Group.SYSTEM, "删除分组；至少保留一个分组"),
	SYSTEM_DICT_LIST("system:dict:list", "查看数据字典", Group.SYSTEM, "字典列表（前端入口已裁剪，权限仍在）"),
	SYSTEM_DICT_CREATE("system:dict:create", "新建字典", Group.SYSTEM, "新增字典"),
	SYSTEM_DICT_UPDATE("system:dict:update", "修改字典", Group.SYSTEM, "改字典"),
	SYSTEM_DICT_DELETE("system:dict:delete", "删除字典", Group.SYSTEM, "删除字典"),
	SYSTEM_DICT_ITEM_LIST("system:dictItem:list", "查看字典项", Group.SYSTEM, "字典项列表"),
	SYSTEM_DICT_ITEM_CREATE("system:dictItem:create", "新建字典项", Group.SYSTEM, "新增字典项"),
	SYSTEM_DICT_ITEM_UPDATE("system:dictItem:update", "修改字典项", Group.SYSTEM, "改字典项"),
	SYSTEM_DICT_ITEM_IMPORT("system:dictItem:import", "导入字典项", Group.SYSTEM, "批量导入字典项"),
	SYSTEM_DICT_ITEM_DELETE("system:dictItem:delete", "删除字典项", Group.SYSTEM, "删除字典项"),
	SYSTEM_SETTING_UPDATE("system:setting:update", "修改系统设置", Group.SYSTEM, "水印、防复制、协作者策略都在这里；现在靠查看角色兜底，必须独立", false),
	SYSTEM_LOG_LIST("system:log:list", "查看操作日志", Group.SYSTEM, "审计能力的前提：谁导出了什么、谁改了谁的权限"),

	/* ---------------------------------------------------------------- 内容保护 */

	FILE_UPLOAD("file:upload", "通用文件上传", Group.FILE, "系统 Logo 等通用上传；与「导入模板/题库文件」分开", false),
	TEMPLATE_IMPORT("template:import", "批量导入题目", Group.TEMPLATE, "从 Excel/题库文件导入题目；与 repo:import 区分：这里只进题目", false),
	SYSTEM_USER_CREATE_STUDENT("system:user:create:student", "新建学员", Group.SYSTEM, "只能创建「不含任何 system:* 权限」的角色（学员）", false),
	SYSTEM_USER_CREATE_TEACHER("system:user:create:teacher", "新建老师/职工", Group.SYSTEM, "可创建带 system:* 权限的角色；比新建学员高一档", false),
	PORTAL_STUDENT("portal:student", "学员视角", Group.PORTAL, "显示「我的任务」：考试安排 / 练习记录 / 我的成绩", false, true),
	PORTAL_TEACHER("portal:teacher", "教师视角", Group.PORTAL, "显示「教学管理」与「班级学情」", false),
	PORTAL_ADMIN("portal:admin", "管理视角", Group.PORTAL, "显示系统管理（用户 / 用户组 / 系统设置 / 权限 / 日志）", false),
	CONTENT_PROTECT("content:protect", "水印与防复制策略", Group.CONTENT, "全站水印与防复制开关；文档里标注可与修改系统设置二选一", true);

	/* ---------------------------------------------------------------- 其它 */


	private final String code;

	/** 中文名，权限矩阵里的主标题 */
	private final String name;

	/** 展示分组 */
	private final Group group;

	/** 一句话说明，权限矩阵里的副标题 */
	private final String description;

	/** 是否为 docs/permissions.md 第 4 节建议新增、尚未接入注解的权限点 */
	private final boolean suggested;

	/**
	 * 学员专属权限：管理员虽然天然拥有全部权限，但这类权限不自动注入。
	 * 否则管理员界面会不断出现「开始答题 / 开始练习」，再靠前端逐个页面判断。
	 */
	private final boolean studentOnly;

	PermissionEnum(String code, String name, Group group, String description) {
		this(code, name, group, description, false, false);
	}

	PermissionEnum(String code, String name, Group group, String description, boolean suggested) {
		this(code, name, group, description, suggested, false);
	}

	PermissionEnum(String code, String name, Group group, String description, boolean suggested,
			boolean studentOnly) {
		this.code = code;
		this.name = name;
		this.group = group;
		this.description = description;
		this.suggested = suggested;
		this.studentOnly = studentOnly;
	}

	/**
	 * 权限分组：声明顺序即前端卡片的展示顺序。
	 */
	@Getter
	public enum Group {

		PORTAL("视角"), EXAM("考试"), ANSWER("答卷"), REPO("题库"), TEMPLATE("题目"), EXERCISE("练习"), CLASS("班级"), FILE("文件"), USER("用户"),
		SYSTEM("系统"), CONTENT("内容保护"), OTHER("其它");

		private final String label;

		Group(String label) {
			this.label = label;
		}

	}

	/**
	 * 单个权限点（目录接口的叶子节点）。
	 */
	@Getter
	public static class PermissionItem {

		private final String code;

		private final String name;

		private final String group;

		private final String description;

		private final boolean suggested;

		/** 学员专属权限，权限矩阵里可以单独标出来 */
		private final boolean studentOnly;

		PermissionItem(PermissionEnum permission) {
			this.code = permission.getCode();
			this.name = permission.getName();
			this.group = permission.getGroup().getLabel();
			this.description = permission.getDescription();
			this.suggested = permission.isSuggested();
			this.studentOnly = permission.isStudentOnly();
		}

	}

	/**
	 * 一个分组的权限点集合（目录接口的顶层节点）。
	 */
	@Getter
	public static class PermissionGroupView {

		private final String group;

		private final int total;

		private final List<PermissionItem> permissions;

		PermissionGroupView(String group, List<PermissionItem> permissions) {
			this.group = group;
			this.total = permissions.size();
			this.permissions = permissions;
		}

	}

	/**
	 * 目录按分组输出；空分组不出现在结果里。
	 * @return 按 {@link Group} 声明顺序排列的分组列表
	 */
	public static List<PermissionGroupView> grouped() {
		Map<Group, List<PermissionItem>> buckets = new LinkedHashMap<>();
		for (Group group : Group.values()) {
			buckets.put(group, new ArrayList<PermissionItem>());
		}
		for (PermissionEnum permission : values()) {
			buckets.get(permission.getGroup()).add(new PermissionItem(permission));
		}
		List<PermissionGroupView> result = new ArrayList<>();
		for (Map.Entry<Group, List<PermissionItem>> entry : buckets.entrySet()) {
			if (entry.getValue().isEmpty()) {
				continue;
			}
			result.add(new PermissionGroupView(entry.getKey().getLabel(), entry.getValue()));
		}
		return result;
	}

}