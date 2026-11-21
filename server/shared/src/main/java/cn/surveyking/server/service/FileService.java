package cn.surveyking.server.service;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.UploadFileRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;





public interface FileService {

	List<String> SUPPORT_IMAGE_LIST = Arrays.asList(AppConsts.SUPPORT_IMAGE_TYPE);

	FileView upload(UploadFileRequest request);

	List<FileView> listFiles(FileQuery query);

	ResponseEntity<Resource> loadFile(FileQuery query);

	ResponseEntity<Resource> loadPublicFile(FileQuery query);

	ResponseEntity<Resource> loadUserFile(FileQuery query);

	void deleteFile(String id);

	/** 删除项目/题库的全部文件引用；无其他引用时删除物理文件 */
	void deleteByOwner(String ownerType, String ownerId);

	/** 物理删除答卷时清掉它绑定的附件（手写签名、上传题图片） */
	void deleteByAnswers(java.util.Collection<String> answerIds);

	/** 物理删除项目时清掉该项目下的**全部**文件，包括已绑定答卷的附件 */
	void purgeProjectFiles(String projectId);

	/** 系统级删除单个文件：**不做归属校验**，仅供定时清理任务使用 */
	void purgeFile(String fileId);

	/** 保存 schema 时扫描 HTML 中的图片并登记引用 */
	void syncOwnerRefs(String ownerType, String ownerId, String html);

	/** 用完整 HTML 替换 owner 的引用，并删除变成孤儿的物理文件 */
	void replaceOwnerRefs(String ownerType, String ownerId, String html);

	void validateAndBindAnswerFiles(String projectId, String answerId, SurveySchema survey,
			LinkedHashMap<String, Object> answer, LinkedHashMap<String, Object> previousAnswer);

	/** 是否支持该格式的图片上传 */
	default boolean isSupportImage(String fileName) {
		String extType = fileName.substring(fileName.lastIndexOf(".") + 1);
		return SUPPORT_IMAGE_LIST.contains(extType.toUpperCase());
	}

	ResponseEntity<Resource> downloadTemplate(String name);

}
