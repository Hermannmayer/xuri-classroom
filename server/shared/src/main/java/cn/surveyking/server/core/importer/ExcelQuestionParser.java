package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.RepoTemplateExcelParseHelper;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Excel 解析：复用题库的「按题型分 sheet」模板，输出可直接进试卷的题目树。
 *
 * <p>
 * 与题库导入共用一套表头（序号/章节/题干/选项/解析/分数/答案/标签）；章节列可选，
 * 填了就把同一章节的题收进一个题组（QuestionSet），没填则平铺。
 */
public class ExcelQuestionParser {

	private final MultipartFile file;

	public ExcelQuestionParser(MultipartFile file) {
		this.file = file;
	}

	public ImportPreview parse() {
		if (file == null || file.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请上传 Excel 文件");
		}
		return fromTemplates(new RepoTemplateExcelParseHelper(file).parse());
	}

	/**
	 * 题库模板条目 → 试卷题目树；包级可见，便于单测直接构造条目（章节分组等）。
	 */
	static ImportPreview fromTemplates(List<TemplateRequest> templates) {
		if (templates == null || templates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "表格里没有可导入的题目");
		}

		List<SurveySchema> flat = new ArrayList<>();
		List<SurveySchema> treeChildren = new ArrayList<>();
		Map<String, SurveySchema> groups = new LinkedHashMap<>();
		Set<String> ids = new LinkedHashSet<>();

		for (TemplateRequest template : templates) {
			SurveySchema question = template.getTemplate();
			if (question == null) {
				continue;
			}
			normalize(question);
			flat.add(question);

			String chapter = StringUtils.hasText(template.getChapter()) ? template.getChapter().trim() : null;
			if (chapter == null) {
				treeChildren.add(question);
				continue;
			}
			SurveySchema group = groups.get(chapter);
			if (group == null) {
				group = SurveySchema.builder().id(cn.surveyking.server.core.uitls.NanoIdUtils.randomNanoId(6, ids))
						.type(SurveySchema.QuestionType.QuestionSet).title(chapter)
						.attribute(SurveySchema.Attribute.builder().build()).children(new ArrayList<>()).build();
				groups.put(chapter, group);
				treeChildren.add(group);
			}
			group.getChildren().add(question);
		}

		if (flat.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "表格里没有可导入的题目");
		}

		SurveySchema tree = SurveySchema.builder()
				.id(cn.surveyking.server.core.uitls.NanoIdUtils.randomNanoId(6, ids))
				.type(SurveySchema.QuestionType.Survey).children(treeChildren).build();

		Map<String, Integer> byType = new LinkedHashMap<>();
		double score = 0;
		for (SurveySchema item : flat) {
			byType.merge(item.getType().name(), 1, Integer::sum);
			Double itemScore = item.getAttribute() == null ? null : item.getAttribute().getExamScore();
			score += itemScore == null ? 0 : itemScore;
		}

		List<ImportPreview.Warning> warnings = new ArrayList<>();
		if (!groups.isEmpty()) {
			warnings.add(ImportPreview.Warning.builder().level("info").code("CHAPTER_GROUPED")
					.message("已按「章节」列拆成 " + groups.size() + " 个大题").build());
		}

		return ImportPreview.builder().tree(tree).flat(flat)
				.stats(ImportPreview.Stats.builder().total(flat.size()).score(score).groups(groups.size())
						.byType(byType).build())
				.warnings(warnings).build();
	}

	/**
	 * 选项类题目补 dataSource（设计器靠它渲染与改选项；判分仍看 children 的 examCorrectAnswer）。
	 */
	private static void normalize(SurveySchema question) {
		SurveySchema.QuestionType type = question.getType();
		if (type != SurveySchema.QuestionType.Radio && type != SurveySchema.QuestionType.Checkbox
				&& type != SurveySchema.QuestionType.Judge) {
			return;
		}
		List<SurveySchema.DataSource> sources = new ArrayList<>();
		if (question.getChildren() != null) {
			for (SurveySchema child : question.getChildren()) {
				if (!StringUtils.hasText(child.getTitle())) {
					continue;
				}
				SurveySchema.DataSource source = new SurveySchema.DataSource();
				source.setLabel(child.getTitle());
				source.setValue(child.getId());
				sources.add(source);
			}
		}
		question.setDataSource(sources.isEmpty() ? null : sources);
	}

}
