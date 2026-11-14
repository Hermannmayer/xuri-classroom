package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.NanoIdUtils;
import cn.surveyking.server.domain.dto.SurveySchema;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * JSON 解析：吃本系统导出的试卷 JSON（可含大题），校验后重新生成全部 ID，避免与现有试卷冲突。
 */
public class JsonQuestionParser {

	private static final ObjectMapper MAPPER = new ObjectMapper()
			.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

	private final MultipartFile file;

	public JsonQuestionParser(MultipartFile file) {
		this.file = file;
	}

	public ImportPreview parse() {
		if (file == null || file.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请上传 JSON 文件");
		}
		SurveySchema survey;
		try {
			JsonNode root = MAPPER.readTree(file.getInputStream());
			if (root != null && root.has("survey")) {
				root = root.get("survey");
			}
			if (root == null || root.isNull()) {
				throw new ErrorCodeException(ErrorCode.FileParseError, "JSON 内容为空");
			}
			survey = MAPPER.treeToValue(root, SurveySchema.class);
		}
		catch (ErrorCodeException e) {
			throw e;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"JSON 解析失败：" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
		}
		if (survey == null || survey.getType() == null) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "JSON 不是一份试卷：缺少 type 字段");
		}
		if (survey.getType() != SurveySchema.QuestionType.Survey) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "JSON 根节点必须是 Survey（整份试卷）");
		}
		if (survey.getChildren() == null || survey.getChildren().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "JSON 里没有题目");
		}

		Set<String> ids = new HashSet<>();
		reId(survey, ids);

		List<SurveySchema> flat = new ArrayList<>();
		flatten(survey, flat);
		if (flat.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "JSON 里没有可导入的题目");
		}

		Map<String, Integer> byType = new LinkedHashMap<>();
		double score = 0;
		for (SurveySchema item : flat) {
			byType.merge(item.getType().name(), 1, Integer::sum);
			Double itemScore = item.getAttribute() == null ? null : item.getAttribute().getExamScore();
			score += itemScore == null ? 0 : itemScore;
		}

		List<ImportPreview.Warning> warnings = new ArrayList<>();
		warnings.add(ImportPreview.Warning.builder().level("info").code("JSON_REID")
				.message("已重新生成题目 ID，避免与现有试卷冲突").build());

		return ImportPreview.builder().title(survey.getTitle()).tree(survey).flat(flat)
				.stats(ImportPreview.Stats.builder().total(flat.size()).score(score)
						.groups(survey.getChildren().size()).byType(byType).build())
				.warnings(warnings).build();
	}

	private void reId(SurveySchema node, Set<String> ids) {
		String oldId = node.getId();
		String newId = NanoIdUtils.randomNanoId(6, ids);
		node.setId(newId);
		SurveySchema.Attribute attribute = node.getAttribute();
		if (attribute != null && StringUtils.hasText(oldId) && oldId.equals(attribute.getExamCorrectAnswer())) {
			// 选择题的“正确答案”存的就是选项自己的 id，换 id 必须同步改
			attribute.setExamCorrectAnswer(newId);
		}
		if (node.getChildren() != null) {
			for (SurveySchema child : node.getChildren()) {
				reId(child, ids);
			}
		}
		if (node.getType() == SurveySchema.QuestionType.Radio || node.getType() == SurveySchema.QuestionType.Checkbox
				|| node.getType() == SurveySchema.QuestionType.Judge) {
			rebuildDataSource(node);
		}
	}

	private void rebuildDataSource(SurveySchema question) {
		if (question.getChildren() == null || question.getChildren().isEmpty()) {
			return;
		}
		List<SurveySchema.DataSource> sources = new ArrayList<>();
		for (SurveySchema child : question.getChildren()) {
			if (!StringUtils.hasText(child.getTitle())) {
				continue;
			}
			SurveySchema.DataSource source = new SurveySchema.DataSource();
			source.setLabel(child.getTitle());
			source.setValue(child.getId());
			sources.add(source);
		}
		question.setDataSource(sources.isEmpty() ? null : sources);
	}

	private void flatten(SurveySchema node, List<SurveySchema> out) {
		if (node.getType() != null && SurveySchema.QuestionType.dataType().contains(node.getType())) {
			out.add(node);
		}
		if (node.getChildren() != null) {
			for (SurveySchema child : node.getChildren()) {
				flatten(child, out);
			}
		}
	}

}
