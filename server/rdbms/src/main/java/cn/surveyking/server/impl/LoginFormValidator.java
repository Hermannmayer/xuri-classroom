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

/**
 * 答卷前的登录 / 密码 / 白名单校验表单。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第五块。它负责判断「要不要先弹验证表单」、校验账号密码、
 * 下发 token cookie，以及把白名单参与人置为已访问；密码通过标记交给 {@link AnswerLimitGuard}。
 */
@Component
@Transactional
@RequiredArgsConstructor
public class LoginFormValidator {

	private final ProjectPartnerMapper projectPartnerMapper;

	private final AuthenticationManager authenticationManager;

	private final JwtTokenUtil jwtTokenUtil;

	/** 密码通过后的短期 cookie 由限次组件统一维护 */
	private final AnswerLimitGuard answerLimitGuard;

	/**
	 * 如果问卷需要登录、需要密码答卷、需要白名单答卷进入问卷之前需要弹出验证表单
	 * @param project 当前项目
	 * @param answer 查询表单的答案
	 * @return 返回查询表单的 schema，如果未空，则会直接进入到答卷页面
	 */
	public SurveySchema convertAndValidateLoginFormIfNeeded(ProjectView project,
			LinkedHashMap<String, Object> answer) {
		boolean loginRequired = false;
		// 需要更新答题者为已访问的状态
		boolean updatePartnerVisited = false;
		LambdaQueryWrapper<ProjectPartner> projectPartnerQuery = Wrappers.<ProjectPartner>lambdaQuery()
				.eq(ProjectPartner::getProjectId, project.getId());
		Authentication authentication = null;
		List<SurveySchema> queryConditions = new ArrayList<>();
		SurveySchema loginFormSchema = SurveySchema.builder().id(project.getId()).children(queryConditions)
				.title(project.getName()).build();
		// 错题练习模式需要登录
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
			// 需要登录答卷
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
			// 需要密码答卷
			if (answerSetting.getPassword() != null) {
				loginRequired = true;
				queryConditions
						.add(SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.extraPassword));

				if (answer != null) {
					if (!answerSetting.getPassword().equals(
							SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.extraPassword))) {
						throw new ErrorCodeException(ErrorCode.ValidationError);
					}
					// 密码校验通过：下发一个短期 cookie，作为「本次会话已通过密码」的凭据。
					// 否则直接 POST saveAnswer 就能绕开密码（提交路径不携带密码字段）。
					answerLimitGuard.markPasswordPassed(project.getId(), answerSetting.getPassword());
				}
			}
			// 白名单为系统用户
			if (answerSetting.getWhitelistType() != null
					&& ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType() == answerSetting.getWhitelistType()) {
				// 如果当前已登录且当前用户不在白名单内，则报错
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
					// 需要执行登录操作
					SchemaHelper.appendChildIfNotExist(loginFormSchema,
							SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
					SchemaHelper.appendChildIfNotExist(loginFormSchema,
							SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));
					loginRequired = true;

					if (answer != null) {
						if (authentication == null) {
							authentication = validateUsernameAndPassword(answer);
						}
						// 执行登录操作
						UserInfo user = (UserInfo) authentication.getPrincipal();
						// 判断登录用户是否在白名单里面
						/**
						 * todo 这里应该加上用户类型，否则会出查询出来多条 多条原因： 新创建的问卷的时候，默认的插入一条名单数据，type = 1
						 * 修改答题白名单设置为系统用户时，又插入一条，type = 3 修改答题白名单设置为外部用户时，又插入一条，type =
						 * 4，当然这条数据没有用户id，在这里不会被查出来
						 * 综上，这里至少会查询出2条，所以需要加入用户类型限制，或者修改答题白名单时移除旧数据
						 * 这里验证的是"白名单为系统用户"，所以type = 3
						 */
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
			// 白名单为导入用户
			if (answerSetting.getWhitelistType() != null
					&& ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == answerSetting.getWhitelistType()) {
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.whitelistName));
				loginRequired = true;

				if (answer != null) {
					// 校验登录白名单名称是否在白名单列表里面
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
			// 执行登录操作，方便后续保存答案的时候获取认证信息
			UserInfo user = (UserInfo) authentication.getPrincipal();
			HttpCookie cookie = ResponseCookie
					.from(AppConsts.TOKEN_NAME, jwtTokenUtil.generateAccessToken(new UserTokenView(user.getUserId())))
					.path("/").httpOnly(true).build();
			ContextHelper.getCurrentHttpResponse().setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
		}

		// 更新问卷状态为已访问
		if (updatePartnerVisited) {
			ProjectPartner projectPartner = projectPartnerMapper.selectOne(projectPartnerQuery);
			if (projectPartner != null && projectPartner.getStatus() == AppConsts.ProjectPartnerStatus.UNVISITED) {
				projectPartner.setStatus(AppConsts.ProjectPartnerStatus.VISITED);
				projectPartnerMapper.updateById(projectPartner);
			}
			// 如果配置的外部用户，则 createBy 为 partner 的 id，如果是内部用户则是用户 id
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

	/**
	 * 答卷前登录校验用户名和密码
	 * @param answer
	 * @return
	 */
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
