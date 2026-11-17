package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.InMemoryMultipartFile;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import cn.surveyking.server.domain.dto.UploadFileRequest;
import cn.surveyking.server.service.FileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 导入时把题目里抽出来的图片落成文件，并把 {@code <img>} 追加到题干末尾。
 *
 * <p>
 * 试卷导入（ImportServiceImpl）走的是 token 替换那一套；题库导入（RepoServiceImpl）没有 token，
 * 直接按行把图片挂到题干上——两边的上传口径（QUESTION_IMAGE + publicRead + 公开预览地址）这里统一。
 */
@Slf4j
public final class QuestionImageUploader {

	/** 公开预览地址前缀 + 后缀（用拼接而不是 String.format：串里有 %，format 会把它当格式符） */
	private static final String IMG_PREFIX = "<img src=\"/api/public/preview/";

	private static final String IMG_SUFFIX = "\" style=\"max-width:100%;\" />";

	private QuestionImageUploader() {
	}

	/**
	 * 逐张上传并把 {@code <img>} 追加到题干末尾；返回成功挂上的张数。
	 *
	 * <p>
	 * 单张失败只跳过该张（记日志），不让整批导入失败。
	 */
	public static int attach(FileService fileService, SurveySchema schema, List<byte[]> images) {
		if (fileService == null || schema == null || images == null || images.isEmpty()) {
			return 0;
		}
		int attached = 0;
		for (byte[] data : images) {
			String extension = guessImageExtension(data);
			if (extension == null) {
				continue;
			}
			try {
				UploadFileRequest upload = new UploadFileRequest();
				upload.setFile(new InMemoryMultipartFile("file", "import-image." + extension, mimeOf(extension), data));
				upload.setFileType(AppConsts.FileType.QUESTION_IMAGE);
				upload.setPublicRead(true);
				FileView view = fileService.upload(upload);
				if (view == null || !StringUtils.hasText(view.getId())) {
					continue;
				}
				appendImage(schema, IMG_PREFIX + view.getId() + IMG_SUFFIX);
				attached++;
			}
			catch (Exception e) {
				// 单张图片失败不影响整份导入
				log.warn("导入图片上传失败，已跳过该图片：{}", e.getMessage());
			}
		}
		return attached;
	}

	/**
	 * 按 {@link TemplateRequest#getSourceSheet()}/{@link TemplateRequest#getSourceRow()} 把 Excel 内嵌图片挂到
	 * 每道题的题干末尾（题库导入没有 token 替换那一层，直接挂 HTML）；返回挂上的总张数。
	 */
	public static int attachRowImages(FileService fileService, List<TemplateRequest> templates,
			ExcelRowImages rowImages) {
		if (templates == null || rowImages == null || rowImages.isEmpty()) {
			return 0;
		}
		int attached = 0;
		for (TemplateRequest template : templates) {
			SurveySchema schema = template.getTemplate();
			if (schema == null) {
				continue;
			}
			attached += attach(fileService, schema, rowImages.imagesOf(template.getSourceSheet(), template.getSourceRow()));
		}
		return attached;
	}

	/** 把一段 {@code <img>} 追加到题干末尾，并打上富题干标记（渲染层据此消毒后展示）。 */
	public static void appendImage(SurveySchema schema, String html) {
		String title = schema.getTitle() == null ? "" : schema.getTitle().trim();
		schema.setTitle(title.isEmpty() ? html : title + " " + html);
		if (schema.getAttribute() == null) {
			schema.setAttribute(new SurveySchema.Attribute());
		}
		schema.getAttribute().setRichTitle(true);
	}

	/**
	 * 按文件头判断图片类型；不是支持的位图返回 null。
	 */
	public static String guessImageExtension(byte[] data) {
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

	public static String mimeOf(String extension) {
		if ("png".equals(extension)) {
			return "image/png";
		}
		if ("gif".equals(extension)) {
			return "image/gif";
		}
		if ("bmp".equals(extension)) {
			return "image/bmp";
		}
		return "image/jpeg";
	}

}
