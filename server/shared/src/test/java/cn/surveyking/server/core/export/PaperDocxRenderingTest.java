package cn.surveyking.server.core.export;

import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Tag;

/**
 * Word 试卷导出的「真写出」冒烟。
 *
 * <p>
 * POI 5 → 6 是破坏性大版本升级（OOXML schema 构件也换过），而 {@code PaperDocxExporter} 没有单测。
 * 编译通过不代表能写出 docx：{@code setupPage} 用的是 {@code CT* } 生成类，
 * 一旦 {@code poi-ooxml-lite} 里缺对应 schema，运行期才会炸。
 * 这里走完整链路——建 ProjectView → 导出字节 → 再用 POI 读回来——两端都验一遍。
 */
@Tag("slow")
class PaperDocxRenderingTest {

	@Test
	void exportsDocxThatCanBeReadBack() throws Exception {
		SurveySchema survey = new SurveySchema();
		survey.setTitle("养老护理员五级 模拟卷");
		survey.setType(SurveySchema.QuestionType.Survey);
		List<SurveySchema> children = new ArrayList<>();
		children.add(question("q1", "第 1 题 行业之间存在差异，各行各业都有（）的道德要求。"));
		children.add(question("q2", "第 2 题 人生的价值，一要看对社会所做的贡献。"));
		survey.setChildren(children);

		ProjectView project = new ProjectView();
		project.setName("测试试卷");
		project.setSurvey(survey);

		byte[] docx = PaperDocxExporter.export(project, true, true);

		assertTrue(docx.length > 2048, "docx 太小，可能没写出内容：" + docx.length + " 字节");
		// docx 是 ZIP，头两个字节是 PK
		assertEquals("PK", new String(docx, 0, 2), "不是合法 docx（缺少 ZIP 头）");

		// 读回来：验证 POI 既能写也能读，且标题与题干真的落到了文档里
		try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(docx))) {
			StringBuilder all = new StringBuilder();
			doc.getParagraphs().forEach(p -> all.append(p.getText()));
			doc.getTables().forEach(t -> t.getRows().forEach(r -> r.getTableCells().forEach(c -> all.append(c.getText()))));
			String text = all.toString();
			assertTrue(text.contains("养老护理员五级"), "正文里找不到卷标题");
			assertTrue(text.contains("行业之间存在差异"), "正文里找不到题干");
			assertTrue(text.contains("参考答案"), "includeAnswers=true 时应有参考答案页");
			assertTrue(text.contains("答题卡"), "includeCard=true 时应有答题卡页");
		}
	}

	private static SurveySchema question(String id, String title) {
		SurveySchema q = new SurveySchema();
		q.setId(id);
		q.setTitle(title);
		q.setType(SurveySchema.QuestionType.FillBlank);
		return q;
	}

}
