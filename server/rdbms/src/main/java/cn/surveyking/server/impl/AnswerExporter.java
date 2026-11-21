package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AttachmentNameVariableEnum;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.ExcelExporter;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.DownloadData;
import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;











@Component
@RequiredArgsConstructor
public class AnswerExporter {

	private final FileService fileService;








	private static final ExecutorService EXPORT_POOL = new ThreadPoolExecutor(2, 2, 60L, TimeUnit.SECONDS,
			new ArrayBlockingQueue<>(4), runnable -> {
				Thread thread = new Thread(runnable, "answer-export");
				thread.setDaemon(true);
				return thread;
			});

	public DownloadData downloadSurvey(Project project, List<AnswerView> answerViews) {
		DownloadData download = new DownloadData();
		download.setFileName(project.getName() + ".xlsx");
		try {
			PipedOutputStream outputStream = new PipedOutputStream();
			PipedInputStream inputStream = new PipedInputStream(outputStream);
			Locale locale = LocaleContextHolder.getLocale();
			try {
				EXPORT_POOL.execute(() -> {
					Locale previousLocale = LocaleContextHolder.getLocale();
					try {
						LocaleContextHolder.setLocale(locale);
						export(project, answerViews, outputStream);
					}
					catch (Exception e) {
						e.printStackTrace();
					}
					finally {
						try {
							outputStream.close();
						}
						catch (IOException e) {
							e.printStackTrace();
						}
						LocaleContextHolder.setLocale(previousLocale);
					}
				});
			}
			catch (RejectedExecutionException rejected) {

				try {
					outputStream.close();
				}
				catch (IOException ignored) {

				}
				throw new InternalServerError("当前导出任务过多，请稍后再试（同时最多 3 个）");
			}
			download.setResource(new InputStreamResource(inputStream));
		}
		catch (IOException e) {
			e.printStackTrace();
		}

		download.setMediaType(MediaType.parseMediaType("application/vnd.ms-excel"));
		return download;
	}

	public DownloadData downloadAttachmentZip(Project project, List<AnswerView> answers, DownloadQuery query) {
		DownloadData downloadData = new DownloadData();

		downloadData.setResource(new InputStreamResource(answerAttachToZip(project, answers, query)));
		downloadData.setFileName(project.getName() + ".zip");
		downloadData.setMediaType(MediaType.parseMediaType("application/zip"));
		return downloadData;
	}

	public DownloadData generateSurveyAttachment(Project project, AnswerView answer) {
		DownloadData downloadData = new DownloadData();
		List<FileView> files = answer.getAttachment();

		if (files.size() == 1) {
			FileView attachment = files.get(0);
			downloadData.setFileName(attachment.getOriginalName());
			downloadData.setResource(fileService.loadFile(new FileQuery(attachment.getId())).getBody());
		}
		else {

			downloadData.setResource(new InputStreamResource(
					answerAttachToZip(project, Collections.singletonList(answer), new DownloadQuery())));
			downloadData.setFileName(answer.getId() + ".zip");
			downloadData.setMediaType(MediaType.parseMediaType("application/zip"));
		}
		return downloadData;
	}

	/** 将单个问卷的附件转成 zip 压缩包 */
	private InputStream answerAttachToZip(Project project, List<AnswerView> answers, DownloadQuery query) {
		try {
			PipedOutputStream outputStream = new PipedOutputStream();
			PipedInputStream inputStream = new PipedInputStream(outputStream);
			Locale locale = LocaleContextHolder.getLocale();
			new Thread(() -> {
				Locale previousLocale = LocaleContextHolder.getLocale();
				try (ZipOutputStream zout = new ZipOutputStream(outputStream);) {
					LocaleContextHolder.setLocale(locale);
					int[] serialNum = { 0, 0 };
					List<SurveySchema> uploadQuestions = SchemaHelper.flatSurveySchema(project.getSurvey()).stream()
							.filter(qSchema -> SurveySchema.QuestionType.Upload.equals(qSchema.getType()))
							.collect(Collectors.toList());
					answers.forEach(answer -> {
						serialNum[1] = 0;
						answer.getAttachment().forEach(attachment -> {
							serialNum[0] += 1;
							serialNum[1] += 1;
							Resource resource = fileService.loadFile(new FileQuery(attachment.getId())).getBody();
							String parsedFileName = parseAttachmentNameByExp(answer, query.getNameExp(), attachment,
									serialNum, uploadQuestions);
							String entryName = sanitizeZipEntryName(parsedFileName, "attachment-" + serialNum[0]);
							ZipEntry entry = new ZipEntry(entryName);
							try (InputStream resourceInputStream = Objects.requireNonNull(resource).getInputStream()) {
								zout.putNextEntry(entry);
								byte[] buffer = new byte[8192];
								int read;
								while ((read = resourceInputStream.read(buffer)) != -1) {
									zout.write(buffer, 0, read);
								}
								zout.closeEntry();
							}
							catch (IOException e) {
								e.printStackTrace();
							}

						});
					});

					if (DownloadQuery.DownloadType.answerAttachment.equals(query.getType())) {
						ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
						export(project, answers, byteArrayOutputStream);
						ZipEntry entry = new ZipEntry(
								sanitizeZipEntryName(project.getName() + ".xlsx", "answers.xlsx"));
						zout.putNextEntry(entry);
						zout.write(byteArrayOutputStream.toByteArray());
					}
				}
				catch (Exception e) {
					throw new InternalServerError("生成压缩文件失败", e);
				}
				finally {
					LocaleContextHolder.setLocale(previousLocale);
				}
			}).start();
			return inputStream;
		}
		catch (Exception e) {
			throw new InternalServerError("生成压缩文件失败", e);
		}
	}

	private void export(Project project, List<AnswerView> answerViews, OutputStream outputStream) {
		List<SurveySchema> schemaDataTypes = SchemaHelper.flatSurveySchema(project.getSurvey());

		ProjectModeEnum exportMode = project.getMode();
		if (ProjectModeEnum.survey.equals(exportMode) && project.getSetting() != null
				&& project.getSetting().getExamSetting() != null
				&& Boolean.TRUE.equals(project.getSetting().getExamSetting().getScoringEnabled())) {
			exportMode = ProjectModeEnum.exam;
		}
		final ProjectModeEnum scoringMode = exportMode;
		int[] indexArr = { 0 };
		new ExcelExporter.Builder().setSheetName(project.getName()).setOutputStream(outputStream)
				.setRows(answerViews.stream().map(answer -> {
					indexArr[0] = indexArr[0] += 1;
					return SchemaHelper.parseRowData(answer, schemaDataTypes, indexArr[0], scoringMode);
				}).collect(Collectors.toList()))
				.setColumns(SchemaHelper.parseColumns(schemaDataTypes, scoringMode)).build().exportToStream();
	}

	/** 返回 新的附件名称；返回 新的附件名称 */
	private String parseAttachmentNameByExp(AnswerView answerView, String nameExp, FileView file, int[] serialNum,
			List<SurveySchema> uploadQuestions) {
		if (StringUtils.hasText(nameExp)) {
			String fileName = nameExp;
			LinkedHashMap<String, Object> answerMap = answerView.getAnswer();
			Pattern pattern = Pattern.compile("#\\{([a-zA-Z0-9]+)\\.?([a-zA-Z0-9]*)\\}");
			Matcher matcher = pattern.matcher(nameExp);
			String exp, questionId, optionId = null;
			while (matcher.find()) {
				int count = matcher.groupCount();
				exp = matcher.group(0);
				questionId = matcher.group(1);
				if (count > 1) {
					optionId = matcher.group(2);
				}
				String expValue = "";
				if (AttachmentNameVariableEnum.projectId.name().equals(questionId)) {
					expValue = answerView.getProjectId();
				}
				else if (AttachmentNameVariableEnum.serialNum.name().equals(questionId)) {
					expValue = serialNum[0] + "";
				}
				else if (AttachmentNameVariableEnum.serialNumInAnswer.name().equals(questionId)) {
					expValue = serialNum[1] + "";
				}
				else if (AttachmentNameVariableEnum.uploadDate.name().equals(questionId)) {
					SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd");
					expValue = sdf.format(answerView.getCreateAt());
				}
				else if (AttachmentNameVariableEnum.uploadDateTime.name().equals(questionId)) {
					SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmss");
					expValue = sdf.format(answerView.getCreateAt());
				}
				else if (AttachmentNameVariableEnum.sourceName.name().equals(questionId)) {
					expValue = getFileNameWithoutSuffix(file.getOriginalName());
				}
				else if (AttachmentNameVariableEnum.questionTitle.name().equals(questionId)) {
					for (SurveySchema uploadQuestion : uploadQuestions) {
						Object qValue = answerView.getAnswer().get(uploadQuestion.getId());
						if (qValue != null) {
							boolean fileInCurrentSchema = ((Map<String, List<String>>) qValue)
									.get(uploadQuestion.getChildren().get(0).getId()).stream()
									.filter(x -> x.equals(file.getId())).findFirst().isPresent();
							if (fileInCurrentSchema) {
								expValue = uploadQuestion.getTitle();
								break;
							}
						}
					}
				}
				else {

					Map<String, Object> questionValue = (Map<String, Object>) answerMap.get(questionId);

					if (questionValue != null) {

						if (StringUtils.hasText(optionId)) {
							expValue = questionValue.get(optionId).toString();
						}
						else {

							expValue = questionValue.values().toArray()[0].toString();
						}
					}
				}

				fileName = StringUtils.replace(fileName, exp, expValue);
			}
			String suffix = getFileExtension(file.getOriginalName());

			if (suffix != null) {
				return fileName + "." + suffix;
			}
			return fileName;
		}
		else {

			return file.getOriginalName();
		}
	}

	/** 获取文件后缀；返回 文件后缀 */
	private String getFileExtension(String fileName) {
		String extension = null;
		int i = fileName.lastIndexOf('.');
		if (i > 0) {
			extension = fileName.substring(i + 1);
		}
		return extension;
	}

	private String getFileNameWithoutSuffix(String fileName) {
		String fileNameWithoutSuffix = null;
		int i = fileName.lastIndexOf('.');
		if (i > 0) {
			fileNameWithoutSuffix = fileName.substring(0, i);
		}
		return fileNameWithoutSuffix;
	}

	private String sanitizeZipEntryName(String fileName, String fallbackName) {
		String normalized = StringUtils.hasText(fileName) ? fileName.replace('\\', '/') : fallbackName;
		int lastSeparator = normalized.lastIndexOf('/');
		if (lastSeparator >= 0) {
			normalized = normalized.substring(lastSeparator + 1);
		}
		StringBuilder safeName = new StringBuilder();
		for (int i = 0; i < normalized.length(); i++) {
			char ch = normalized.charAt(i);
			if (ch < 0x20 || ch == 0x7f || ch == ':' || ch == '*' || ch == '?' || ch == '"' || ch == '<' || ch == '>'
					|| ch == '|') {
				safeName.append('_');
			}
			else {
				safeName.append(ch);
			}
		}
		String result = safeName.toString().replace("..", "_").trim();
		if (!StringUtils.hasText(result) || ".".equals(result) || "..".equals(result)) {
			result = fallbackName;
		}
		return result.length() > 200 ? result.substring(0, 200) : result;
	}

}
