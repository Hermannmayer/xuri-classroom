package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.LocalStorageNameStrategyEnum;
import cn.surveyking.server.core.constant.LocalStoragePathStrategyEnum;
import cn.surveyking.server.core.constant.StorageTypeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.*;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.FileViewMapper;
import cn.surveyking.server.domain.model.File;
import cn.surveyking.server.mapper.FileMapper;
import cn.surveyking.server.service.FileRefService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.SurveyService;
import cn.surveyking.server.storage.StorageProperties;
import cn.surveyking.server.storage.StorageService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

import static cn.surveyking.server.core.constant.ErrorCode.FileUploadError;

/**
 * @author javahuang
 * @date 2021/9/10
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class FileServiceImpl extends ServiceImpl<FileMapper, File> implements FileService {

	private static final Set<String> SAFE_INLINE_EXTENSIONS = Collections
			.unmodifiableSet(new HashSet<>(Arrays.asList("jpg", "jpeg", "png", "gif", "bmp", "wbmp", "webp", "pdf",
					"txt", "csv", "mp3", "wav", "aac", "ogg", "mp4", "webm")));

	private static final Set<SurveySchema.QuestionType> PUBLIC_UPLOAD_TYPES = Collections
			.unmodifiableSet(EnumSet.of(SurveySchema.QuestionType.Upload, SurveySchema.QuestionType.Signature,
					SurveySchema.QuestionType.RichText, SurveySchema.QuestionType.Barcode));

	private static final int DEFAULT_MAX_FILE_COUNT = 20;

	/** imageQuality 配置写错（<=0 或 >1）时的兜底 JPEG 质量 */
	private static final float DEFAULT_IMAGE_QUALITY = 0.85f;

	private final StorageService storageService;

	private final FileViewMapper fileViewMapper;

	private final StorageProperties storageProperties;

	private final FileRefService fileRefService;

	private final AtomicLong seq = new AtomicLong(System.currentTimeMillis());

	private final ConcurrentMap<String, UploadRateWindow> publicUploadRateWindows = new ConcurrentHashMap<>();

	@Autowired
	@Lazy
	private ProjectService projectService;

	@Autowired
	@Lazy
	private SurveyService surveyService;

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void deleteFile(String id) {
		File file = getById(id);
		if (file == null) {
			return;
		}
		assertCurrentUserOwnsFile(file);
		fileRefService.deleteByFile(id);
		removeFileAndPhysical(file);
	}

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void deleteByOwner(String ownerType, String ownerId) {
		Set<String> fileIds = new java.util.LinkedHashSet<>(fileRefService.deleteByOwner(ownerType, ownerId));
		if ("project".equals(ownerType)) {
			// 富文本答案图片在 t_file.project_id 上，不一定有 t_file_ref；一起纳入清理
			list(Wrappers.<File>lambdaQuery().eq(File::getProjectId, ownerId)).forEach(file -> fileIds.add(file.getId()));
		}
		for (String fileId : fileIds) {
			File file = getById(fileId);
			if (file == null || StringUtils.isNotBlank(file.getAnswerId())) {
				continue;
			}
			// 还被别的项目/题库引用时保留物理文件
			if (fileRefService.countByFile(fileId) > 0) {
				continue;
			}
			removeFileAndPhysical(file);
		}
	}

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void deleteByAnswers(Collection<String> answerIds) {
		if (answerIds == null || answerIds.isEmpty()) {
			return;
		}
		// 只认 ANSWER_ATTACHMENT：题面富文本图片挂在 project 上，不是答卷的附属物
		List<File> files = list(Wrappers.<File>lambdaQuery().in(File::getAnswerId, answerIds)
				.eq(File::getStorageType, StorageTypeEnum.ANSWER_ATTACHMENT.getType()));
		for (File file : files) {
			fileRefService.deleteByFile(file.getId());
			removeFileAndPhysical(file);
		}
		log.info("清理答卷附件：答卷 {} 份，文件 {} 个", answerIds.size(), files.size());
	}

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void purgeProjectFiles(String projectId) {
		if (StringUtils.isBlank(projectId)) {
			return;
		}
		// 与 deleteByOwner 的关键区别：这里不跳过 answer_id 非空的行——项目都彻底删了，
		// 答卷附件（签名/上传件）留着只会变成永远没人认领的孤儿文件。
		List<File> files = list(Wrappers.<File>lambdaQuery().eq(File::getProjectId, projectId));
		for (File file : files) {
			fileRefService.deleteByFile(file.getId());
			removeFileAndPhysical(file);
		}
		log.info("清理项目全部文件：projectId={}，文件 {} 个", projectId, files.size());
	}

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void purgeFile(String fileId) {
		if (StringUtils.isBlank(fileId)) {
			return;
		}
		File file = getById(fileId);
		if (file == null) {
			return;
		}
		fileRefService.deleteByFile(fileId);
		removeFileAndPhysical(file);
	}

	@Override
	public void syncOwnerRefs(String ownerType, String ownerId, String html) {
		fileRefService.syncHtml(ownerType, ownerId, html);
	}

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void replaceOwnerRefs(String ownerType, String ownerId, String html) {
		Set<String> removed = fileRefService.replaceHtml(ownerType, ownerId, html);
		for (String fileId : removed) {
			File file = getById(fileId);
			if (file == null || StringUtils.isNotBlank(file.getAnswerId()) || fileRefService.countByFile(fileId) > 0) {
				continue;
			}
			removeFileAndPhysical(file);
		}
	}

	private void removeFileAndPhysical(File file) {
		deletePhysicalFileIfUnreferenced(file.getId(), file.getFilePath());
		deletePhysicalFileIfUnreferenced(file.getId(), file.getThumbFilePath());
		removeById(file.getId());
	}

	private void deletePhysicalFileIfUnreferenced(String fileId, String filePath) {
		if (StringUtils.isBlank(filePath)) {
			return;
		}
		long references = count(Wrappers.<File>lambdaQuery().ne(File::getId, fileId)
				.and(wrapper -> wrapper.eq(File::getFilePath, filePath).or().eq(File::getThumbFilePath, filePath)));
		if (references == 0) {
			storageService.deleteFile(filePath);
		}
	}

	@Override
	public FileView upload(UploadFileRequest request) {
		MultipartFile uploadFile = request.getFile();
		if (uploadFile == null || uploadFile.isEmpty()) {
			throw new ErrorCodeException(FileUploadError);
		}
		String originalName = validateOriginalFilename(uploadFile.getOriginalFilename());
		String extName = StringUtils.substringAfterLast(originalName, ".");
		String fileId = NanoIdUtils.randomNanoId();
		SurveySchema uploadSchema = null;

		// 通过问卷页面上传需要校验题型、文件类型、大小、频率和项目容量
		if (Boolean.TRUE.equals(request.getPublicUpload())) {
			if (StringUtils.isEmpty(request.getProjectId()) || StringUtils.isEmpty(request.getQuestionId())) {
				throw new ErrorCodeException(FileUploadError);
			}
			ProjectView projectView = projectService.getProject(request.getProjectId());
			// 校验对应项目状态
			surveyService.validateProject(projectView);

			uploadSchema = SchemaHelper.flatSurveySchema(projectView.getSurvey()).stream()
					.filter(x -> x.getId().equals(request.getQuestionId())).findFirst()
					.orElseThrow(() -> new ErrorCodeException(FileUploadError));
			if (!PUBLIC_UPLOAD_TYPES.contains(uploadSchema.getType())) {
				throw new ErrorCodeException(FileUploadError);
			}
			SurveySchema.Attribute attribute = getUploadAttribute(uploadSchema);
			String fileAccept = attribute.getFileAccept();
			if (StringUtils.isNotEmpty(fileAccept)) {
				// 只允许上传指定格式的文件
				boolean notAllowExtension = Arrays.stream(fileAccept.split(","))
						.map(type -> type.trim().replaceFirst("\\.", ""))
						.noneMatch(type -> type.equalsIgnoreCase(extName));
				if (notAllowExtension) {
					throw new ErrorCodeException(FileUploadError);
				}
			}
			else {
				// 默认文件类型白名单限制
				boolean notAllowExtension = Arrays.stream(FileUtils.ALLOWED_EXTENSIONS)
						.noneMatch(ext -> ext.equalsIgnoreCase(extName));
				if (notAllowExtension) {
					throw new ErrorCodeException(FileUploadError);
				}
			}

			if ((SurveySchema.QuestionType.Signature.equals(uploadSchema.getType())
					|| SurveySchema.QuestionType.RichText.equals(uploadSchema.getType())
					|| SurveySchema.QuestionType.Barcode.equals(uploadSchema.getType()))
					&& !isSupportImage(originalName)) {
				throw new ErrorCodeException(FileUploadError);
			}
			long configuredLimit = toBytes(attribute.getMaxFileSize(), storageProperties.getMaxPublicFileSizeMb());
			if (uploadFile.getSize() <= 0 || uploadFile.getSize() > configuredLimit) {
				throw new ErrorCodeException(ErrorCode.FileSizeExceeded);
			}
			assertPublicUploadRate(request.getProjectId());
			assertProjectStorageQuota(request.getProjectId(), uploadFile.getSize());
			if (SurveySchema.QuestionType.Barcode.equals(uploadSchema.getType())) {
				request.setFileType(AppConsts.FileType.BARCODE);
			}
			else if (SurveySchema.QuestionType.RichText.equals(uploadSchema.getType())) {
				request.setFileType(AppConsts.FileType.QUESTION_IMAGE);
			}
			else {
				request.setFileType(StorageTypeEnum.ANSWER_ATTACHMENT.getType());
			}
		}
		else if (Boolean.TRUE.equals(request.getPublicRead()) && !isSupportImage(originalName)) {
			throw new ErrorCodeException(FileUploadError);
		}

		if (isSupportImage(originalName)) {
			// 不能只信扩展名：解码确认是图片，再把 JPEG/PNG/BMP/WBMP 重新编码，剥掉 EXIF/尾部附加数据
			uploadFile = sanitizeImage(uploadFile, originalName);
			request.setFile(uploadFile);
		}

		String fileName = getFileNameByStrategy(originalName);
		String filePath = Boolean.TRUE.equals(request.getPublicUpload())
				? buildPublicFilePath(request, fileId, fileName) : getFilePathByStrategy(request, fileId, fileName);
		File file = new File();
		file.setId(fileId);
		file.setStorageType(request.getFileType());
		file.setOriginalName(originalName);
		file.setFileName(fileName);
		file.setFilePath(filePath);
		boolean publicRead = Boolean.TRUE.equals(request.getPublicUpload())
				? SurveySchema.QuestionType.RichText.equals(uploadSchema.getType())
				: Boolean.TRUE.equals(request.getPublicRead());
		file.setShared(publicRead ? 1 : 0);
		boolean projectOwner = "project".equals(request.getOwnerType());
		file.setProjectId(Boolean.TRUE.equals(request.getPublicUpload()) ? request.getProjectId()
				: projectOwner ? request.getOwnerId() : null);
		file.setQuestionId(request.getQuestionId());
		file.setFileSize(uploadFile.getSize());

		String barcodeContent = null;
		String thumbImagePath = null;
		try {
			if (AppConsts.FileType.BARCODE == request.getFileType()) {
				barcodeContent = BarcodeReader.readBarcode(uploadFile.getInputStream());
			}
			if (isSupportImage(originalName)) {
				thumbImagePath = storageService.getThumbImageFilePath(filePath);
				try (InputStream inputStream = uploadFile.getInputStream()) {
					storageService.uploadFile(storageService.generateThumbImage(inputStream), thumbImagePath);
					file.setThumbFilePath(thumbImagePath);
				}
			}
			storageService.uploadFile(uploadFile.getInputStream(), filePath);
			save(file);
			if (StringUtils.isNotBlank(request.getOwnerType()) && StringUtils.isNotBlank(request.getOwnerId())) {
				fileRefService.bind(fileId, request.getOwnerType(), request.getOwnerId(), request.getQuestionId());
			}
			FileView fileView = fileViewMapper.toView(file);
			fileView.setQuestionId(file.getQuestionId());
			fileView.setContent(barcodeContent);
			return fileView;
		}
		catch (Exception e) {
			storageService.deleteFile(filePath);
			storageService.deleteFile(thumbImagePath);
			if (e instanceof RuntimeException) {
				throw (RuntimeException) e;
			}
			throw new ErrorCodeException(FileUploadError);
		}
	}

	/**
	 * 根据存储配置，按照指定规则生成相应的文件名
	 * @param originalName 原文件名
	 * @return 文件名
	 */
	private String getFileNameByStrategy(String originalName) {
		String strategy = storageProperties.getLocal().getNameStrategy();
		int idx = originalName.lastIndexOf('.');
		if (idx <= 0 || idx == originalName.length() - 1) {
			throw new ErrorCodeException(FileUploadError);
		}
		String fileType = originalName.substring(idx);
		if (LocalStorageNameStrategyEnum.SEQ_ADN_ORIGINAL_NAME.getStrategy().equals(strategy)) {
			return seq.incrementAndGet() + "_" + originalName;
		}
		else if (LocalStorageNameStrategyEnum.ORIGINAL_NAME_AND_SEQ.getStrategy().equals(strategy)) {
			return originalName.substring(0, idx) + "_" + seq.incrementAndGet() + fileType;
		}
		else if (LocalStorageNameStrategyEnum.SEQ.getStrategy().equals(strategy)) {
			return seq.incrementAndGet() + fileType;
		}
		else {
			return UUID.randomUUID().toString().replace("-", "") + fileType;
		}
	}

	/**
	 * 根据本地存储配置，生成不同方式的文件保存路径
	 * @param request 文件上传请求
	 * @param fileName 文件名
	 * @return 文件保存路径
	 */
	private String getFilePathByStrategy(UploadFileRequest request, String fileId, String fileName) {
		String strategy = storageProperties.getLocal().getPathStrategy();
		if (LocalStoragePathStrategyEnum.BY_ID.getStrategy().equals(strategy)) {
			String basePath = sanitizeBasePath(request.getBasePath());
			return (StringUtils.isBlank(basePath) ? "" : basePath + java.io.File.separator) + fileId
					+ java.io.File.separator + fileName;
		}
		else if (LocalStoragePathStrategyEnum.BY_DATE.getStrategy().equals(strategy)) {
			String dateFormat = storageProperties.getLocal().getDateFormat();
			DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern(dateFormat);
			LocalDate now = LocalDate.now();
			dateFormat = now.format(dateTimeFormatter).replace("/", java.io.File.separator).replace("\\",
					java.io.File.separator);
			return dateFormat + java.io.File.separator + fileId + java.io.File.separator + fileName;
		}
		else {
			return fileId + java.io.File.separator + fileName;
		}
	}

	private String buildPublicFilePath(UploadFileRequest request, String fileId, String fileName) {
		return String.join(java.io.File.separator, "public", safePathSegment(request.getProjectId()),
				safePathSegment(request.getQuestionId()), fileId, fileName);
	}

	private String validateOriginalFilename(String originalName) {
		if (StringUtils.isBlank(originalName) || originalName.length() > 255 || ".".equals(originalName)
				|| "..".equals(originalName) || originalName.indexOf('/') >= 0 || originalName.indexOf('\\') >= 0
				|| originalName.chars().anyMatch(ch -> ch == 0 || ch < 0x20 || ch == 0x7f)) {
			throw new ErrorCodeException(FileUploadError);
		}
		return originalName;
	}

	private String sanitizeBasePath(String basePath) {
		if (StringUtils.isBlank(basePath)) {
			return null;
		}
		if (basePath.length() > 256 || basePath.startsWith("/") || basePath.startsWith("\\")) {
			throw new ErrorCodeException(FileUploadError);
		}
		return Arrays.stream(basePath.replace('\\', '/').split("/", -1)).map(this::safePathSegment)
				.collect(java.util.stream.Collectors.joining(java.io.File.separator));
	}

	private String safePathSegment(String value) {
		if (StringUtils.isBlank(value) || !value.matches("[a-zA-Z0-9_-]{1,128}")) {
			throw new ErrorCodeException(FileUploadError);
		}
		return value;
	}

	private SurveySchema.Attribute getUploadAttribute(SurveySchema schema) {
		if (!CollectionUtils.isEmpty(schema.getChildren()) && schema.getChildren().get(0).getAttribute() != null) {
			return schema.getChildren().get(0).getAttribute();
		}
		return Optional.ofNullable(schema.getAttribute()).orElseGet(SurveySchema.Attribute::new);
	}

	private long toBytes(Double questionLimitMb, long defaultLimitMb) {
		double limitMb = questionLimitMb != null && questionLimitMb > 0 ? Math.min(questionLimitMb, defaultLimitMb)
				: defaultLimitMb;
		return Math.max(1L, (long) (limitMb * 1024 * 1024));
	}

	private void assertProjectStorageQuota(String projectId, long newFileSize) {
		long quota = megabytesToBytes(storageProperties.getMaxProjectStorageMb());
		Long currentSize = getBaseMapper().selectTotalSizeByProjectId(projectId);
		if (exceedsQuota(Optional.ofNullable(currentSize).orElse(0L), newFileSize, quota)) {
			throw new ErrorCodeException(ErrorCode.FileStorageQuotaExceeded);
		}
		long totalQuota = megabytesToBytes(storageProperties.getMaxTotalPublicStorageMb());
		Long totalSize = getBaseMapper().selectTotalPublicSize();
		if (exceedsQuota(Optional.ofNullable(totalSize).orElse(0L), newFileSize, totalQuota)) {
			throw new ErrorCodeException(ErrorCode.FileStorageQuotaExceeded);
		}
	}

	private boolean exceedsQuota(long currentSize, long newFileSize, long quota) {
		return quota > 0 && (newFileSize > quota || currentSize > quota - newFileSize);
	}

	private long megabytesToBytes(long megabytes) {
		if (megabytes <= 0) {
			return 0;
		}
		try {
			return Math.multiplyExact(megabytes, 1024L * 1024L);
		}
		catch (ArithmeticException e) {
			return Long.MAX_VALUE;
		}
	}

	private void assertPublicUploadRate(String projectId) {
		long now = System.currentTimeMillis();
		HttpServletRequest httpRequest = ContextHelper.getCurrentHttpRequest();
		String remoteAddress = httpRequest == null ? "unknown" : IPUtils.getClientIpAddress(httpRequest);
		if (!acquireRateLimit("client:" + remoteAddress, storageProperties.getMaxPublicUploadsPerMinute(), now)
				|| !acquireRateLimit("project:" + projectId, storageProperties.getMaxPublicUploadsPerProjectPerMinute(),
						now)) {
			throw new ErrorCodeException(ErrorCode.FileUploadRateExceeded);
		}
		if (publicUploadRateWindows.size() > 10000) {
			publicUploadRateWindows.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
		}
	}

	private boolean acquireRateLimit(String key, int limit, long now) {
		if (limit <= 0) {
			return true;
		}
		return publicUploadRateWindows.computeIfAbsent(key, ignored -> new UploadRateWindow(now)).tryAcquire(limit,
				now);
	}

	private MultipartFile sanitizeImage(MultipartFile uploadFile, String originalName) {
		try (InputStream inputStream = uploadFile.getInputStream()) {
			String ext = StringUtils.substringAfterLast(originalName, ".").toLowerCase(java.util.Locale.ROOT);
			String format = ext.equals("jpg") ? "jpeg" : ext;
			if (!Arrays.asList("jpeg", "png", "gif", "bmp", "wbmp").contains(format)) {
				throw new ErrorCodeException(FileUploadError);
			}
			// 先用 reader 校验尺寸，避免解码图片炸弹；顺序必须在缩放之前，不能削弱
			assertImageDimensions(uploadFile, format);
			if ("gif".equals(format)) {
				// GIF 可能带动画，保留原文件；尺寸/解码校验已经挡住伪造图片
				return uploadFile;
			}
			long originalBytes = uploadFile.getSize();
			BufferedImage image = ImageIO.read(inputStream);
			if (image == null) {
				throw new ErrorCodeException(FileUploadError);
			}
			int originalWidth = image.getWidth();
			int originalHeight = image.getHeight();
			int maxImageWidth = storageProperties.getMaxImageWidth();
			if (maxImageWidth > 0 && originalWidth > maxImageWidth) {
				// 只缩超宽的图：签名画布 1280、手机竖拍 1080 宽都不动，4K 截图才真正变小
				image = scaleToWidth(image, maxImageWidth);
			}
			// 格式策略：png 保持 png（截图/签名常带透明或大片纯色，转 JPEG 会出噪点），
			// bmp/wbmp 是无压缩格式、原样落盘太大，统一转 png；jpeg 按配置质量重编码
			String targetFormat = "jpeg".equals(format) ? "jpeg" : "png";
			ByteArrayOutputStream output = new ByteArrayOutputStream();
			if (!writeImage(image, targetFormat, output)) {
				throw new ErrorCodeException(FileUploadError);
			}
			byte[] compressed = output.toByteArray();
			log.debug("图片压缩：{} {}x{}/{} → {}x{}/{}", originalName, originalWidth, originalHeight, originalBytes,
					image.getWidth(), image.getHeight(), compressed.length);
			return new ByteArrayMultipartFile(uploadFile.getName(), originalName, uploadFile.getContentType(),
					compressed);
		}
		catch (IOException e) {
			throw new ErrorCodeException(FileUploadError);
		}
	}

	/**
	 * 等比缩放到指定宽度，高度按比例四舍五入（至少 1 像素）。
	 *
	 * <p>用 {@link Graphics2D} 一次性绘制，而不是 {@code getScaledInstance}：后者每次都要先
	 * 建一个异步的图片生产者，质量差、速度慢，缩完往往还要再复制一次。这里只走一次双线性插值，
	 * 并且按原图是否有 alpha 通道选目标类型，手写签名/截图的透明背景不会丢。
	 * @param source 原图
	 * @param targetWidth 目标宽度，单位像素
	 * @return 缩放后的新图（原图不改）
	 */
	private BufferedImage scaleToWidth(BufferedImage source, int targetWidth) {
		int sourceWidth = source.getWidth();
		int sourceHeight = source.getHeight();
		int targetHeight = Math.max(1, (int) Math.round(sourceHeight * (double) targetWidth / sourceWidth));
		int imageType = source.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
		BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, imageType);
		Graphics2D graphics = scaled.createGraphics();
		try {
			graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
		}
		finally {
			graphics.dispose();
		}
		return scaled;
	}

	/**
	 * 按目标格式重新编码图片：jpeg 走 {@link ImageWriter} 的显式质量参数，png 交给
	 * {@link ImageIO} 默认的无损压缩（透明通道保留）。
	 * @return false 表示当前 JDK 没有该格式的 writer
	 */
	private boolean writeImage(BufferedImage image, String format, ByteArrayOutputStream output) {
		if (!"jpeg".equals(format)) {
			try {
				return ImageIO.write(image, format, output);
			}
			catch (IOException e) {
				throw new ErrorCodeException(FileUploadError);
			}
		}
		// JPEG 不认 alpha 通道，直接写会抛 Bogus input colorspace，先铺一层白底
		BufferedImage opaque = image.getColorModel().hasAlpha() ? flattenAlpha(image) : image;
		ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
		ImageWriteParam param = writer.getDefaultWriteParam();
		if (param.canWriteCompressed()) {
			param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
			param.setCompressionQuality(imageQuality());
		}
		try (ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
			writer.setOutput(imageOutput);
			writer.write(null, new IIOImage(opaque, null, null), param);
			return true;
		}
		catch (IOException e) {
			throw new ErrorCodeException(FileUploadError);
		}
		finally {
			writer.dispose();
		}
	}

	/** 把带透明通道的图画到白底 RGB 画布上（JPEG 没有透明概念，透明区变白而不是变黑）。 */
	private BufferedImage flattenAlpha(BufferedImage source) {
		BufferedImage flattened = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
		Graphics2D graphics = flattened.createGraphics();
		try {
			graphics.setColor(java.awt.Color.WHITE);
			graphics.fillRect(0, 0, source.getWidth(), source.getHeight());
			graphics.drawImage(source, 0, 0, null);
		}
		finally {
			graphics.dispose();
		}
		return flattened;
	}

	/** 读取配置里的 JPEG 质量，写错（<=0 或 >1）时回落到默认值，别让一张图因为配置问题传不上去。 */
	private float imageQuality() {
		float quality = storageProperties.getImageQuality();
		return quality > 0f && quality <= 1f ? quality : DEFAULT_IMAGE_QUALITY;
	}

	private void assertImageDimensions(MultipartFile uploadFile) {
		assertImageDimensions(uploadFile, null);
	}

	private void assertImageDimensions(MultipartFile uploadFile, String expectedFormat) {
		try (InputStream inputStream = uploadFile.getInputStream();
				ImageInputStream imageInputStream = ImageIO.createImageInputStream(inputStream)) {
			if (imageInputStream == null) {
				throw new ErrorCodeException(FileUploadError);
			}
			Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInputStream);
			if (!readers.hasNext()) {
				throw new ErrorCodeException(FileUploadError);
			}
			ImageReader reader = readers.next();
			try {
				if (expectedFormat != null
						&& !reader.getFormatName().equalsIgnoreCase(expectedFormat)) {
					throw new ErrorCodeException(FileUploadError);
				}
				reader.setInput(imageInputStream, true, true);
				long pixels = Math.multiplyExact((long) reader.getWidth(0), (long) reader.getHeight(0));
				if (pixels <= 0 || pixels > storageProperties.getMaxImagePixels()) {
					throw new ErrorCodeException(FileUploadError);
				}
			}
			finally {
				reader.dispose();
			}
		}
		catch (ArithmeticException | IOException e) {
			throw new ErrorCodeException(FileUploadError);
		}
	}

	@Override
	public List<FileView> listFiles(FileQuery query) {
		List<File> files = list(
				Wrappers.<File>lambdaQuery().eq(query.getType() != null, File::getStorageType, query.getType())
						// 默认只能查询自己的
						.eq(CollectionUtils.isEmpty(query.getIds()), File::getCreateBy,
								SecurityContextUtils.getUserId())
						// 可以根据 ids 查询已知文件
						.in(!CollectionUtils.isEmpty(query.getIds()), File::getId, query.getIds()));
		if (StringUtils.isNotBlank(query.getProjectId())) {
			files.removeIf(file -> StringUtils.isNotBlank(file.getProjectId())
					&& !query.getProjectId().equals(file.getProjectId()));
		}
		if (StringUtils.isNotBlank(query.getQuestionId())) {
			files.removeIf(file -> StringUtils.isNotBlank(file.getQuestionId())
					&& !query.getQuestionId().equals(file.getQuestionId()));
		}
		Map<String, File> filesById = files.stream()
				.collect(java.util.stream.Collectors.toMap(File::getId, file -> file));
		List<FileView> result = fileViewMapper.toView(files);
		result.forEach(view -> {
			File file = filesById.get(view.getId());
			view.setQuestionId(
					StringUtils.isNotBlank(file.getQuestionId()) ? file.getQuestionId() : query.getQuestionId());
		});
		return result;
	}

	@Override
	@CacheEvict(cacheNames = "fileCache", allEntries = true)
	public void validateAndBindAnswerFiles(String projectId, String answerId, SurveySchema survey,
			LinkedHashMap<String, Object> answer, LinkedHashMap<String, Object> previousAnswer) {
		if (survey == null || answer == null || StringUtils.isBlank(projectId) || StringUtils.isBlank(answerId)) {
			return;
		}
		SchemaHelper.flatSurveySchema(survey).stream()
				.filter(schema -> SurveySchema.QuestionType.Upload.equals(schema.getType())
						|| SurveySchema.QuestionType.Signature.equals(schema.getType()))
				.forEach(schema -> validateAndBindQuestionFiles(projectId, answerId, schema, answer, previousAnswer));
	}

	private void validateAndBindQuestionFiles(String projectId, String answerId, SurveySchema schema,
			LinkedHashMap<String, Object> answer, LinkedHashMap<String, Object> previousAnswer) {
		List<String> fileIds = extractFileIds(answer.get(schema.getId()));
		if (fileIds.isEmpty()) {
			return;
		}
		int maxFileCount = Optional.ofNullable(getUploadAttribute(schema).getMaxFileCount()).filter(count -> count > 0)
				.orElse(DEFAULT_MAX_FILE_COUNT);
		if (fileIds.size() > maxFileCount) {
			throw new ErrorCodeException(ErrorCode.FileReferenceInvalid);
		}
		Set<String> distinctIds = new LinkedHashSet<>(fileIds);
		List<File> files = listByIds(distinctIds);
		if (files.size() != distinctIds.size()) {
			throw new ErrorCodeException(ErrorCode.FileReferenceInvalid);
		}
		Set<String> previousIds = new HashSet<>(
				extractFileIds(previousAnswer == null ? null : previousAnswer.get(schema.getId())));
		for (File file : files) {
			boolean currentContext = projectId.equals(file.getProjectId())
					&& schema.getId().equals(file.getQuestionId());
			boolean migratableLegacyFile = StringUtils.isBlank(file.getProjectId())
					&& StringUtils.isBlank(file.getQuestionId()) && previousIds.contains(file.getId());
			if ((!currentContext && !migratableLegacyFile)
					|| !Objects.equals(file.getStorageType(), StorageTypeEnum.ANSWER_ATTACHMENT.getType())
					|| (StringUtils.isNotBlank(file.getAnswerId()) && !answerId.equals(file.getAnswerId()))) {
				throw new ErrorCodeException(ErrorCode.FileReferenceInvalid);
			}
			File update = new File().setProjectId(projectId).setQuestionId(schema.getId()).setAnswerId(answerId);
			boolean updated = update(update, Wrappers.<File>lambdaUpdate().eq(File::getId, file.getId())
					.and(wrapper -> wrapper.isNull(File::getAnswerId).or().eq(File::getAnswerId, answerId)));
			if (!updated) {
				throw new ErrorCodeException(ErrorCode.FileReferenceInvalid);
			}
		}
	}

	private List<String> extractFileIds(Object questionValue) {
		if (!(questionValue instanceof Map)) {
			return Collections.emptyList();
		}
		List<String> result = new ArrayList<>();
		((Map<?, ?>) questionValue).values().forEach(value -> {
			if (value instanceof Collection) {
				((Collection<?>) value).stream().filter(Objects::nonNull).map(Object::toString).forEach(result::add);
			}
			else if (value != null) {
				result.add(value.toString());
			}
		});
		return result;
	}

	@Override
	@SneakyThrows
	public ResponseEntity<Resource> loadFile(FileQuery query) {
		File file = getFileByQuery(query);
		return buildFileResponse(query, file);
	}

	@Override
	@SneakyThrows
	public ResponseEntity<Resource> loadPublicFile(FileQuery query) {
		File file = getFileByQuery(query);
		if (!Objects.equals(file.getShared(), 1) && !isAnswerAttachment(file)) {
			throw new AccessDeniedException("无权限访问该文件");
		}
		return buildFileResponse(query, file);
	}

	/**
	 * 答卷附件（手写签名、上传题图片）回看：这类文件是 {@code shared=0}，但答题人必须能看到原图——
	 * 答题页刷新、成绩单解析、老师批改都要显示，原来一刀切 403 会让签名「提交完就看不见」。
	 *
	 * <p>放开范围刻意收得很窄：**只有 {@code ANSWER_ATTACHMENT} 类型且已绑定 projectId** 的才放行。
	 * fileId 是服务端生成的 UUID，不可枚举；答卷 JSON 本身还有归属校验（成绩单走
	 * {@code AnswerLookup}），所以泄露面仅限于「主动把文件 URL 发给别人」。
	 *
	 * <p>要更强的隔离时，把这里换成一次性签名 URL（给 fileId + 过期时间 + HMAC），
	 * 届时 {@code /api/public/preview/{id}} 仍然只服务 shared=1 的文件。
	 */
	private boolean isAnswerAttachment(File file) {
		return Objects.equals(file.getStorageType(), StorageTypeEnum.ANSWER_ATTACHMENT.getType())
				&& StringUtils.isNotBlank(file.getProjectId());
	}

	@Override
	@SneakyThrows
	public ResponseEntity<Resource> loadUserFile(FileQuery query) {
		File file = getFileByQuery(query);
		assertReadableFile(file);
		return buildFileResponse(query, file);
	}

	private File getFileByQuery(FileQuery query) {
		if (query == null || StringUtils.isBlank(query.getId())) {
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		String fileId = query.getId();
		if (fileId.contains("@")) {
			fileId = fileId.substring(0, fileId.lastIndexOf("@"));
		}
		File file = getById(fileId);
		if (file == null) {
			log.error("未找到对应的文件 {}", fileId);
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		return file;
	}

	private void assertCurrentUserOwnsFile(File file) {
		if (Objects.equals(file.getCreateBy(), SecurityContextUtils.getUserId())) {
			return;
		}
		throw new AccessDeniedException("无权限删除该文件");
	}

	private void assertReadableFile(File file) {
		if (Objects.equals(file.getCreateBy(), SecurityContextUtils.getUserId())
				|| Objects.equals(file.getShared(), 1)) {
			return;
		}
		throw new AccessDeniedException("无权限访问该文件");
	}

	private ResponseEntity<Resource> buildFileResponse(FileQuery query, File file) {
		Optional<MediaType> mediaType = MediaTypeFactory.getMediaType(file.getOriginalName());
		HttpHeaders headers = new HttpHeaders();
		if (query.getHeaders() != null) {
			headers.putAll(query.getHeaders());
		}
		headers.add("X-Content-Type-Options", "nosniff");
		boolean safeInline = query.getDispositionType() == AppConsts.DispositionTypeEnum.inline && isSafeInline(file);
		if (safeInline && isSupportImage(file.getOriginalName())) {
			// 图片响应再补一层 CSP；PDF/下载文件不加 sandbox，避免影响内置阅读器
			headers.add("Content-Security-Policy", "default-src 'none'; sandbox");
		}
		MediaType responseMediaType = safeInline ? mediaType.orElse(MediaType.APPLICATION_OCTET_STREAM)
				: MediaType.APPLICATION_OCTET_STREAM;
		String contentDisposition = safeInline ? AppConsts.DispositionTypeEnum.inline.name()
				: HTTPUtils.getContentDispositionValue(file.getOriginalName());
		String filePath = query.getId().contains("@") ? file.getThumbFilePath() : file.getFilePath();
		if (StringUtils.isBlank(filePath)) {
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		// FIXME: 在线预览 mp4 文件会报错，但不影响使用
		return ResponseEntity.ok().contentType(responseMediaType).headers(headers)
				.header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
				.body(new InputStreamResource(storageService.downloadAsStream(filePath)));
	}

	private boolean isSafeInline(File file) {
		String extName = StringUtils.substringAfterLast(file.getOriginalName(), ".");
		return StringUtils.isNotBlank(extName) && SAFE_INLINE_EXTENSIONS.contains(extName.toLowerCase(Locale.ROOT));
	}

	/**
	 * 导入模板白名单：请求里的 name → classpath {@code template/} 下的真实文件名（不带 .xlsx）。
	 *
	 * <p>前端只传固定常量；这里用白名单而不是「name 拼路径」，既修正历史别名
	 * （{@code 用户导入模板} 实际资源叫 {@code 旭日云课堂用户导入模板.xlsx}），也避免任意串
	 * 拼进 classpath 造成路径穿越 / 资源探测。
	 */
	private static final Map<String, String> TEMPLATE_WHITELIST = buildTemplateWhitelist();

	private static Map<String, String> buildTemplateWhitelist() {
		Map<String, String> templates = new LinkedHashMap<>();
		templates.put("用户导入模板", "旭日云课堂用户导入模板.xlsx");
		templates.put("学员导入模板", "学员导入模板.xlsx");
		templates.put("题库导入模板", "旭日云课堂题库导入模板.xlsx");
		templates.put("字典导入模板", "字典导入模板.xlsx");
		templates.put("白名单导入模板", "白名单导入模板.xlsx");
		templates.put("试卷导入模板", "旭日云课堂试卷导入模板.docx");
		return Collections.unmodifiableMap(templates);
	}

	@Override
	public ResponseEntity<Resource> downloadTemplate(String name) {
		// name 只用于白名单查表，绝不拼进 classpath 路径
		String templateName = StringUtils.isBlank(name) ? null : TEMPLATE_WHITELIST.get(name.trim());
		if (StringUtils.isBlank(templateName)) {
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		String location = "template/" + templateName;
		ClassPathResource resource = new ClassPathResource(location);
		if (!resource.exists()) {
			// 直接返回不存在的 Resource 会在消息转换阶段抛 IOException，最终变成 500；这里按 404 处理
			log.warn("导入模板不存在: {}", location);
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		String downloadName = templateName;
		MediaType mediaType = templateName.toLowerCase(java.util.Locale.ROOT).endsWith(".docx")
				? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
				: MediaType.parseMediaType("application/vnd.ms-excel");
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue(downloadName))
				.contentType(mediaType).body(resource);
	}

	private static final class UploadRateWindow {

		private long windowStart;

		private int count;

		private UploadRateWindow(long windowStart) {
			this.windowStart = windowStart;
		}

		private synchronized boolean tryAcquire(int limit, long now) {
			if (isExpired(now)) {
				windowStart = now;
				count = 0;
			}
			if (count >= limit) {
				return false;
			}
			count++;
			return true;
		}

		private synchronized boolean isExpired(long now) {
			return now - windowStart >= 60000;
		}

	}

	/** 重新编码后的图片：只带安全字节，不带原文件名之外的元数据。 */
	private static final class ByteArrayMultipartFile implements MultipartFile {

		private final String name;

		private final String originalFilename;

		private final String contentType;

		private final byte[] content;

		private ByteArrayMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
			this.name = name;
			this.originalFilename = originalFilename;
			this.contentType = contentType;
			this.content = content == null ? new byte[0] : content;
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
			return content.length == 0;
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
		public void transferTo(java.io.File dest) throws IOException, IllegalStateException {
			try (FileOutputStream output = new FileOutputStream(dest)) {
				output.write(content);
			}
		}

	}

}
