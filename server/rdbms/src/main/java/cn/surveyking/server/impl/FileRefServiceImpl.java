package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.FileRef;
import cn.surveyking.server.mapper.FileRefMapper;
import cn.surveyking.server.service.FileRefService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class FileRefServiceImpl implements FileRefService {

	private static final Pattern PREVIEW = Pattern.compile("/api/public/preview/([A-Za-z0-9_-]{1,64})");

	private final FileRefMapper fileRefMapper;

	@Override
	public void bind(String fileId, String ownerType, String ownerId, String questionId) {
		if (!StringUtils.hasText(fileId) || !StringUtils.hasText(ownerType) || !StringUtils.hasText(ownerId)) {
			return;
		}
		if (!"project".equals(ownerType) && !"repo".equals(ownerType)) {
			throw new IllegalArgumentException("ownerType 只能是 project 或 repo");
		}
		long exists = fileRefMapper.selectCount(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getFileId, fileId)
				.eq(FileRef::getOwnerType, ownerType).eq(FileRef::getOwnerId, ownerId));
		if (exists > 0) {
			return;
		}
		FileRef ref = new FileRef().setFileId(fileId).setOwnerType(ownerType).setOwnerId(ownerId)
				.setQuestionId(questionId);
		try {
			fileRefMapper.insert(ref);
		}
		catch (DuplicateKeyException ignored) {
			// 并发上传/保存：唯一索引兜底，已有引用即可
		}
	}

	@Override
	public void bindAll(Collection<String> fileIds, String ownerType, String ownerId) {
		if (fileIds == null) {
			return;
		}
		fileIds.stream().filter(StringUtils::hasText).distinct()
				.forEach(fileId -> bind(fileId, ownerType, ownerId, null));
	}

	@Override
	public Set<String> listFileIds(String ownerType, String ownerId) {
		if (!StringUtils.hasText(ownerType) || !StringUtils.hasText(ownerId)) {
			return Collections.emptySet();
		}
		return fileRefMapper
				.selectList(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getOwnerType, ownerType)
						.eq(FileRef::getOwnerId, ownerId))
				.stream().map(FileRef::getFileId).filter(StringUtils::hasText)
				.collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
	}

	@Override
	public Set<String> deleteByOwner(String ownerType, String ownerId) {
		Set<String> fileIds = listFileIds(ownerType, ownerId);
		if (fileIds.isEmpty()) {
			return fileIds;
		}
		fileRefMapper.delete(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getOwnerType, ownerType)
				.eq(FileRef::getOwnerId, ownerId));
		return fileIds;
	}

	@Override
	public void deleteByFile(String fileId) {
		if (StringUtils.hasText(fileId)) {
			fileRefMapper.delete(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getFileId, fileId));
		}
	}

	@Override
	public void syncHtml(String ownerType, String ownerId, String html) {
		if (!StringUtils.hasText(html) || !StringUtils.hasText(ownerType) || !StringUtils.hasText(ownerId)) {
			return;
		}
		Matcher matcher = PREVIEW.matcher(html);
		while (matcher.find()) {
			bind(matcher.group(1), ownerType, ownerId, null);
		}
	}

	@Override
	public Set<String> replaceHtml(String ownerType, String ownerId, String html) {
		Set<String> next = new LinkedHashSet<>();
		if (StringUtils.hasText(html)) {
			Matcher matcher = PREVIEW.matcher(html);
			while (matcher.find()) {
				next.add(matcher.group(1));
			}
		}
		Set<String> existing = listFileIds(ownerType, ownerId);
		Set<String> removed = new LinkedHashSet<>(existing);
		removed.removeAll(next);
		if (removed.isEmpty() && next.size() == existing.size()) {
			return removed;
		}
		if (next.isEmpty()) {
			fileRefMapper.delete(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getOwnerType, ownerType)
					.eq(FileRef::getOwnerId, ownerId));
		}
		else {
			fileRefMapper.delete(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getOwnerType, ownerType)
					.eq(FileRef::getOwnerId, ownerId).notIn(FileRef::getFileId, next));
		}
		next.forEach(fileId -> bind(fileId, ownerType, ownerId, null));
		return removed;
	}

	@Override
	public long countByFile(String fileId) {
		if (!StringUtils.hasText(fileId)) {
			return 0;
		}
		return fileRefMapper.selectCount(Wrappers.<FileRef>lambdaQuery().eq(FileRef::getFileId, fileId));
	}

}
