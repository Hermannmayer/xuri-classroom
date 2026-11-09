package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.ExcelImportSecurity;
import cn.surveyking.server.core.uitls.NanoIdUtils;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerUploadRequest;
import cn.surveyking.server.domain.dto.AnswerUploadView;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Excel 导入答卷：按行头建项目 schema、按行解析答案。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出。落库仍然走调用方传进来的 {@code batchSaver}
 * （{@code ServiceImpl#saveBatch}），保持「每 1000 行一批、批后清空」的原有内存曲线与事务语义， 组件本身不依赖
 * {@code AnswerService}，避免构造器循环。
 */
@Component
@RequiredArgsConstructor
public class AnswerUploadParser {

	private final AnswerAccessGuard answerAccessGuard;

	private final ProjectService projectService;

	@SneakyThrows
	public AnswerUploadView upload(AnswerUploadRequest request, Consumer<List<Answer>> batchSaver) {
		if (request.getProjectId() != null) {
			answerAccessGuard.assertProjectAccess(request.getProjectId());
		}
		ExcelImportSecurity.validateFile(request.getFile());
		ExcelImportSecurity.RowGuard rowGuard = ExcelImportSecurity.newRowGuard();
		AnswerUploadView view = new AnswerUploadView();
		try (InputStream is = request.getFile().getInputStream(); ReadableWorkbook wb = new ReadableWorkbook(is)) {
			Sheet sheet = wb.getFirstSheet();
			String name = request.getFile().getOriginalFilename().substring(0,
					request.getFile().getOriginalFilename().lastIndexOf("."));
			List<Answer> answers = new ArrayList<>();
			try (Stream<Row> rows = sheet.openStream()) {
				// 第一行作为行头
				rows.forEach(r -> {
					rowGuard.validate(r);
					int rowNum = r.getRowNum();
					if (rowNum == 1) {
						if (request.getProjectId() != null) {
							ProjectView projectView = projectService.getProject(request.getProjectId());
							view.setProjectId(projectView.getId());
							view.setSchema(filterSchemaByRow(r, projectView.getSurvey()));
						}
						else if (Boolean.TRUE.equals(request.getAutoSchema())) {
							ProjectView projectView = parseRow2Schema(r, name, request.getParentId());
							view.setProjectId(projectView.getId());
							view.setSchema(projectView.getSurvey());
						}
					}
					else {
						// 处理答案
						answers.add(parseRow2Answer(view, r));
						if (answers.size() == 1000) {
							batchSaver.accept(answers);
							answers.clear();
						}
					}
				});
			}
			if (answers.size() > 0) {
				batchSaver.accept(answers);
			}

		}
		return view;
	}

	private ProjectView parseRow2Schema(Row row, String name, String parentId) {
		// 处理行头自动生成 schema
		SurveySchema schema = createSurveyFromExcelRowHeader(row);
		schema.setTitle(name);
		ProjectRequest projectRequest = new ProjectRequest();
		projectRequest.setSurvey(schema);
		projectRequest.setName(name);
		projectRequest.setMode(ProjectModeEnum.survey);
		projectRequest.setParentId(parentId);
		projectRequest.setSetting(ProjectSetting.builder().mode(ProjectModeEnum.survey).status(1).build());
		return projectService.addProject(projectRequest);
	}

	private SurveySchema createSurveyFromExcelRowHeader(Row row) {
		Set<String> ids = new HashSet<>();
		SurveySchema schema = SurveySchema.builder()
				.children(row.stream()
						.map(cell -> SurveySchema.builder().id(NanoIdUtils.randomNanoId(4, ids))
								.type(SurveySchema.QuestionType.FillBlank).title(cell.getText())
								.children(Collections.singletonList(
										SurveySchema.builder().id(NanoIdUtils.randomNanoId(4, ids)).build()))
								.build())
						.collect(Collectors.toList()))
				.build();
		return schema;
	}

	private SurveySchema filterSchemaByRow(Row row, SurveySchema schema) {
		List<SurveySchema> flatSurveySchema = SchemaHelper.flatSurveySchema(schema);
		return SurveySchema.builder().id(schema.getId()).children(row.stream().map(cell -> {
			String title = cell.getText();
			return flatSurveySchema.stream().filter(x -> x.getTitle().equals(title)).findFirst()
					.orElse(SurveySchema.builder().build());
		}).collect(Collectors.toList())).build();
	}

	private Answer parseRow2Answer(AnswerUploadView view, Row r) {
		Answer answer = new Answer();
		answer.setProjectId(view.getProjectId());
		LinkedHashMap<String, Map<String, String>> answerMap = new LinkedHashMap();
		int i = 0;
		for (SurveySchema questionSchema : view.getSchema().getChildren()) {
			String cellValue = r.getCellText(i);
			String questionId = questionSchema.getId();
			if (questionSchema.getChildren() == null || questionSchema.getChildren().size() == 0) {
				continue;
			}
			String optionId = questionSchema.getChildren().get(0).getId();
			if (cellValue != null) {
				Map<String, String> optionValue = new LinkedHashMap<>();
				optionValue.put(optionId, cellValue);
				answerMap.put(questionId, optionValue);
			}
			i++;
		}
		answer.setAnswer(answerMap);
		return answer;
	}

}
