package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.ExcelImportSecurity;
import cn.surveyking.server.core.uitls.RepoTemplateExcelParseHelper;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;













public class ExcelQuestionParser {

	private final MultipartFile file;

	public ExcelQuestionParser(MultipartFile file) {
		this.file = file;
	}

	public ImportPreview parse() {
		validateFile();

		ExcelImportSecurity.validateFile(file);
		List<ImportPreview.Warning> warnings = new ArrayList<>();
		ExcelRowImages rowImages = readRowImages(warnings);
		RepoTemplateExcelParseHelper helper = new RepoTemplateExcelParseHelper(file, rowImages);
		List<TemplateRequest> templates = helper.parse();
		Map<String, byte[]> attachments = new LinkedHashMap<>();
		attachRowImageTokens(templates, rowImages, attachments);
		ImportPreview preview = fromTemplates(templates);
		for (RepoTemplateExcelParseHelper.ParseWarning parseWarning : helper.getWarnings()) {
			warnings.add(ImportPreview.Warning.builder().level(parseWarning.getLevel())
					.code(parseWarning.getCode()).message(parseWarning.getMessage()).build());
		}
		preview.setAttachments(attachments);
		if (!attachments.isEmpty()) {
			warnings.add(ImportPreview.Warning.builder().level("info").code("IMAGE_IMPORTED")
					.message("已提取 " + attachments.size() + " 张 Excel 内嵌图片，按选项/题干位置挂载").build());
		}
		preview.getWarnings().addAll(warnings);
		return preview;
	}

	/** 读内嵌图片；读失败只给 warn 并按无图片继续（图片不该拖垮文字题目的导入） */
	private ExcelRowImages readRowImages(List<ImportPreview.Warning> warnings) {
		ExcelRowImages rowImages;
		try {
			rowImages = ExcelRowImages.read(file.getBytes());
		}
		catch (IOException e) {
			warnings.add(warning("IMAGE_READ_FAILED", "读取 Excel 内嵌图片失败，已按无图片导入：" + describe(e)));
			return ExcelRowImages.empty();
		}
		for (ExcelRowImages.Warning imageWarning : rowImages.getWarnings()) {
			warnings.add(warning(imageWarning.getCode(), imageWarning.getMessage()));
		}
		return rowImages;
	}

	private void validateFile() {
		if (file == null || file.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请上传 Excel 文件");
		}
		String name = file.getOriginalFilename();

		if (name != null && name.toLowerCase(Locale.ROOT).endsWith(".xls") && !isZipArchive()) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"暂不支持 .xls 旧格式，请在 Excel 里另存为 .xlsx 后重试");
		}
	}

	private boolean isZipArchive() {
		try (InputStream in = file.getInputStream()) {
			byte[] head = in.readNBytes(2);
			return head.length == 2 && head[0] == 'P' && head[1] == 'K';
		}
		catch (IOException e) {
			return false;
		}
	}

	/** 把选项单元格/行内图片换成 [[IMG:n]] token；选项图片挂选项，其余挂题干 */
	private int attachRowImageTokens(List<TemplateRequest> templates, ExcelRowImages rowImages,
			Map<String, byte[]> attachments) {
		if (rowImages.isEmpty()) {
			return 0;
		}
		int attached = 0;
		for (TemplateRequest template : templates) {
			SurveySchema schema = template.getTemplate();
			if (schema == null) {
				continue;
			}
			Map<String, Integer> optionColumns = template.getSourceOptionColumns();
			Set<Integer> optionColumnSet = new LinkedHashSet<>();
			if (optionColumns != null) {
				optionColumnSet.addAll(optionColumns.values());
				for (SurveySchema child : schema.getChildren() == null ? List.<SurveySchema>of() : schema.getChildren()) {
					Integer column = optionColumns.get(child.getId());
					if (column == null) {
						continue;
					}
					for (byte[] data : rowImages.imagesOfCell(template.getSourceSheet(), template.getSourceRow(), column)) {
						if (QuestionImageUploader.guessImageExtension(data) == null) {
							continue;
						}
						String token = "[[IMG:" + (++attached) + "]]";
						attachments.put(token, data);
						String title = child.getTitle() == null ? "" : child.getTitle().trim();
						child.setTitle(title.isEmpty() ? token : title + " " + token);
					}
				}
			}
			for (byte[] data : rowImages.imagesOfRowExcept(template.getSourceSheet(), template.getSourceRow(),
					optionColumnSet)) {
				if (QuestionImageUploader.guessImageExtension(data) == null) {

					continue;
				}
				String token = "[[IMG:" + (++attached) + "]]";
				attachments.put(token, data);
				String title = schema.getTitle() == null ? "" : schema.getTitle().trim();
				schema.setTitle(title.isEmpty() ? token : title + " " + token);
				template.setName(schema.getTitle());
			}
		}
		return attached;
	}
	/** 题库模板条目 → 试卷题目树；包级可见，便于单测直接构造条目（章节分组等） */
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

	/** 选项类题目补 dataSource（设计器靠它渲染与改选项；判分仍看 children 的 examCorrectAnswer） */
	private static void normalize(SurveySchema question) {
		SurveySchema.QuestionType type = question.getType();
		if (type != SurveySchema.QuestionType.Radio && type != SurveySchema.QuestionType.Checkbox
				&& type != SurveySchema.QuestionType.Judge && type != SurveySchema.QuestionType.Select) {
			return;
		}

		if (question.getDataSource() != null && !question.getDataSource().isEmpty()) {
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

	private static ImportPreview.Warning warning(String code, String message) {
		return ImportPreview.Warning.builder().level("warn").code(code).message(message).build();
	}

	private static String describe(Throwable e) {
		if (e == null) {
			return "未知错误";
		}
		String message = e.getMessage();
		if (!StringUtils.hasText(message)) {
			return e.getClass().getSimpleName();
		}
		return message.length() > 200 ? message.substring(0, 200) + "…" : message;
	}

}
