/** AI 智能导入：抽文本/图片 → 调模型 → 归一成 ImportPreview，并处理图片落库。 */
package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.ai.core.AiImageSupport;
import cn.surveyking.server.ai.core.AiReadiness;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.importer.DocumentTextExtractor;
import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.core.importer.QuestionImageUploader;
import cn.surveyking.server.core.importer.WordQuestionParser;
import cn.surveyking.server.core.uitls.InMemoryMultipartFile;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.UploadFileRequest;
import cn.surveyking.server.service.AiImportService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI 智能导入：抽取文档文字与图片后交给模型转成题目，并复用规则导入的预览结构。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiImportServiceImpl implements AiImportService {

	private static final String PROMPT_TEXT = "import-ai";

	private static final String PROMPT_IMAGE = "import-ai-image";

	private static final int MAX_CHUNK_CHARS = 8_000;

	private static final int MAX_CHUNKS = 12;

	private static final int MAX_IMAGES = 10;

	private static final int MAX_IMAGES_PER_CALL = 5;

	private static final long MAX_IMAGE_BYTES = 2L * 1024 * 1024;

	private static final int TITLE_MAX_CHARS = 80;

	private static final String NO_QUESTION = "无题目";

	private static final String IGNORE = "忽略";

	private static final String PLAIN_TEXT_TYPE = "粘贴的纯文本";

	private static final String TITLE_GUARD = "AI 导入";

	private static final Pattern BLANK_BLOCK = Pattern.compile("\\n\\s*\\n");

	private static final Pattern FENCE = Pattern.compile("\u0060\u0060\u0060[A-Za-z0-9_-]*");

	private static final Pattern IMAGE_TOKEN = Pattern.compile("\\[\\[IMG:(\\d+)]]");

	private static final Pattern STANDALONE_TOKEN = Pattern.compile("^\\s*\\[\\[IMG:\\d+]]\\s*$");

	private static final Pattern META_LINE = Pattern
			.compile("^(答案解析|参考答案|正确答案|答案|解析|标签|难度|分数|分值|题型|章节)\\s*[:：].*$");

	private static final Pattern FIGURE_LINE = Pattern.compile("^配图\\s*[:：].*$");

	private static final Pattern FIGURE_PREFIX = Pattern.compile("^配图\\s*[:：]\\s*");

	private static final Pattern MULTIPLE_SPACES = Pattern.compile("\\s{2,}");

	private final AiAssistSupport support;

	private final AiGateway aiGateway;

	private final FileService fileService;

	@Override
	public ImportPreview parse(ImportParseRequest request) {
		long startedAt = System.currentTimeMillis();
		if (request == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请上传要导入的文件或粘贴题目文本");
		}
		List<ImportPreview.Warning> warnings = new ArrayList<>();
		List<DocumentTextExtractor.ExtractedImage> images = new ArrayList<>();
		String text;
		String fileType;
		String titleFallback = null;
		MultipartFile file = request.getFile();
		if (file != null && !file.isEmpty()) {
			DocumentTextExtractor.Extracted extracted = DocumentTextExtractor.extract(file);
			text = extracted.getText();
			warnings.addAll(extracted.getWarnings());
			images.addAll(extracted.getImages());
			fileType = describeFileType(file.getOriginalFilename());
			titleFallback = DocumentTextExtractor.baseNameOf(file.getOriginalFilename());
		}
		else {
			text = request.getText() == null ? "" : request.getText();
			if (!StringUtils.hasText(text)) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "请上传要导入的文件或粘贴题目文本");
			}
			if (text.length() > DocumentTextExtractor.MAX_TEXT_LENGTH) {
				throw new ErrorCodeException(ErrorCode.FileParseError, "文本内容过长（上限 20 万字）");
			}
			fileType = PLAIN_TEXT_TYPE;
		}

		ImportPreview preview = null;
		int chunkCount = 0;
		int textChars = 0;
		if (StringUtils.hasText(text)) {
			List<String> chunks = splitChunks(text, warnings);
			chunkCount = chunks.size();
			String merged = callTextModel(chunks, fileType, warnings);
			textChars = merged.replaceAll("\\s", "").length();
			if (StringUtils.hasText(merged)) {
				preview = buildPreview(merged, titleFallback);
				warnings.addAll(preview.getWarnings());
			}
		}

		List<DocumentTextExtractor.ExtractedImage> usableImages = selectImages(images, warnings);
		int referencedImages = 0;
		if (!usableImages.isEmpty()) {
			ImageOutcome outcome = handleImages(preview, usableImages, titleFallback, warnings);
			preview = outcome.preview();
			referencedImages = outcome.persisted();
		}

		if (preview == null || preview.getFlat() == null || preview.getFlat().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "AI 没能识别出题目，请检查文档内容或换一份重试");
		}

		preview.setStats(statsOf(preview.getFlat(), preview.getTree()));
		List<ImportPreview.Warning> allWarnings = new ArrayList<>(warnings);
		if (images.isEmpty() && !PLAIN_TEXT_TYPE.equals(fileType)) {
			allWarnings.add(info("AI_TEXT_ONLY",
					"AI 导入只保留文字与题目，公式与特殊排版可能丢失；需要保留图片请用 Word/Excel 规则导入"));
		}
		allWarnings.add(info("AI_PARSED", summaryMessage(preview.getFlat().size(), chunkCount, textChars,
				usableImages.size(), referencedImages)));
		preview.setWarnings(allWarnings);
		log.info("AI 导入解析: 文件类型={}, 文本段={}, 文本字数={}, 图片={} 张, 已保存图片={} 张, 题数={}, 耗时={}ms",
				fileType, chunkCount, textChars, usableImages.size(), referencedImages,
				Integer.valueOf(preview.getFlat().size()), Long.valueOf(System.currentTimeMillis() - startedAt));
		return preview;
	}

	@Override
	public ImportPreview buildPreview(String aiText, String titleFallback) {
		List<String> lines = guardLeadingImageToken(normalizeImageTokens(splitLines(aiText)));
		WordQuestionParser.Sectioned sectioned = WordQuestionParser.parseSections(lines);
		String title = sectioned.title();
		if (TITLE_GUARD.equals(title) || !StringUtils.hasText(title)) {
			title = fallbackTitle(titleFallback);
		}
		sectioned.tree().setTitle(title);
		ImportPreview preview = ImportPreview.builder().title(title).tree(sectioned.tree())
				.flat(new ArrayList<>(sectioned.flat())).warnings(new ArrayList<>(sectioned.warnings())).build();
		preview.setStats(statsOf(preview.getFlat(), preview.getTree()));
		return preview;
	}

	private String callTextModel(List<String> chunks, String fileType, List<ImportPreview.Warning> warnings) {
		String userId = SecurityContextUtils.getUserId();
		StringBuilder merged = new StringBuilder();
		for (int index = 0; index < chunks.size(); index++) {
			Map<String, String> vars = new LinkedHashMap<>();
			vars.put("index", String.valueOf(index + 1));
			vars.put("total", String.valueOf(chunks.size()));
			vars.put("fileType", fileType);
			vars.put("chunk", chunks.get(index));
			AiRequest aiRequest = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_TEXT, vars))
					.userPrompt("请把上面的文档内容转换成题目文本，只输出题目，不要解释。").temperature(0.2D)
					.background(true).build();
			String piece = stripFences(complete(userId, aiRequest));
			if (!StringUtils.hasText(piece) || NO_QUESTION.equals(piece.trim())) {
				warnings.add(warn("AI_CHUNK_EMPTY", "第 " + (index + 1) + " / " + chunks.size() + " 段没有识别出题目内容"));
				continue;
			}
			if (merged.length() > 0) {
				merged.append("\n\n");
			}
			merged.append(piece);
		}
		return merged.toString();
	}

	private ImageOutcome handleImages(ImportPreview preview, List<DocumentTextExtractor.ExtractedImage> images,
			String titleFallback, List<ImportPreview.Warning> warnings) {
		AiReadiness readiness = aiGateway.readiness();
		if (!readiness.isReady()) {
			if (preview == null) {
				throw new ErrorCodeException(ErrorCode.ValidationError, readiness.getReason());
			}
			warnings.add(warn("AI_IMAGE_SKIPPED",
					"AI 暂不可用（" + readiness.getReason() + "），已跳过 " + images.size() + " 张图片"));
			return new ImageOutcome(preview, 0);
		}
		if (!aiGateway.supportsImage(readiness.getModel())) {
			if (preview == null) {
				throw new ErrorCodeException(ErrorCode.ValidationError,
						"当前模型不支持图片，无法识别这份图片文档；请在 系统设置 → AI → 模型目录 里给模型勾选「图片」，或改用 Word/Excel 规则导入");
			}
			warnings.add(warn("AI_IMAGE_SKIPPED", "当前模型不支持图片，已跳过 " + images.size()
					+ " 张图片；图片里如果还有题目，请在 系统设置 → AI → 模型目录 里给模型勾选「图片」后重新导入"));
			return new ImageOutcome(preview, 0);
		}
		ImportPreview target = preview == null ? buildPreview("", titleFallback) : preview;
		callImageModel(images, target, warnings);
		return new ImageOutcome(target, persistImages(target, images, warnings));
	}

	private void callImageModel(List<DocumentTextExtractor.ExtractedImage> images, ImportPreview preview,
			List<ImportPreview.Warning> warnings) {
		String userId = SecurityContextUtils.getUserId();
		int batchCount = (images.size() + MAX_IMAGES_PER_CALL - 1) / MAX_IMAGES_PER_CALL;
		for (int start = 0, batch = 1; start < images.size(); start += MAX_IMAGES_PER_CALL, batch++) {
			List<DocumentTextExtractor.ExtractedImage> slice = images.subList(start,
					Math.min(start + MAX_IMAGES_PER_CALL, images.size()));
			List<PreparedImage> prepared = new ArrayList<>();
			for (DocumentTextExtractor.ExtractedImage image : slice) {
				String dataUrl = AiImageSupport.toDataUrl(image.getData());
				if (dataUrl == null) {
					warnings.add(warn("AI_IMAGE_SKIPPED", "第 " + image.getIndex()
							+ " 张图片无法转成模型可读的格式（只支持 png / jpg / jpeg），已跳过"));
					continue;
				}
				Map<String, String> vars = new LinkedHashMap<>();
				vars.put("index", String.valueOf(image.getIndex()));
				vars.put("total", String.valueOf(images.size()));
				vars.put("context",
						StringUtils.hasText(image.getContext()) ? image.getContext() : "（图片附近没有文字）");
				prepared.add(new PreparedImage(dataUrl, support.prompts().render(PROMPT_IMAGE, vars)));
			}
			if (prepared.isEmpty()) {
				continue;
			}
			StringBuilder systemPrompt = new StringBuilder();
			List<String> dataUrls = new ArrayList<>();
			for (PreparedImage item : prepared) {
				if (systemPrompt.length() > 0) {
					systemPrompt.append("\n\n---\n\n");
				}
				systemPrompt.append(item.prompt());
				dataUrls.add(item.dataUrl());
			}
			AiRequest aiRequest = AiRequest.builder().systemPrompt(systemPrompt.toString())
					.userPrompt("请按上面的编号处理这些图片，只输出题目文本或「配图：」行，不要解释。")
					.imageDataUrls(dataUrls).temperature(0.2D).background(true).build();
			String output = stripFences(complete(userId, aiRequest));
			if (!StringUtils.hasText(output) || NO_QUESTION.equals(output.trim()) || IGNORE.equals(output.trim())) {
				warnings.add(warn("AI_CHUNK_EMPTY", "第 " + batch + " / " + batchCount + " 批图片没有识别出题目内容"));
				continue;
			}
			mergeImageOutput(preview, output, warnings);
		}
	}

	private void mergeImageOutput(ImportPreview preview, String output, List<ImportPreview.Warning> warnings) {
		List<String> dslLines = new ArrayList<>();
		List<String> figureLines = new ArrayList<>();
		for (String raw : output.replace("\r\n", "\n").split("\n", -1)) {
			String line = raw.trim();
			if (!StringUtils.hasText(line)) {
				dslLines.add("");
				continue;
			}
			if (IGNORE.equals(line)) {
				continue;
			}
			if (FIGURE_LINE.matcher(line).matches()) {
				figureLines.add(line);
			}
			else {
				dslLines.add(line);
			}
		}
		String dsl = String.join("\n", dslLines).trim();
		if (StringUtils.hasText(dsl) && !NO_QUESTION.equals(dsl)) {
			ImportPreview extra = buildPreview(dsl, null);
			warnings.addAll(extra.getWarnings());
			mergePreview(preview, extra);
		}
		for (String figureLine : figureLines) {
			applyFigure(preview, figureLine);
		}
	}

	private void mergePreview(ImportPreview target, ImportPreview extra) {
		List<SurveySchema> existing = target.getFlat();
		Map<String, SurveySchema> index = new LinkedHashMap<>();
		for (SurveySchema question : existing) {
			index.putIfAbsent(stemKey(question.getTitle()), question);
		}
		Set<SurveySchema> duplicates = Collections.newSetFromMap(new IdentityHashMap<>());
		for (SurveySchema question : extra.getFlat()) {
			String key = stemKey(question.getTitle());
			SurveySchema matched = key.isEmpty() ? null : index.get(key);
			if (matched != null) {
				appendTokens(matched, question.getTitle());
				duplicates.add(question);
				continue;
			}
			existing.add(question);
			if (!key.isEmpty()) {
				index.put(key, question);
			}
		}
		target.getTree().getChildren().addAll(withoutDuplicates(extra.getTree().getChildren(), duplicates));
	}

	private List<SurveySchema> withoutDuplicates(List<SurveySchema> children, Set<SurveySchema> duplicates) {
		List<SurveySchema> result = new ArrayList<>();
		if (children == null) {
			return result;
		}
		for (SurveySchema child : children) {
			if (child == null || duplicates.contains(child)) {
				continue;
			}
			if (child.getType() == SurveySchema.QuestionType.QuestionSet && child.getChildren() != null) {
				List<SurveySchema> groupChildren = withoutDuplicates(child.getChildren(), duplicates);
				if (groupChildren.isEmpty()) {
					continue;
				}
				child.setChildren(groupChildren);
			}
			result.add(child);
		}
		return result;
	}

	private void applyFigure(ImportPreview preview, String line) {
		Matcher token = IMAGE_TOKEN.matcher(line);
		if (!token.find()) {
			return;
		}
		String imageToken = token.group();
		String keyword = FIGURE_PREFIX.matcher(line.substring(0, token.start())).replaceFirst("").replace("|", " ")
				.trim();
		String key = stemKey(keyword);
		if (key.length() >= 2) {
			for (SurveySchema question : preview.getFlat()) {
				if (question.getTitle() != null && stemKey(question.getTitle()).contains(key)) {
					appendTokens(question, imageToken);
					return;
				}
			}
		}
		ImportPreview extra = buildPreview(imageToken, null);
		if (extra.getFlat().isEmpty()) {
			return;
		}
		mergePreview(preview, extra);
	}

	private void appendTokens(SurveySchema question, String source) {
		if (question == null || !StringUtils.hasText(source) || !StringUtils.hasText(question.getTitle())) {
			return;
		}
		Matcher matcher = IMAGE_TOKEN.matcher(source);
		while (matcher.find()) {
			String token = matcher.group();
			if (!question.getTitle().contains(token)) {
				question.setTitle(question.getTitle() + " " + token);
			}
		}
	}

	private List<DocumentTextExtractor.ExtractedImage> selectImages(List<DocumentTextExtractor.ExtractedImage> images,
			List<ImportPreview.Warning> warnings) {
		List<DocumentTextExtractor.ExtractedImage> selected = new ArrayList<>();
		int tooLarge = 0;
		int overLimit = 0;
		for (DocumentTextExtractor.ExtractedImage image : images) {
			if (image == null || image.getData() == null || image.getData().length == 0) {
				continue;
			}
			if (image.getData().length > MAX_IMAGE_BYTES) {
				tooLarge++;
				continue;
			}
			if (selected.size() >= MAX_IMAGES) {
				overLimit++;
				continue;
			}
			selected.add(image);
		}
		if (tooLarge > 0) {
			warnings.add(warn("AI_IMAGE_SKIPPED", "有 " + tooLarge + " 张图片超过单张 2MB 限制，已跳过"));
		}
		if (overLimit > 0) {
			warnings.add(warn("AI_IMAGE_SKIPPED",
					"一次最多识别 " + MAX_IMAGES + " 张图片，另有 " + overLimit + " 张没有处理"));
		}
		return selected;
	}

	private int persistImages(ImportPreview preview, List<DocumentTextExtractor.ExtractedImage> images,
			List<ImportPreview.Warning> warnings) {
		Set<Integer> referencedIndexes = referencedImageIndexes(preview);
		int referenced = referencedIndexes.size();
		if (referenced == 0) {
			warnings.add(info("AI_IMAGE_UNUSED", "AI 判断这些图片与题目无关，没有把图片写进题干"));
			return 0;
		}
		Map<Integer, String> urls = new LinkedHashMap<>();
		for (Integer index : referencedIndexes) {
			DocumentTextExtractor.ExtractedImage image = findImage(images, index.intValue());
			if (image == null) {
				continue;
			}
			String url = uploadImage(image);
			if (url != null) {
				urls.put(index, url);
			}
		}
		boolean[] replaced = { false };
		Set<String> visited = new HashSet<>();
		applyImageUrls(preview.getTree(), urls, visited, replaced);
		for (SurveySchema question : preview.getFlat()) {
			applyImageUrls(question, urls, visited, replaced);
		}
		if (replaced[0]) {
			Set<String> synced = new HashSet<>();
			syncDataSourceLabels(preview.getTree(), synced);
			for (SurveySchema question : preview.getFlat()) {
				syncDataSourceLabels(question, synced);
			}
		}
		if (urls.size() < referenced) {
			warnings.add(warn("AI_IMAGE_UPLOAD_FAILED",
					"有 " + (referenced - urls.size()) + " 张图片没有保存成功，题干里已去掉对应占位"));
		}
		warnings.add(info("AI_IMAGES_PARSED",
				"题目引用了 " + referenced + " 张图片，已保存 " + urls.size() + " 张；没有被题目引用的图片不会上传"));
		return urls.size();
	}

	private String uploadImage(DocumentTextExtractor.ExtractedImage image) {
		String extension = QuestionImageUploader.guessImageExtension(image.getData());
		if (extension == null) {
			return null;
		}
		try {
			UploadFileRequest upload = new UploadFileRequest();
			upload.setFile(new InMemoryMultipartFile("file", "ai-import-image-" + image.getIndex() + "." + extension,
					QuestionImageUploader.mimeOf(extension), image.getData()));
			upload.setFileType(AppConsts.FileType.QUESTION_IMAGE);
			upload.setPublicRead(true);
			FileView view = fileService.upload(upload);
			return view == null || !StringUtils.hasText(view.getId()) ? null : "/api/public/preview/" + view.getId();
		}
		catch (Exception e) {
			log.warn("AI 导入：第 {} 张图片保存失败：{}", Integer.valueOf(image.getIndex()), e.getMessage());
			return null;
		}
	}

	private DocumentTextExtractor.ExtractedImage findImage(List<DocumentTextExtractor.ExtractedImage> images,
			int index) {
		for (DocumentTextExtractor.ExtractedImage image : images) {
			if (image.getIndex() == index) {
				return image;
			}
		}
		return null;
	}

	private Set<Integer> referencedImageIndexes(ImportPreview preview) {
		Set<Integer> indexes = new LinkedHashSet<>();
		Set<String> visited = new HashSet<>();
		collectImageIndexes(preview.getTree(), indexes, visited);
		for (SurveySchema question : preview.getFlat()) {
			collectImageIndexes(question, indexes, visited);
		}
		return indexes;
	}

	private void collectImageIndexes(SurveySchema node, Set<Integer> indexes, Set<String> visited) {
		if (node == null || (node.getId() != null && !visited.add(node.getId()))) {
			return;
		}
		Matcher matcher = IMAGE_TOKEN.matcher(node.getTitle() == null ? "" : node.getTitle());
		while (matcher.find()) {
			try {
				indexes.add(Integer.valueOf(matcher.group(1)));
			}
			catch (NumberFormatException ignored) {
				continue;
			}
		}
		if (node.getChildren() != null) {
			for (SurveySchema child : node.getChildren()) {
				collectImageIndexes(child, indexes, visited);
			}
		}
	}

	private void applyImageUrls(SurveySchema node, Map<Integer, String> urls, Set<String> visited,
			boolean[] replaced) {
		if (node == null || (node.getId() != null && !visited.add(node.getId()))) {
			return;
		}
		String title = node.getTitle();
		if (title != null && title.contains("[[IMG:")) {
			String value = title;
			for (Map.Entry<Integer, String> entry : urls.entrySet()) {
				value = value.replace("[[IMG:" + entry.getKey() + "]]", imageHtml(entry.getValue()));
			}
			value = MULTIPLE_SPACES.matcher(IMAGE_TOKEN.matcher(value).replaceAll("")).replaceAll(" ").trim();
			if (!value.equals(title)) {
				node.setTitle(value);
				replaced[0] = true;
				if (value.contains("<img")) {
					if (node.getAttribute() == null) {
						node.setAttribute(new SurveySchema.Attribute());
					}
					node.getAttribute().setRichTitle(true);
				}
			}
		}
		if (node.getChildren() != null) {
			for (SurveySchema child : node.getChildren()) {
				applyImageUrls(child, urls, visited, replaced);
			}
		}
	}

	private void syncDataSourceLabels(SurveySchema node, Set<String> visited) {
		if (node == null || (node.getId() != null && !visited.add(node.getId()))) {
			return;
		}
		if (node.getDataSource() != null && node.getChildren() != null) {
			for (SurveySchema.DataSource source : node.getDataSource()) {
				if (source == null || source.getValue() == null) {
					continue;
				}
				for (SurveySchema child : node.getChildren()) {
					if (child != null && source.getValue().equals(child.getId()) && child.getTitle() != null) {
						source.setLabel(child.getTitle());
					}
				}
			}
		}
		if (node.getChildren() != null) {
			for (SurveySchema child : node.getChildren()) {
				syncDataSourceLabels(child, visited);
			}
		}
	}

	private List<String> splitChunks(String text, List<ImportPreview.Warning> warnings) {
		List<String> chunks = new ArrayList<>();
		StringBuilder current = new StringBuilder();
		boolean truncated = false;
		for (String block : BLANK_BLOCK.split(text.replace("\r\n", "\n"))) {
			for (String piece : hardSplit(block)) {
				if (chunks.size() >= MAX_CHUNKS) {
					truncated = true;
					break;
				}
				if (current.length() > 0 && current.length() + 2 + piece.length() > MAX_CHUNK_CHARS) {
					chunks.add(current.toString());
					current.setLength(0);
					if (chunks.size() >= MAX_CHUNKS) {
						truncated = true;
						break;
					}
				}
				if (current.length() > 0) {
					current.append("\n\n");
				}
				current.append(piece);
			}
			if (truncated) {
				break;
			}
		}
		if (!truncated && current.length() > 0) {
			chunks.add(current.toString());
		}
		if (truncated) {
			warnings.add(warn("AI_TRUNCATED", "文档较长，只处理了前 " + MAX_CHUNKS + " 段（约 "
					+ (MAX_CHUNKS * MAX_CHUNK_CHARS) + " 字），请拆分后分段导入"));
		}
		return chunks;
	}

	private List<String> hardSplit(String block) {
		List<String> pieces = new ArrayList<>();
		String value = block == null ? "" : block.trim();
		while (value.length() > MAX_CHUNK_CHARS) {
			pieces.add(value.substring(0, MAX_CHUNK_CHARS));
			value = value.substring(MAX_CHUNK_CHARS).trim();
		}
		if (StringUtils.hasText(value)) {
			pieces.add(value);
		}
		return pieces;
	}

	private List<String> guardLeadingImageToken(List<String> lines) {
		int first = -1;
		for (int index = 0; index < lines.size(); index++) {
			if (StringUtils.hasText(lines.get(index))) {
				first = index;
				break;
			}
		}
		if (first < 0 || !STANDALONE_TOKEN.matcher(lines.get(first)).matches()) {
			return lines;
		}
		List<String> guarded = new ArrayList<>(lines);
		guarded.add(first, TITLE_GUARD);
		return guarded;
	}

	private List<String> splitLines(String text) {
		if (text == null) {
			return new ArrayList<>();
		}
		return new ArrayList<>(List.of(text.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1)));
	}

	private List<String> normalizeImageTokens(List<String> lines) {
		List<String> normalized = new ArrayList<>();
		for (String line : lines) {
			String value = line == null ? "" : line;
			if (STANDALONE_TOKEN.matcher(value).matches()) {
				int target = -1;
				for (int index = normalized.size() - 1; index >= 0; index--) {
					String candidate = normalized.get(index);
					if (!StringUtils.hasText(candidate)) {
						break;
					}
					if (META_LINE.matcher(candidate.trim()).matches()) {
						continue;
					}
					target = index;
					break;
				}
				if (target >= 0) {
					normalized.set(target, normalized.get(target).trim() + " " + value.trim());
					continue;
				}
			}
			normalized.add(value);
		}
		return normalized;
	}

	private ImportPreview.Stats statsOf(List<SurveySchema> flat, SurveySchema tree) {
		Map<String, Integer> byType = new LinkedHashMap<>();
		double score = 0;
		int total = 0;
		for (SurveySchema question : flat) {
			if (question == null || question.getType() == null) {
				continue;
			}
			total++;
			byType.merge(question.getType().name(), 1, Integer::sum);
			Double itemScore = question.getAttribute() == null ? null : question.getAttribute().getExamScore();
			score += itemScore == null ? 0 : itemScore;
		}
		return ImportPreview.Stats.builder().total(total).score(score).groups(countGroups(tree)).byType(byType).build();
	}

	private int countGroups(SurveySchema tree) {
		if (tree == null || tree.getChildren() == null) {
			return 0;
		}
		int groups = 0;
		for (SurveySchema child : tree.getChildren()) {
			if (child != null && child.getType() == SurveySchema.QuestionType.QuestionSet) {
				groups++;
			}
		}
		return groups;
	}

	private String fallbackTitle(String fileName) {
		if (!StringUtils.hasText(fileName)) {
			return null;
		}
		String value = SchemaHelper.trimHtmlTag(fileName).replaceAll("\\s+", " ").trim();
		if (!StringUtils.hasText(value)) {
			return null;
		}
		return value.length() <= TITLE_MAX_CHARS ? value : value.substring(0, TITLE_MAX_CHARS);
	}

	private String stemKey(String title) {
		if (!StringUtils.hasText(title)) {
			return "";
		}
		return SchemaHelper.trimHtmlTag(title).toLowerCase(Locale.ROOT).replaceAll("[\\s\\p{P}\\p{S}]", "");
	}

	private String stripFences(String text) {
		if (!StringUtils.hasText(text)) {
			return "";
		}
		return FENCE.matcher(text.replace("\r\n", "\n")).replaceAll("").trim();
	}

	private String complete(String userId, AiRequest aiRequest) {
		return support.call(AiUsageService.SCENE_IMPORT_AI, userId, aiRequest, false).getText();
	}

	private String describeFileType(String fileName) {
		String extension = DocumentTextExtractor.extensionOf(fileName);
		return switch (extension) {
			case "docx" -> "Word 文档（.docx）";
			case "pdf" -> "PDF 文档";
			case "xlsx", "xls" -> "Excel 工作簿（." + extension + "）";
			case "md" -> "Markdown 文本";
			case "csv" -> "CSV 表格";
			case "png", "jpg", "jpeg" -> "图片（." + extension + "）";
			default -> "纯文本";
		};
	}

	private String summaryMessage(int questions, int chunks, int chars, int images, int persisted) {
		StringBuilder message = new StringBuilder("AI 识别出 ").append(questions).append(" 道题");
		if (chunks > 0) {
			message.append("（文本 ").append(chunks).append(" 段、").append(chars).append(" 字");
			if (images > 0) {
				message.append("；图片 ").append(images).append(" 张，题目引用 ").append(persisted).append(" 张");
			}
			message.append("）");
		}
		else if (images > 0) {
			message.append("（图片 ").append(images).append(" 张，题目引用 ").append(persisted).append(" 张）");
		}
		return message.toString();
	}

	private String imageHtml(String url) {
		return "<img src=\"" + url + "\" style=\"max-width:100%;\" />";
	}

	private ImportPreview.Warning warn(String code, String message) {
		return ImportPreview.Warning.builder().level("warn").code(code).message(message).build();
	}

	private ImportPreview.Warning info(String code, String message) {
		return ImportPreview.Warning.builder().level("info").code(code).message(message).build();
	}

	private record PreparedImage(String dataUrl, String prompt) {
	}

	private record ImageOutcome(ImportPreview preview, int persisted) {
	}

}
