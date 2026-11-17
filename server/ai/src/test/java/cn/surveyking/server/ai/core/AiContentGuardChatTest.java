package cn.surveyking.server.ai.core;

import cn.surveyking.server.core.exception.ErrorCodeException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 侧栏对话的两段纯逻辑：上下文块渲染（{@link AiPageContext}）与回复校验（{@link AiContentGuard#checkChatReply}）。
 *
 * <p>都是无依赖的静态方法，所以这个测试不需要 Spring、不需要数据库、不需要模型 key。
 * 覆盖的是「出问题时用户能感知到」的那几处：提示词里有没有分隔符、题干会不会把提示词撑爆、
 * 模型把系统提示念出来时拦不拦得住、超长回复会不会把侧栏撑爆。
 *
 * @author ai-sidebar
 */
class AiContentGuardChatTest {

	/* ====== 上下文块 ====== */

	@Test
	@DisplayName("上下文块：一行一个标签，整体被分隔符包住")
	void renderContextBlock() {
		LinkedHashMap<String, String> lines = new LinkedHashMap<>();
		lines.put("页面", "试卷编辑器");
		lines.put("试卷", "《养老护理员五级模拟卷》（考试）");
		String block = AiPageContext.render(lines);
		assertTrue(block.startsWith(AiPageContext.BEGIN), block);
		assertTrue(block.endsWith(AiPageContext.END), block);
		assertTrue(block.contains("- 页面：试卷编辑器"), block);
		assertTrue(block.contains("《养老护理员五级模拟卷》"), block);
	}

	@Test
	@DisplayName("上下文块：没有内容时给一句占位，不留分隔符")
	void renderEmptyContext() {
		assertEquals(AiPageContext.NONE, AiPageContext.render(null));
		assertEquals(AiPageContext.NONE, AiPageContext.render(new LinkedHashMap<>()));
		LinkedHashMap<String, String> blank = new LinkedHashMap<>();
		blank.put("页面", "  ");
		assertEquals(AiPageContext.NONE, AiPageContext.render(blank));
	}

	@Test
	@DisplayName("上下文块：值里换行被压成空格，超长值截断，行数过多时丢掉后面的")
	void renderContextTruncates() {
		LinkedHashMap<String, String> lines = new LinkedHashMap<>();
		lines.put("题干", "第一行\n第二行\n第三行");
		String block = AiPageContext.render(lines);
		assertFalse(block.contains("第一行\n第二行"), block);
		assertTrue(block.contains("第一行 第二行 第三行"), block);

		LinkedHashMap<String, String> longValue = new LinkedHashMap<>();
		longValue.put("题干", "字".repeat(AiPageContext.MAX_VALUE_CHARS + 50));
		String truncated = AiPageContext.render(longValue);
		assertTrue(truncated.contains("…"), truncated);

		LinkedHashMap<String, String> many = new LinkedHashMap<>();
		for (int index = 0; index < 40; index++) {
			many.put("第" + index + "项", "值".repeat(100));
		}
		String blockWithMany = AiPageContext.render(many);
		assertTrue(blockWithMany.contains("其余上下文略"), blockWithMany);
		assertTrue(blockWithMany.length() < AiPageContext.MAX_BLOCK_CHARS + 200, "上下文块超长了");
	}

	/* ====== 回复校验 ====== */

	@Test
	@DisplayName("正常回复：原样返回，只去掉首尾空白")
	void acceptNormalReply() {
		assertEquals("先复习四防，再做题。", AiContentGuard.checkChatReply("  先复习四防，再做题。\n"));
	}

	@Test
	@DisplayName("空回复：直接拒，提示换个问法")
	void rejectBlankReply() {
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> AiContentGuard.checkChatReply("   "));
		assertTrue(ex.getMessage().contains("AI 没有返回内容"), ex.getMessage());
	}

	@Test
	@DisplayName("整段被代码围栏包住：拆掉围栏（排版问题，不是内容问题）")
	void unwrapWholeFence() {
		String reply = "```text\n第一点：先讲定义\n第二点：再讲易错点\n```";
		assertEquals("第一点：先讲定义\n第二点：再讲易错点", AiContentGuard.checkChatReply(reply));
	}

	@Test
	@DisplayName("围栏后面还有正文 / 围栏没闭合：原样返回，不猜")
	void keepFenceWhenNotWhole() {
		String withTrailing = "```\n代码\n```\n结论：以上。";
		assertEquals(withTrailing, AiContentGuard.checkChatReply(withTrailing));
		String unclosed = "```\n只有开头没有结尾";
		assertEquals(unclosed, AiContentGuard.checkChatReply(unclosed));
	}

	@Test
	@DisplayName("回复里带出系统提示的分隔符：拒收（提示词泄露）")
	void rejectPromptLeak() {
		String leak = "我的说明是：" + AiPageContext.BEGIN + "\n- 页面：试卷编辑器\n" + AiPageContext.END;
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> AiContentGuard.checkChatReply(leak));
		assertTrue(ex.getMessage().contains("系统提示词片段"), ex.getMessage());
	}

	@Test
	@DisplayName("超长回复：截断并标注，而不是丢掉整段")
	void truncateLongReply() {
		String longReply = "答".repeat(7000);
		String result = AiContentGuard.checkChatReply(longReply);
		assertTrue(result.length() < 7000, "长度没有降下来");
		assertTrue(result.endsWith("…（回复过长，已截断）"), result.substring(result.length() - 20));
	}

}
