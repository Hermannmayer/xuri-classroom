package cn.surveyking.server.mcp;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
















public final class McpToolCatalog {


	public static final int PAGE_LIMIT = 100;

	private static final String EMPTY_SCHEMA = "{\"type\":\"object\",\"properties\":{}}";

	private static final String PROJECT_ID_PROPERTY = """
			"id": {"type": "string", "description": "项目 id"}""";

	private static final String IDEMPOTENCY_PROPERTY = """
			"idempotencyKey": {"type": "string", "description": "必填。幂等键：同一个键重复调用只会执行一次，第二次直接回放第一次的结果"}""";

	private static final List<McpToolDefinition> ALL = List.of(
			new McpToolDefinition("sk_capabilities", "能力清单",
					"返回当前令牌能用哪些工具、每个工具需要的权限、可用题型与各项限制。不需要任何额外权限，建议第一步先调它",
					null, false, EMPTY_SCHEMA),
			new McpToolDefinition("sk_project_list", "项目列表",
					"分页列出当前用户可见的考试 / 问卷（只读）。需要 project:list 权限",
					"project:list", false, """
							{
							  "type": "object",
							  "properties": {
							    "mode": {"type": "string", "enum": ["survey", "exam"], "description": "survey=问卷，exam=考试；不传则两者都列"},
							    "keyword": {"type": "string", "description": "按名称模糊搜索"},
							    "category": {"type": "string", "description": "按分类名过滤"},
							    "current": {"type": "integer", "minimum": 1, "description": "页码，默认 1"},
							    "pageSize": {"type": "integer", "minimum": 1, "maximum": 100, "description": "每页条数，默认 20，最大 100"}
							  }
							}
							"""),
			new McpToolDefinition("sk_project_get", "项目详情",
					"读取一个项目的完整内容（含整卷 schema 与考试设置，只读）。需要 project:detail 权限",
					"project:detail", false, """
							{
							  "type": "object",
							  "properties": {
							""" + PROJECT_ID_PROPERTY + """
							  },
							  "required": ["id"]
							}
							"""),
			new McpToolDefinition("sk_project_validate", "校验试卷",
					"只校验不落库：题量、分值、选项、正确答案、字典引用完整性。传 projectId 校验已有项目，或直接传 schema 校验草稿。需要 project:detail 权限",
					"project:detail", false, """
							{
							  "type": "object",
							  "properties": {
							    "projectId": {"type": "string", "description": "校验已有项目：读它的 schema"},
							    "schema": {"type": "object", "description": "校验一份草稿 schema（与 projectId 二选一）"},
							    "mode": {"type": "string", "enum": ["survey", "exam"], "description": "草稿的用途，默认 exam"}
							  }
							}
							"""),
			new McpToolDefinition("sk_project_create", "新建项目",
					"新建考试 / 问卷（默认未发布）。写操作，必须带 idempotencyKey。需要 project:create 权限",
					"project:create", true, """
							{
							  "type": "object",
							  "properties": {
							    "name": {"type": "string", "description": "项目名称"},
							    "mode": {"type": "string", "enum": ["survey", "exam"], "description": "默认 exam"},
							    "category": {"type": "string", "description": "分类名，可空"},
							    "survey": {"type": "object", "description": "整卷 schema，结构与 sk_project_get 返回的 survey 相同"},
							    "setting": {"type": "object", "description": "考试设置，可空（服务端会补齐默认值）"},
							""" + IDEMPOTENCY_PROPERTY + """
							  },
							  "required": ["name", "survey", "idempotencyKey"]
							}
							"""),
			new McpToolDefinition("sk_project_update", "修改项目",
					"修改项目名称 / 分类 / 整卷 schema / 设置；只传要改的字段即可。写操作，必须带 idempotencyKey。需要 project:update 权限",
					"project:update", true, """
							{
							  "type": "object",
							  "properties": {
							""" + PROJECT_ID_PROPERTY + """
							    ,"name": {"type": "string", "description": "新名称，不传则不改"},
							    "category": {"type": "string", "description": "分类名；传空串表示清空分类"},
							    "survey": {"type": "object", "description": "整卷 schema，不传则不改"},
							    "setting": {"type": "object", "description": "考试设置，不传则不改"},
							""" + IDEMPOTENCY_PROPERTY + """
							  },
							  "required": ["id", "idempotencyKey"]
							}
							"""),
			new McpToolDefinition("sk_project_publish", "发布 / 停收",
					"开启或关闭答卷收集（status=1 开启，0 关闭）。写操作，必须带 idempotencyKey。需要 project:publish 权限",
					"project:publish", true, """
							{
							  "type": "object",
							  "properties": {
							""" + PROJECT_ID_PROPERTY + """
							    ,"status": {"type": "integer", "enum": [0, 1], "description": "1=开启收集，0=停止收集"},
							""" + IDEMPOTENCY_PROPERTY + """
							  },
							  "required": ["id", "status", "idempotencyKey"]
							}
							"""),
			new McpToolDefinition("sk_report_get", "答卷报表",
					"读答卷统计（只读）：view=summary 总量与每日趋势；view=questions 逐题统计（最小/最大/平均/合计）；view=exam 逐题选项分布。需要 project:report 权限",
					"project:report", false, """
							{
							  "type": "object",
							  "properties": {
							    "projectId": {"type": "string", "description": "项目 id"},
							    "view": {"type": "string", "enum": ["summary", "questions", "exam"], "description": "默认 summary"},
							    "classId": {"type": "string", "description": "按班级过滤，可空；view=exam 时忽略"}
							  },
							  "required": ["projectId"]
							}
							"""),
			new McpToolDefinition("sk_export_create", "发起导出",
					"发起「导出答卷 PDF」异步任务（按班级 / 勾选若干份 / 整卷都行），立刻返回 jobId，进度用 sk_export_get 轮询。写操作，必须带 idempotencyKey。需要 answer:export 权限",
					"answer:export", true, """
							{
							  "type": "object",
							  "properties": {
							    "projectId": {"type": "string", "description": "项目 id"},
							    "classId": {"type": "string", "description": "班级 id，可空：不传=整卷（或按 ids 勾选导出），此时要求项目所有者/协作者"},
							    "attemptNo": {"type": "integer", "description": "只导第几次作答（从 0 开始），可空=全部轮次"},
							    "includeAnalysis": {"type": "boolean", "description": "是否附答案解析，默认 false（考试没结束放解析等于泄题）"},
							    "includeImages": {"type": "boolean", "description": "是否附签名/上传题图片，默认 false"},
							    "ids": {"type": "array", "items": {"type": "string"}, "description": "只导指定答卷 id（勾选导出），可空；与 classId 同时为空即整卷"},
							    "startTime": {"type": "string", "description": "提交时间下限，格式 yyyy-MM-dd HH:mm:ss，可空"},
							    "endTime": {"type": "string", "description": "提交时间上限，格式 yyyy-MM-dd HH:mm:ss，可空"},
							""" + IDEMPOTENCY_PROPERTY + """
							  },
							  "required": ["projectId", "idempotencyKey"]
							}
							"""),
			new McpToolDefinition("sk_export_get", "导出进度",
					"查导出任务进度（只读）：status=queued|running|done|failed|canceled，带 done/total/progress/fileName。需要 answer:export 权限",
					"answer:export", false, """
							{
							  "type": "object",
							  "properties": {
							    "jobId": {"type": "string", "description": "sk_export_create 返回的任务 id"}
							  },
							  "required": ["jobId"]
							}
							"""));

	private McpToolCatalog() {
	}

	/** 全部工具（顺序即 tools/list 的顺序） */
	public static List<McpToolDefinition> all() {
		return ALL;
	}

	public static Optional<McpToolDefinition> find(String name) {
		if (name == null) {
			return Optional.empty();
		}
		return ALL.stream().filter(tool -> tool.name().equals(name)).findFirst();
	}

	/** 按令牌白名单过滤 */
	public static List<McpToolDefinition> visibleTo(McpCaller caller) {
		List<McpToolDefinition> result = new ArrayList<>(ALL.size());
		for (McpToolDefinition tool : ALL) {
			if (caller == null || caller.allowsTool(tool.name())) {
				result.add(tool);
			}
		}
		return result;
	}

	public static List<String> names() {
		return ALL.stream().map(McpToolDefinition::name).toList();
	}

}
