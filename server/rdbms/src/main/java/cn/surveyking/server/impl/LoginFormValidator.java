package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.security.JwtTokenUtil;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.dto.UserTokenView;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;








@Component
@Transactional
@RequiredArgsConstructor
public class LoginFormValidator {

	private final ProjectPartnerMapper projectPartnerMapper;

	private final AuthenticationManager authenticationManager;

	private final JwtTokenUtil jwtTokenUtil;


	private final AnswerLimitGuard answerLimitGuard;

	/** 如果问卷需要登录、需要密码答卷、需要白名单答卷进入问卷之前需要弹出验证表单；返回 查询表单的 schema，如果未空，则会直接进入到答卷页面 */
	public SurveySchema convertAndValidateLoginFormIfNeeded(ProjectView project,
			LinkedHashMap<String, Object> answer) {
		boolean loginRequired = false;

		boolean updatePartnerVisited = false;
		LambdaQueryWrapper<ProjectPartner> projectPartnerQuery = Wrappers.<ProjectPartner>lambdaQuery()
				.eq(ProjectPartner::getProjectId, project.getId());
		Authentication authentication = null;
		List<SurveySchema> queryConditions = new ArrayList<>();
		SurveySchema loginFormSchema = SurveySchema.builder().id(project.getId()).children(queryConditions)
				.title(project.getName()).build();

		if (project != null && project.getSetting() != null && project.getSetting().getExamSetting() != null) {
			ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
			if (Boolean.TRUE.equals(examSetting.getRandomSurveyWrong()) && !SecurityContextUtils.isAuthenticated()) {
				loginRequired = true;
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));

				if (answer != null) {
					authentication = validateUsernameAndPassword(answer);
				}
			}
		}
		if (project != null && project.getSetting() != null && project.getSetting().getAnswerSetting() != null) {
			ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();

			if (Boolean.TRUE.equals(answerSetting.getLoginRequired()) && !SecurityContextUtils.isAuthenticated()) {
				loginRequired = true;
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));

				if (answer != null) {
					authentication = validateUsernameAndPassword(answer);
				}
			}

			if (answerSetting.getPassword() != null) {
				loginRequired = true;
				queryConditions
						.add(SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.extraPassword));

				if (answer != null) {
					if (!answerSetting.getPassword().equals(
							SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.extraPassword))) {
						throw new ErrorCodeException(ErrorCode.ValidationError);
					}


					answerLimitGuard.markPasswordPassed(project.getId(), answerSetting.getPassword());
				}
			}

			if (answerSetting.getWhitelistType() != null
					&& ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType() == answerSetting.getWhitelistType()) {

				if (SecurityContextUtils.isAuthenticated()) {
					boolean currentHasPerm = projectPartnerMapper.selectCount(
							Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, project.getId())
									.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType())
									.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())) == 1;
					if (!currentHasPerm) {
						throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
					}
					updatePartnerVisited = true;
					projectPartnerQuery.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())
							.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
				}
				else {

					SchemaHelper.appendChildIfNotExist(loginFormSchema,
							SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
					SchemaHelper.appendChildIfNotExist(loginFormSchema,
							SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));
					loginRequired = true;

					if (answer != null) {
						if (authentication == null) {
							authentication = validateUsernameAndPassword(answer);
						}

						UserInfo user = (UserInfo) authentication.getPrincipal();








						boolean currentHasPerm = projectPartnerMapper.selectCount(
								Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, project.getId())
										.eq(ProjectPartner::getType,
												ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType())
										.eq(ProjectPartner::getUserId, user.getUserId())) == 1;
						if (!currentHasPerm) {
							throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
						}

						updatePartnerVisited = true;
						projectPartnerQuery.eq(ProjectPartner::getUserId, user.getUserId()).eq(ProjectPartner::getType,
								ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
					}
				}
			}

			if (answerSetting.getWhitelistType() != null
					&& ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == answerSetting.getWhitelistType()) {
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.whitelistName));
				loginRequired = true;

				if (answer != null) {

					String whitelistName = (String) SchemaHelper.getLoginFormAnswer(answer,
							SchemaHelper.LoginFormFieldEnum.whitelistName);
					if (whitelistName == null) {
						throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
					}
					boolean currentHasPerm = projectPartnerMapper.selectCount(
							Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, project.getId())
									.eq(ProjectPartner::getUserName, whitelistName)) == 1;
					if (!currentHasPerm) {
						throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
					}

					updatePartnerVisited = true;
					projectPartnerQuery.eq(ProjectPartner::getUserName, whitelistName).eq(ProjectPartner::getType,
							ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType());
				}
			}

		}

		if (authentication != null) {

			UserInfo user = (UserInfo) authentication.getPrincipal();
			HttpCookie cookie = ResponseCookie
					.from(AppConsts.TOKEN_NAME, jwtTokenUtil.generateAccessToken(new UserTokenView(user.getUserId())))
					.path("/").httpOnly(true).build();
			ContextHelper.getCurrentHttpResponse().setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
		}


		if (updatePartnerVisited) {
			ProjectPartner projectPartner = projectPartnerMapper.selectOne(projectPartnerQuery);
			if (projectPartner != null && projectPartner.getStatus() == AppConsts.ProjectPartnerStatus.UNVISITED) {
				projectPartner.setStatus(AppConsts.ProjectPartnerStatus.VISITED);
				projectPartnerMapper.updateById(projectPartner);
			}

			if (projectPartner.getUserName() != null) {
				ContextHelper.getCurrentHttpRequest().setAttribute("createBy", projectPartner.getId());
			}
			else if (projectPartner.getUserId() != null) {
				ContextHelper.getCurrentHttpRequest().setAttribute("createBy", SecurityContextUtils.getUserId());
			}
		}

		if (loginRequired) {
			return loginFormSchema;
		}

		return null;
	}

	/** 答卷前登录校验用户名和密码 */
	private Authentication validateUsernameAndPassword(LinkedHashMap<String, Object> answer) {
		try {
			Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
					SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.username),
					SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.password)));
			SecurityContextHolder.getContext().setAuthentication(authentication);
			return authentication;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.ValidationError);
		}
	}

}
