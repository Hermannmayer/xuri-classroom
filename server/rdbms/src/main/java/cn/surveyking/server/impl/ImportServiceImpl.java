package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.importer.ImportKind;
import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ExcelQuestionParser;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.core.importer.JsonQuestionParser;
import cn.surveyking.server.core.importer.TextQuestionParser;
import cn.surveyking.server.core.importer.WordQuestionParser;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.PaperImportRecordRequest;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.UploadFileRequest;
import cn.surveyking.server.service.ExportGuardService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 导入解析实现。解析阶段不写库，避免“解析失败却留下空项目”。
 */
@Service
@RequiredArgsConstructor
public class ImportServiceImpl implements ImportService {

	private static final int MAX_TEXT_LENGTH = 200_000;

	private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

	private final ExportGuardService exportGuardService;

	private final FileService fileService;

	@Override
	public ImportPreview parse(ImportParseRequest request) {
		ImportKind kind = resolveKind(request);
		ImportPreview preview;
		switch (kind) {
			case text:
				preview = parseText(request.getText());
				break;
			case word:
				requireFile(request);
				requireDocx(request);
				preview = new WordQuestionParser(request.getFile()).parse();
				break;
			case excel:
				requireFile(request);
				preview = new ExcelQuestionParser(request.getFile()).parse();
				break;
			case json:
				requireFile(request);
				preview = new JsonQuestionParser(request.getFile()).parse();
				break;
			default:
				throw new ErrorCodeException(ErrorCode.FileParseError, "无法识别的导入格式");
		}
		applyAttachments(preview);
		return preview;
	}

	/**
	 * 把解析时抽出的图片落成文件，并把题干里的占位 token 换成图片地址。
	 */
	private void applyAttachments(ImportPreview preview) {
		Map<String, byte[]> attachments = preview.getAttachments();
		if (attachments == null || attachments.isEmpty()) {
			return;
		}
		Map<String, String> urls = new HashMap<>();
		for (Map.Entry<String, byte[]> entry : attachments.entrySet()) {
			String ext = guessImageExtension(entry.getValue());
			if (ext == null) {
				continue;
			}
			try {
				UploadFileRequest upload = new UploadFileRequest();
				upload.setFile(new ByteArrayMultipartFile("file", "word-image." + ext, mimeOf(ext), entry.getValue()));
				upload.setFileType(AppConsts.FileType.QUESTION_IMAGE);
				upload.setPublicRead(true);
				FileView view = fileService.upload(upload);
				if (view != null && StringUtils.hasText(view.getId())) {
					urls.put(entry.getKey(), "/api/public/preview/" + view.getId());
				}
			}
			catch (Exception ex) {
				// 单张图片失败不影响整份导入
			}
		}
		if (!urls.isEmpty()) {
			replaceImageTokens(preview.getTree(), urls);
			for (SurveySchema question : preview.getFlat()) {
				replaceImageTokens(question, urls);
			}
		}
		attachments.clear();
	}

	private void replaceImageTokens(SurveySchema node, Map<String, String> urls) {
		if (node == null) {
			return;
		}
		String title = node.getTitle();
		if (StringUtils.hasText(title)) {
			String replaced = title;
			for (Map.Entry<String, String> entry : urls.entrySet()) {
				replaced = replaced.replace(entry.getKey(),
						"<img src=\"" + entry.getValue() + "\" style=\"max-width:100%;\" />");
			}
			if (!replaced.equals(title)) {
				node.setTitle(replaced);
				if (node.getAttribute() == null) {
					node.setAttribute(new SurveySchema.Attribute());
				}
				node.getAttribute().setRichTitle(true);
			}
		}
		if (node.getChildren() != null) {
			for (SurveySchema child : node.getChildren()) {
				replaceImageTokens(child, urls);
			}
		}
	}

	private String guessImageExtension(byte[] data) {
		if (data == null || data.length < 8) {
			return null;
		}
		if ((data[0] & 0xFF) == 0x89 && data[1] == 'P') {
			return "png";
		}
		if ((data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8) {
			return "jpg";
		}
		if (data[0] == 'G' && data[1] == 'I' && data[2] == 'F') {
			return "gif";
		}
		if (data[0] == 'B' && data[1] == 'M') {
			return "bmp";
		}
		return null;
	}

	private String mimeOf(String ext) {
		if ("png".equals(ext)) {
			return "image/png";
		}
		if ("gif".equals(ext)) {
			return "image/gif";
		}
		if ("bmp".equals(ext)) {
			return "image/bmp";
		}
		return "image/jpeg";
	}

	private void requireFile(ImportParseRequest request) {
		if (request.getFile() == null || request.getFile().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请上传要导入的文件");
		}
		if (request.getFile().getSize() > MAX_FILE_SIZE) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "文件超过 10MB 限制");
		}
	}

	private void requireDocx(ImportParseRequest request) {
		String name = request.getFile().getOriginalFilename();
		if (name != null && name.toLowerCase(Locale.ROOT).endsWith(".doc")) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "暂不支持 .doc 旧格式，请在 Word 里另存为 .docx 后重试");
		}
	}

	private ImportPreview parseText(String text) {
		if (!StringUtils.hasText(text)) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请粘贴需要导入的题目文本");
		}
		if (text.length() > MAX_TEXT_LENGTH) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "文本内容过长（上限 20 万字）");
		}
		ImportPreview preview = new TextQuestionParser(text).parse();
		if (preview.getFlat() == null || preview.getFlat().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "未识别到题目，请检查题型标记与空行分隔");
		}
		return preview;
	}

	private ImportKind resolveKind(ImportParseRequest request) {
		ImportKind kind = ImportKind.from(request.getKind());
		if (kind != ImportKind.auto) {
			return kind;
		}
		MultipartFile file = request.getFile();
		if (file == null || file.isEmpty()) {
			return ImportKind.text;
		}
		if (file.getSize() > MAX_FILE_SIZE) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "文件超过 10MB 限制");
		}
		String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
		if (name.endsWith(".docx") || name.endsWith(".doc")) {
			return ImportKind.word;
		}
		if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
			return ImportKind.excel;
		}
		if (name.endsWith(".json")) {
			return ImportKind.json;
		}
		return ImportKind.text;
	}

	@Override
	public void recordPaperImport(PaperImportRecordRequest request) {
		if (request == null || !StringUtils.hasText(request.getProjectId())) {
			return;
		}
		String source = StringUtils.hasText(request.getSource()) ? request.getSource() : "未知来源";
		int total = request.getTotal() == null ? 0 : request.getTotal();
		exportGuardService.record("IMPORT_PROJECT", request.getProjectId(), null,
				"导入试卷：" + source + "，共 " + total + " 题");
	}

	/**
	 * Word 里抽出来的图片包成 MultipartFile，直接走现有文件服务（公开预览地址）。
	 */
	private static final class ByteArrayMultipartFile implements MultipartFile {

		private final String name;

		private final String originalFilename;

		private final String contentType;

		private final byte[] content;

		private ByteArrayMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
			this.name = name;
			this.originalFilename = originalFilename;
			this.contentType = contentType;
			this.content = content;
		}

		@Override
		public String getName() {
			return name;
		}

		@Override
		public String getOriginalFilename() {
			return originalFilename;
		}

		@Override
		public String getContentType() {
			return contentType;
		}

		@Override
		public boolean isEmpty() {
			return content == null || content.length == 0;
		}

		@Override
		public long getSize() {
			return content.length;
		}

		@Override
		public byte[] getBytes() {
			return content;
		}

		@Override
		public InputStream getInputStream() {
			return new ByteArrayInputStream(content);
		}

		@Override
		public void transferTo(File dest) throws IOException {
			try (FileOutputStream out = new FileOutputStream(dest)) {
				out.write(content);
			}
		}

	}

}
