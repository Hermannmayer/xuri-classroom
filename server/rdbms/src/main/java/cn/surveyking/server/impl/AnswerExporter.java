package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AttachmentNameVariableEnum;
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

/**
 * 答卷导出：整卷 Excel、单个答卷附件、批量附件 zip。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出。所有方法都只处理「已经取好的答卷视图」， 取数（分页 / 权限过滤）仍留在调用方，因此这里不需要注入
 * {@code AnswerService}， 也就不会出现「Service 注入组件、组件又注入 Service」的构造器循环。
 *
 * <p>
 * 导出线程池与压缩线程的语义原样保留：Excel 导出最多 2 并发 + 4 排队，队列满直接拒绝； 附件 zip 仍在独立线程里流式写出。
 */
@Component
@RequiredArgsConstructor
public class AnswerExporter {

	private final FileService fileService;

	/**
	 * 导出线程池：最多 2 个并发导出，队列 4。
	 * <p>
	 * 之前每来一个导出请求就 {@code new Thread}，且先把全部行在内存里组装成 List 再交给 Excel 库； 两个老师同时导 500 份 × 100
	 * 题的卷，峰值就能吃掉几百 MB 堆。-Xmx768m 下这是最容易触发 OOM 的路径。 队列满时直接拒绝（AbortPolicy），让请求拿到明确错误，而不是把
	 * JVM 拖死。
	 */
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
				// 队列满：明确拒绝，别让第三份大导出把堆打穿
				try {
					outputStream.close();
				}
				catch (IOException ignored) {
					// 关闭管道失败不影响返回错误
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
		// 下载所有问卷答案的附件
		downloadData.setResource(new InputStreamResource(answerAttachToZip(project, answers, query)));
		downloadData.setFileName(project.getName() + ".zip");
		downloadData.setMediaType(MediaType.parseMediaType("application/zip"));
		return downloadData;
	}

	public DownloadData generateSurveyAttachment(Project project, AnswerView answer) {
		DownloadData downloadData = new DownloadData();
		List<FileView> files = answer.getAttachment();
		// 如果只有一个附件，则直接返回附件的结果
		if (files.size() == 1) {
			FileView attachment = files.get(0);
			downloadData.setFileName(attachment.getOriginalName());
			downloadData.setResource(fileService.loadFile(new FileQuery(attachment.getId())).getBody());
		}
		else {
			// 多个附件，压缩包
			downloadData.setResource(new InputStreamResource(
					answerAttachToZip(project, Collections.singletonList(answer), new DownloadQuery())));
			downloadData.setFileName(answer.getId() + ".zip");
			downloadData.setMediaType(MediaType.parseMediaType("application/zip"));
		}
		return downloadData;
	}

	/**
	 * 将单个问卷的附件转成 zip 压缩包
	 * @param answers
	 * @return
	 */
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
					// 生成表格
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
		int[] indexArr = { 0 };
		new ExcelExporter.Builder().setSheetName(project.getName()).setOutputStream(outputStream)
				.setRows(answerViews.stream().map(answer -> {
					indexArr[0] = indexArr[0] += 1;
					return SchemaHelper.parseRowData(answer, schemaDataTypes, indexArr[0], project.getMode());
				}).collect(Collectors.toList()))
				.setColumns(SchemaHelper.parseColumns(schemaDataTypes, project.getMode())).build().exportToStream();
	}

	/**
	 * @param answerView 当前答案
	 * @param nameExp 附件名称表达式
	 * @param file 当前附件
	 * @param serialNum 序号
	 * @param uploadQuestions 问卷上传题 schema
	 * @return 新的附件名称
	 */
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
					// 问题变量
					Map<String, Object> questionValue = (Map<String, Object>) answerMap.get(questionId);

					if (questionValue != null) {
						// 单行文本表达式只有问题id #{xxxx}
						if (StringUtils.hasText(optionId)) {
							expValue = questionValue.get(optionId).toString();
						}
						else {
							// 多行文本会有选项id #{ancd.a3dx}
							expValue = questionValue.values().toArray()[0].toString();
						}
					}
				}

				fileName = StringUtils.replace(fileName, exp, expValue);
			}
			String suffix = getFileExtension(file.getOriginalName());
			// 返回解析之后的文件名字
			if (suffix != null) {
				return fileName + "." + suffix;
			}
			return fileName;
		}
		else {
			// 返回原始文件名字
			return file.getOriginalName();
		}
	}

	/**
	 * 获取文件后缀
	 * @param fileName 文件名称
	 * @return 文件后缀
	 */
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
