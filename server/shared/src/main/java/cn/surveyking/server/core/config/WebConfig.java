package cn.surveyking.server.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * @author javahuang
 * @date 2021/8/11
 *
 * <p>
 * 这里原先 {@code configureMessageConverters} 里塞了一个 Jackson 转换器，目的是「允许 controller
 * 直接返回 string」。但 Spring MVC 的规则是：只要该方法往列表里加了东西，默认转换器链就**不再注册**，
 * 等于全站只剩一个 JSON 转换器（Resource / 表单 / 文本都靠它兜）。迁到 Spring Boot 4 后这个写法
 * 还要额外绑定 Jackson 3 的 {@code JsonMapper}，收益为零——全站唯一的 {@code String} 返回值是
 * {@code TemplateApi#addTemplate}，前端从未调用过它。
 *
 * <p>
 * 所以直接去掉这段覆盖，回到 Spring Boot 的标准转换器链。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

}
