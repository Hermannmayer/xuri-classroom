package cn.surveyking.server.ai.domain;

import lombok.Data;

import java.util.List;

/**
 * 侧栏 AI 助手的对话请求（{@code POST /api/ai/chat}）。
 *
 * <p>三点约定：
 * <ol>
 * <li>前端只传 {@code user} / {@code assistant} 两种角色：<b>system 由后端生成</b>。
 * 前端即使传了 {@code system} 也会在服务层被丢掉——否则任何人在浏览器控制台里改一句，
 * 就能让模型扮演任意角色（特别是绕过「不要编造数据」那条）。</li>
 * <li>最后一条必须是 {@code user}：前端点发送时把这一问追加进列表再提交。</li>
 * <li>{@link Context} 只放「定位」（路由、路径里的 id），不放任何可以直接改写系统提示的自由文本；
 * 试卷名、题干这些由后端按 id 查库再填进提示词，防止有人拿它注入提示词。</li>
 * </ol>
 *
 * @author ai-sidebar
 */
@Data
public class AiChatRequest {

	/**
	 * 对话消息，顺序即对话顺序。单次最多保留最近若干条（由服务层裁剪），
	 * 因为每轮都要把全部历史重新发给模型，条数越多越贵。
	 */
	private List<Message> messages;

	/** 当前页面上下文；为空表示只问通用问题 */
	private Context context;

	/** 指定模型；为空用系统设置里的默认模型 */
	private String model;

	@Data
	public static class Message {

		/** user / assistant（system 会被忽略） */
		private String role;

		private String content;

	}

	/**
	 * 当前页面上下文：全部是「在哪一页、哪个 id」，由前端从路由推断。
	 * <p>不允许放文案：文案一律由后端按 id 查库生成（见 {@code AiAssistantServiceImpl}）。
	 */
	@Data
	public static class Context {

		/** 当前路由，如 /survey/1/edit */
		private String route;

		/** 页面名称，如「试卷编辑器」 */
		private String page;

		/** 试卷/项目 id（可空） */
		private String projectId;

		/** 当前题目 id（可空；只在项目里查得到才算数） */
		private String questionId;

		/** 当前答卷 id（可空；页面把答卷 id 写进 URL 或推给侧栏时才有） */
		private String answerId;

	}

}
