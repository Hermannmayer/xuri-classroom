package cn.surveyking.server.core.export;

import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSectPr;

import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;




public final class PaperDocxExporter {

	private static final String FONT = "宋体";

	private static final char[] LETTERS = "ABCDEFGH".toCharArray();

	private PaperDocxExporter() {
	}

	public static byte[] export(ProjectView project, boolean includeAnswers, boolean includeCard) {
		SurveySchema survey = project.getSurvey();
		String title = survey != null && survey.getTitle() != null ? survey.getTitle() : project.getName();
		try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			setupPage(doc);
			SurveySchema.Attribute attribute = survey == null ? null : survey.getAttribute();
			String headerTitle = attribute != null && hasText(attribute.getHeaderTitle()) ? attribute.getHeaderTitle() : title;
			centered(doc, headerTitle, 18, true);
			if (attribute != null && hasText(attribute.getHeaderSubtitle())) {
				centered(doc, attribute.getHeaderSubtitle(), 11, false);
			}
			String headerInfo = attribute != null && hasText(attribute.getExamHeaderInfo())
					? attribute.getExamHeaderInfo()
					: "姓名：____________　考号：____________　得分：________";
			centered(doc, headerInfo, 10, false);
			doc.createParagraph();

			List<SurveySchema> questions = new ArrayList<>();
			int[] number = new int[] { 0 };
			renderNodes(doc, survey == null ? null : survey.getChildren(), questions, number);

			if (includeCard) {
				pageBreak(doc);
				heading(doc, "答题卡");
				answerCard(doc, questions.size());
			}
			if (includeAnswers) {
				pageBreak(doc);
				heading(doc, "参考答案");
				for (int i = 0; i < questions.size(); i++) {
					paragraph(doc, (i + 1) + ". " + answerOf(questions.get(i)), 10, false);
				}
			}
			doc.write(out);
			return out.toByteArray();
		}
		catch (Exception e) {
			throw new IllegalStateException("生成 Word 失败：" + e.getMessage(), e);
		}
	}

	private static void setupPage(XWPFDocument doc) {
		CTSectPr sectPr = doc.getDocument().getBody().isSetSectPr() ? doc.getDocument().getBody().getSectPr()
				: doc.getDocument().getBody().addNewSectPr();
		CTPageSz size = sectPr.isSetPgSz() ? sectPr.getPgSz() : sectPr.addNewPgSz();
		size.setW(BigInteger.valueOf(11906));
		size.setH(BigInteger.valueOf(16838));
	}

	private static void centered(XWPFDocument doc, String text, int size, boolean bold) {
		XWPFParagraph paragraph = doc.createParagraph();
		paragraph.setAlignment(ParagraphAlignment.CENTER);
		XWPFRun run = paragraph.createRun();
		run.setText(text == null ? "" : text);
		font(run, size, bold);
	}

	private static void heading(XWPFDocument doc, String text) {
		XWPFParagraph paragraph = doc.createParagraph();
		paragraph.setSpacingBefore(200);
		XWPFRun run = paragraph.createRun();
		run.setText(stripHtml(text));
		font(run, 13, true);
	}

	private static void paragraph(XWPFDocument doc, String text, int size, boolean bold) {
		XWPFParagraph paragraph = doc.createParagraph();
		XWPFRun run = paragraph.createRun();
		run.setText(text == null ? "" : text);
		font(run, size, bold);
	}

	/**
	 * 递归渲染：只有 dataType 才编号，QuestionSet 只当大题标题，选项不再被当题号。
	 */
	private static void renderNodes(XWPFDocument doc, List<SurveySchema> nodes, List<SurveySchema> questions,
			int[] number) {
		if (nodes == null) {
			return;
		}
		for (SurveySchema node : nodes) {
			if (node == null || node.getType() == null) {
				continue;
			}
			QuestionType type = node.getType();
			if (type == QuestionType.Survey || type == QuestionType.Pagination) {
				renderNodes(doc, node.getChildren(), questions, number);
			}
			else if (type == QuestionType.QuestionSet) {
				if (hasText(node.getTitle())) {
					heading(doc, node.getTitle());
				}
				renderNodes(doc, node.getChildren(), questions, number);
			}
			else if (type == QuestionType.Remark) {
				if (hasText(node.getTitle())) {
					paragraph(doc, stripHtml(node.getTitle()), 10, false);
				}
			}
			else if (type == QuestionType.SplitLine || type == QuestionType.Option || type == QuestionType.RandomSurvey) {

			}
			else if (QuestionType.dataType().contains(type)) {
				number[0]++;
				questions.add(node);
				question(doc, number[0], node);
			}
			else {
				renderNodes(doc, node.getChildren(), questions, number);
			}
		}
	}

	private static boolean hasText(String text) {
		return text != null && !text.trim().isEmpty();
	}

	private static void question(XWPFDocument doc, int number, SurveySchema question) {
		paragraph(doc, number + ". " + stripHtml(question.getTitle()), 11, false);
		List<SurveySchema> options = question.getChildren();
		if (options != null && !options.isEmpty()
				&& ("Radio".equals(String.valueOf(question.getType())) || "Checkbox".equals(String.valueOf(question.getType()))
						|| "Judge".equals(String.valueOf(question.getType())) || "Select".equals(String.valueOf(question.getType())))) {
			StringBuilder line = new StringBuilder("    ");
			for (int i = 0; i < options.size() && i < LETTERS.length; i++) {
				line.append(LETTERS[i]).append(". ").append(stripHtml(options.get(i).getTitle())).append("    ");
			}
			paragraph(doc, line.toString(), 10, false);
		}
		if ("Textarea".equals(String.valueOf(question.getType()))) {
			for (int i = 0; i < 3; i++) {
				paragraph(doc, "____________________________________________________________", 10, false);
			}
		}
	}

	private static void answerCard(XWPFDocument doc, int total) {
		int columns = 6;
		int rows = Math.max(1, (int) Math.ceil(total / (double) columns));
		XWPFTable table = doc.createTable(rows * 2, columns);
		for (int i = 0; i < total; i++) {
			int row = (i / columns) * 2;
			int col = i % columns;
			table.getRow(row).getCell(col).setText(String.valueOf(i + 1));
			table.getRow(row + 1).getCell(col).setText("");
		}
	}

	private static void pageBreak(XWPFDocument doc) {
		XWPFParagraph paragraph = doc.createParagraph();
		paragraph.setPageBreak(true);
	}

	private static String answerOf(SurveySchema question) {
		List<SurveySchema> children = question.getChildren();
		if (children == null || children.isEmpty()) {
			return "（略）";
		}
		String type = String.valueOf(question.getType());
		if ("Radio".equals(type) || "Checkbox".equals(type) || "Judge".equals(type)) {
			StringBuilder answer = new StringBuilder();
			for (int i = 0; i < children.size() && i < LETTERS.length; i++) {
				SurveySchema child = children.get(i);
				if (child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null) {
					answer.append(LETTERS[i]);
				}
			}
			return answer.length() == 0 ? "（略）" : answer.toString();
		}
		StringBuilder answer = new StringBuilder();
		for (SurveySchema child : children) {
			if (child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null) {
				if (answer.length() > 0) {
					answer.append(" / ");
				}
				answer.append(child.getAttribute().getExamCorrectAnswer());
			}
		}
		return answer.length() == 0 ? "（略）" : answer.toString();
	}

	private static String stripHtml(String text) {
		return text == null ? "" : text.replaceAll("<[^>]+>", "").trim();
	}

	private static void font(XWPFRun run, int size, boolean bold) {
		run.setFontFamily(FONT);
		run.setFontFamily(FONT, XWPFRun.FontCharRange.eastAsia);
		run.setFontSize(size);
		run.setBold(bold);
	}

}
