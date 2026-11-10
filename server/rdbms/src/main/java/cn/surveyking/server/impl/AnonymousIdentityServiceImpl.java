package cn.surveyking.server.impl;

import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnonymousSubject;
import cn.surveyking.server.mapper.AnonymousSubjectMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AnonymousIdentityService;
import cn.surveyking.server.service.ClassResourceService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 匿名答题身份实现。
 *
 * <p>cookie 存 32 字节随机 token（Base64Url），库里只存 SHA-256；cookie 无效/过期就重新
 * 生成一个主体。匿名答卷的 create_by 为空，找回和登录认领都靠 anonymous_subject_id。
 *
 * @author surveyking
 */
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

	/** claim 后同一用户在同一项目可能已有作答序号，重新分配避免撞唯一键 */
	private final AnswerAttemptAllocator answerAttemptAllocator;

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
		// 同一项目内连续分配，避免多条匿名答卷认领到同一个用户时撞 attempt_no 唯一键
		Map<String, Integer> nextAttemptByProject = new HashMap<>();
		for (Answer answer : answers) {
			// 认领后按「当前班级 + 班级资源」重算 class_id；没有有效分配就落 NULL
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
		// 答卷走 @TableLogic 的逻辑删除；主体表没有逻辑删除，直接物理删
		answerMapper.delete(Wrappers.<Answer>lambdaQuery().in(Answer::getAnonymousSubjectId, subjectIds)
				.eq(Answer::getIsAnonymous, true));
		anonymousSubjectMapper.deleteBatchIds(subjectIds);
		log.info("清理过期匿名主体: subjects={}", subjectIds.size());
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
