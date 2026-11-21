package cn.surveyking.server.core.annotation;

import cn.surveyking.server.core.constant.AppConsts;

import java.lang.annotation.*;






@Target({ ElementType.METHOD })
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface EnableDataPerm {

	String key() default "";

	/** 权限类型，根据项目来区分权限 */
	String permType() default AppConsts.PermType.PROJECT;

	/** 默认通过 url 来获取 */
	String permFrom() default "";

}
