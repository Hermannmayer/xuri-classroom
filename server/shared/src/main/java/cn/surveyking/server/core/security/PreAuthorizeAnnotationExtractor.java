package cn.surveyking.server.core.security;

import cn.surveyking.server.core.uitls.ContextHelper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.aop.framework.AopProxyUtils;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.*;







@Slf4j
public class PreAuthorizeAnnotationExtractor {

	private static Set<String> permissions = null;

	/** 提取所有的权限定义 */
	public static Set<String> extractAllApiPermissions() {
		List<Object> controllerList = ContextHelper.getBeansByAnnotation(RestController.class);
		if (permissions == null) {
			permissions = new LinkedHashSet<>();
			extractApiPermissions(controllerList);
		}
		return permissions;
	}

	private static void extractApiPermissions(List<Object> controllerList) {
		for (Object obj : controllerList) {
			Class controllerClass = AopProxyUtils.ultimateTargetClass(obj);
			String title = null;

			String codePrefix = null;

			PreAuthorize bindPermission = AnnotationUtils.findAnnotation(controllerClass, PreAuthorize.class);
			if (bindPermission != null) {

				parseAnnotationValue(bindPermission.value());
			}
			extractAnnotationMethods(controllerClass, PreAuthorize.class).forEach(method -> {
				PreAuthorize methodBindPermission = AnnotationUtils.getAnnotation(method, PreAuthorize.class);
				parseAnnotationValue(methodBindPermission.value());
			});
		}
	}

	/** 如 @PreAuthorize("hasAuthority='answer:list'") */
	private static void parseAnnotationValue(String value) {
		if (StringUtils.isBlank(value) || !StringUtils.contains(value, "hasAuthority")) {
			return;
		}
		String authorityCode = StringUtils.substringBetween(value, "'");
		if (StringUtils.isNotBlank(authorityCode)) {
			String[] authorityHierarchy = authorityCode.split(":");
			String current = authorityHierarchy[0];
			permissions.add(current.trim());
			for (int i = 1; i < authorityHierarchy.length; i++) {
				current = current + ":" + authorityHierarchy[i];
				permissions.add(current);
			}
		}
		else {
			log.warn("检测到权限码未配置 {}", value);
		}
	}

	/** 获取类中所有包含注解的方法（包含父类中） */
	public static List<Method> extractAnnotationMethods(Class<?> clazz, Class<? extends Annotation> annotationClass) {
		List<Method> methodList = new ArrayList<>();
		while (clazz != null) {
			Method[] methods = clazz.getDeclaredMethods();
			if (methods != null) {

				Arrays.stream(methods).forEach((method) -> {
					if (AnnotationUtils.getAnnotation(method, annotationClass) != null) {
						methodList.add(method);
					}
				});
			}
			clazz = clazz.getSuperclass();
		}
		return methodList;
	}

}
