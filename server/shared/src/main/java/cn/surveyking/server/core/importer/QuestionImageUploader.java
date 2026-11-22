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

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;








@Slf4j
public final class QuestionImageUploader {


	public static final String IMG_STYLE = "max-width:100%;height:auto;max-height:360px;object-fit:contain;display:block;margin:6px 0;";

	/** 生成题面图片的 HTML：src 传完整预览地址，统一带响应式尺寸限制 */
	public static String imgHtml(String src) {
		return "<img src=\"" + src + "\" style=\"" + IMG_STYLE + "\" />";
	}

	private QuestionImageUploader() {
	}

	/** 逐张上传并把 {@code } 追加到题干末尾；返回成功挂上的张数 */
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
				appendImage(schema, imgHtml("/api/public/preview/" + view.getId()));
				attached++;
			}
			catch (Exception e) {

				log.warn("导入图片上传失败，已跳过该图片：{}", e.getMessage());
			}
		}
		return attached;
	}

	/** 按选项列/行把 Excel 内嵌图片挂到选项或题干（题库导入没有 token 替换那一层，直接挂 HTML）；返回挂上的总张数 */
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
			Map<String, Integer> optionColumns = template.getSourceOptionColumns();
			Set<Integer> optionColumnSet = new LinkedHashSet<>();
			if (optionColumns != null) {
				optionColumnSet.addAll(optionColumns.values());
				for (SurveySchema child : schema.getChildren() == null ? List.<SurveySchema>of() : schema.getChildren()) {
					Integer column = optionColumns.get(child.getId());
					if (column == null) {
						continue;
					}
					int count = attach(fileService, child,
							rowImages.imagesOfCell(template.getSourceSheet(), template.getSourceRow(), column));
					if (count > 0) {
						attached += count;
						syncDataSourceLabel(schema, child);
					}
				}
			}
			attached += attach(fileService, schema, rowImages.imagesOfRowExcept(template.getSourceSheet(),
					template.getSourceRow(), optionColumnSet));
		}
		return attached;
	}

	private static void syncDataSourceLabel(SurveySchema schema, SurveySchema option) {
		if (schema.getDataSource() == null) {
			return;
		}
		for (SurveySchema.DataSource dataSource : schema.getDataSource()) {
			if (dataSource != null && dataSource.getValue() != null && dataSource.getValue().equals(option.getId())) {
				dataSource.setLabel(option.getTitle());
				return;
			}
		}
	}

	/** 把一段 {@code } 追加到题干末尾，并打上富题干标记（渲染层据此消毒后展示） */
	public static void appendImage(SurveySchema schema, String html) {
		String title = schema.getTitle() == null ? "" : schema.getTitle().trim();
		schema.setTitle(title.isEmpty() ? html : title + " " + html);
		if (schema.getAttribute() == null) {
			schema.setAttribute(new SurveySchema.Attribute());
		}
		schema.getAttribute().setRichTitle(true);
	}

	/** 按文件头判断图片类型；不是支持的位图返回 null */
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
