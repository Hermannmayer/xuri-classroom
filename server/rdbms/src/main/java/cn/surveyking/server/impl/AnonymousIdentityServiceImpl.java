package cn.surveyking.server.impl;

import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnonymousSubject;
import cn.surveyking.server.mapper.AnonymousSubjectMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AnonymousIdentityService;
import cn.surveyking.server.service.ClassResourceService;
import cn.surveyking.server.service.FileService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;









@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(rollbackFor = Exception.class)
public class AnonymousIdentityServiceImpl implements AnonymousIdentityService {

	public static final String COOKIE_NAME = "sk-anon";

	private static final int TOKEN_BYTES = 32;

	private static final int TTL_DAYS = 90;

	private static final SecureRandom RANDOM = new SecureRandom();

	private final AnonymousSubjectMapper anonymousSubjectMapper;

	private final AnswerMapper answerMapper;

	private final ClassResourceService classResourceService;


	private final AnswerAttemptAllocator answerAttemptAllocator;


	private final FileService fileService;


	private static final int PURGE_BATCH = 200;


	private static final int MAX_PURGE_ROUNDS = 50;

	@Override
	public String ensureSubject(HttpServletRequest request, HttpServletResponse response) {
		if (request == null || response == null) {
			return null;
		}
		String token = readCookie(request);
		if (StringUtils.hasText(token)) {
			AnonymousSubject existing = findValidSubject(token);
			if (existing != null) {
				touch(existing);
				return existing.getId();
			}
		}
		String newToken = newToken();
		Date now = new Date();
		AnonymousSubject subject = new AnonymousSubject();
		subject.setId(UUID.randomUUID().toString());
		subject.setTokenHash(hashToken(newToken));
		subject.setCreateAt(now);
		subject.setLastSeenAt(now);
		subject.setExpiresAt(new Date(now.getTime() + Duration.ofDays(TTL_DAYS).toMillis()));
		anonymousSubjectMapper.insert(subject);
		writeCookie(newToken, request, response);
		return subject.getId();
	}

	@Override
	public String currentSubjectId() {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
		if (request == null) {
			return null;
		}
		String token = readCookie(request);
		if (!StringUtils.hasText(token)) {
			return null;
		}
		AnonymousSubject subject = findValidSubject(token);
		if (subject == null) {
			return null;
		}
		touch(subject);
		return subject.getId();
	}

	@Override
	public int claim(String userId) {
		if (!StringUtils.hasText(userId)) {
			return 0;
		}
		String subjectId = currentSubjectId();
		if (!StringUtils.hasText(subjectId)) {
			return 0;
		}
		List<Answer> answers = answerMapper.selectList(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getProjectId, Answer::getAnonymousSubjectId)
				.eq(Answer::getAnonymousSubjectId, subjectId).eq(Answer::getIsAnonymous, true));
		if (answers == null || answers.isEmpty()) {
			return 0;
		}
		int claimed = 0;

		Map<String, Integer> nextAttemptByProject = new HashMap<>();
		for (Answer answer : answers) {

			String classId = classResourceService.resolveForStudent(answer.getProjectId(), userId);
			int attemptNo = nextAttemptByProject.computeIfAbsent(answer.getProjectId(),
					projectId -> answerAttemptAllocator.next(projectId, userId));
			nextAttemptByProject.put(answer.getProjectId(), attemptNo + 1);
			int rows = answerMapper.update(null, Wrappers.<Answer>lambdaUpdate().eq(Answer::getId, answer.getId())
					.set(Answer::getCreateBy, userId).set(Answer::getIsAnonymous, false)
					.set(Answer::getAnonymousSubjectId, null).set(Answer::getClassId, classId)
					.set(Answer::getAttemptNo, attemptNo));
			if (rows > 0) {
				claimed++;
			}
		}
		log.info("匿名答卷认领完成: subjectId={}, userId={}, claimed={}", subjectId, userId, claimed);
		return claimed;
	}

	@Override
	public void purgeExpired() {
		List<AnonymousSubject> expired = anonymousSubjectMapper
				.selectList(Wrappers.<AnonymousSubject>lambdaQuery().lt(AnonymousSubject::getExpiresAt, new Date()));
		if (expired == null || expired.isEmpty()) {
			return;
		}
		List<String> subjectIds = new ArrayList<>();
		for (AnonymousSubject subject : expired) {
			if (subject != null && StringUtils.hasText(subject.getId())) {
				subjectIds.add(subject.getId());
			}
		}
		if (subjectIds.isEmpty()) {
			return;
		}

		answerMapper.delete(Wrappers.<Answer>lambdaQuery().in(Answer::getAnonymousSubjectId, subjectIds)
				.eq(Answer::getIsAnonymous, true));
		anonymousSubjectMapper.deleteBatchIds(subjectIds);
		log.info("清理过期匿名主体: subjects={}", subjectIds.size());
	}

	@Override
	public int purgeOlderThan(int retentionDays) {
		int days = Math.max(1, retentionDays);
		Date cutoff = new Date(System.currentTimeMillis() - Duration.ofDays(days).toMillis());

		List<Answer> expired = answerMapper.selectList(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getAnonymousSubjectId).eq(Answer::getIsAnonymous, true)
				.lt(Answer::getCreateAt, cutoff));
		if (expired == null || expired.isEmpty()) {
			return 0;
		}
		Set<String> subjectIds = new LinkedHashSet<>();
		for (Answer answer : expired) {
			if (answer != null && StringUtils.hasText(answer.getAnonymousSubjectId())) {
				subjectIds.add(answer.getAnonymousSubjectId());
			}
		}

		int deleted = answerMapper.delete(Wrappers.<Answer>lambdaQuery().eq(Answer::getIsAnonymous, true)
				.lt(Answer::getCreateAt, cutoff));

		int removedSubjects = 0;
		for (String subjectId : subjectIds) {
			long remaining = answerMapper.selectCount(Wrappers.<Answer>lambdaQuery()
					.eq(Answer::getAnonymousSubjectId, subjectId).eq(Answer::getIsAnonymous, true));
			if (remaining == 0) {
				anonymousSubjectMapper.deleteById(subjectId);
				removedSubjects++;
			}
		}
		log.info("清理过期匿名答卷: retentionDays={}, deleted={}, subjects={}", days, deleted, removedSubjects);
		return deleted;
	}

	@Override
	public int purgeDeletedOlderThan(int delayDays) {
		int days = Math.max(1, delayDays);
		Date cutoff = new Date(System.currentTimeMillis() - Duration.ofDays(days).toMillis());
		int total = 0;

		for (int round = 0; round < MAX_PURGE_ROUNDS; round += 1) {
			List<String> ids = answerMapper.selectPurgeableAnonymousIds(cutoff, PURGE_BATCH);
			if (ids == null || ids.isEmpty()) {
				break;
			}
			int deleted = answerMapper.physicalDeleteByIds(ids);
			total += deleted;



			final List<String> purgedIds = ids;
			runAfterCommit(() -> fileService.deleteByAnswers(purgedIds));
			if (deleted < ids.size()) {

				break;
			}
		}
		if (total > 0) {
			log.info("物理清理已删除的匿名答卷: delayDays={}, purged={}", days, total);
		}
		return total;
	}

	/** 事务提交后再执行（无事务时立即执行）。用于物理文件删除这类不可回滚的副作用。 */
	private static void runAfterCommit(Runnable action) {
		if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
			org.springframework.transaction.support.TransactionSynchronizationManager
					.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
						@Override
						public void afterCommit() {
							action.run();
						}
					});
		}
		else {
			action.run();
		}
	}

	private AnonymousSubject findValidSubject(String token) {
		AnonymousSubject subject = anonymousSubjectMapper
				.selectOne(Wrappers.<AnonymousSubject>lambdaQuery().eq(AnonymousSubject::getTokenHash, hashToken(token)));
		if (subject == null || subject.getExpiresAt() == null || subject.getExpiresAt().before(new Date())) {
			return null;
		}
		return subject;
	}

	private void touch(AnonymousSubject subject) {
		subject.setLastSeenAt(new Date());
		anonymousSubjectMapper.updateById(subject);
	}

	private String readCookie(HttpServletRequest request) {
		Cookie cookie = WebUtils.getCookie(request, COOKIE_NAME);
		return cookie == null ? null : cookie.getValue();
	}

	private void writeCookie(String token, HttpServletRequest request, HttpServletResponse response) {
		ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, token).httpOnly(true).secure(request.isSecure())
				.sameSite("Lax").path("/").maxAge(Duration.ofDays(TTL_DAYS)).build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	private String newToken() {
		byte[] bytes = new byte[TOKEN_BYTES];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hashToken(String token) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
			StringBuilder hex = new StringBuilder(hash.length * 2);
			for (byte b : hash) {
				hex.append(Character.forDigit((b >> 4) & 0xF, 16));
				hex.append(Character.forDigit(b & 0xF, 16));
			}
			return hex.toString();
		}
		catch (Exception e) {
			throw new IllegalStateException("无法计算匿名 token 的哈希", e);
		}
	}

}
