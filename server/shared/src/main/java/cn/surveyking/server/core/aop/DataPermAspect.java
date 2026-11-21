package cn.surveyking.server.core.aop;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.service.ProjectPartnerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;







@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class DataPermAspect {

	private final ProjectPartnerService projectPartnerService;

	private SpelExpressionParser spelParser = new SpelExpressionParser();

	@Pointcut("@annotation(dataPerm)")
	public void checkPermissionPointCut(EnableDataPerm dataPerm) {
	}

	@Before("checkPermissionPointCut(dataPerm)")
	public void around(JoinPoint joinPoint, EnableDataPerm dataPerm) throws Throwable {

		if (SecurityContextUtils.isAdmin()) {
			return;
		}

		MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
		List<String> paramNameList = Arrays.asList(methodSignature.getParameterNames());
		List<Object> paramList = Arrays.asList(joinPoint.getArgs());

		EvaluationContext ctx = new StandardEvaluationContext();
		for (int i = 0; i < paramNameList.size(); i++) {
			ctx.setVariable(paramNameList.get(i), paramList.get(i));
		}
		String value = spelParser.parseExpression(dataPerm.key()).getValue(ctx).toString();
		if (!StringUtils.hasText(value)) {
			throw new org.springframework.security.access.AccessDeniedException("未找到对应的问卷");
		}

		if (!projectPartnerService.hasProjectAccess(value)) {
			throw new org.springframework.security.access.AccessDeniedException("没有权限访问本问卷");
		}
	}

}
