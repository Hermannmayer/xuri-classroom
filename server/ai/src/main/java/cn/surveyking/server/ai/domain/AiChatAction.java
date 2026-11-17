package cn.surveyking.server.ai.domain;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 一次对话里「AI 真的做了什么」的结构化结果。
 *
 * <p>为什么不让模型把结果写成一段话就完事：批改、组卷、体检这些动作要能给用户
 * <b>可点的东西</b>——进度条、去查看、撤销、预填参数。纯文本只能说「我批完了」，
 * 用户既看不到批了几份，也没法反悔。所以正文照旧给一句话，细节放在这里由界面渲染成卡片。
 *
 * <p>key 的取值：
 * <ul>
 * <li>{@code grade_batch}：已发起批量 AI 批改（带 jobId / undoToken）；</li>
 * <li>{@code open_tool}：已定位到某个工具（带 tool + params，由页面打开对应弹窗）；</li>
 * <li>{@code answer_query}：统计类直答（没批多少、谁没交）；</li>
 * <li>{@code usage_query}：额度查询；</li>
 * <li>{@code none}：没有动作（普通聊天，不返回该对象）。</li>
 * </ul>
 *
 * @author ai-actions
 */
@Data
public class AiChatAction {

	/** 动作标识 */
	private String key;

	/** 状态：info（已定位）/ running（后台任务已开始）/ done / failed */
	private String status;

	/** 卡片标题，例如「正在批改 12 份答卷」 */
	private String title;

	/** 中文摘要，卡片正文 */
	private String summary;

	/** 需要前端打开的工具：paper_pick / paper_check / repo_audit / recommend_practice / notice_draft / rewrite_question */
	private String tool;

	/** 「去查看」的站内地址（前端直接 navigate） */
	private String link;

	/** 后台任务 id（有就轮询 /api/ai/paper/job/{jobId} 拿进度与结果） */
	private String jobId;

	/** 撤销令牌（批量批改返回） */
	private String undoToken;

	/** 打开工具时预填的参数（只放 id 与简单标量，不放文案） */
	private Map<String, Object> params = new LinkedHashMap<>();

}
