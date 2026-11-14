package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.importer.ImportKind;
import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ExcelQuestionParser;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.core.importer.TextQuestionParser;
import cn.surveyking.server.core.importer.WordQuestionParser;
import cn.surveyking.server.domain.dto.PaperImportRecordRequest;
import cn.surveyking.server.service.ExportGuardService;
import cn.surveyking.server.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;

/**
 * 导入解析实现。解析阶段不写库，避免“解析失败却留下空项目”。
 */
@Service
@RequiredArgsConstructor
public class ImportServiceImpl implements ImportService {

	private static final int MAX_TEXT_LENGTH = 200_000;

	private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

	private final ExportGuardService exportGuardService;

	@Override
	public ImportPreview parse(ImportParseRequest request) {
		ImportKind kind = resolveKind(request);
		switch (kind) {
			case text:
				return parseText(request.getText());
			case word:
				requireFile(request);
				requireDocx(request);
				return new WordQuestionParser(request.getFile()).parse();
			case excel:
				requireFile(request);
				return new ExcelQuestionParser(request.getFile()).parse();
			case json:
				throw new ErrorCodeException(ErrorCode.FileParseError, "JSON 导入将在后续版本开放");
			default:
				throw new ErrorCodeException(ErrorCode.FileParseError, "无法识别的导入格式");
		}
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

}
