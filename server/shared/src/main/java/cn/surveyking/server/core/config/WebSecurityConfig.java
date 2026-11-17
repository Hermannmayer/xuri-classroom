package cn.surveyking.server.core.config;

import cn.surveyking.server.core.security.JwtTokenFilter;
import cn.surveyking.server.core.security.PasswordEncoder;
import cn.surveyking.server.core.security.RateLimitFilter;
import cn.surveyking.server.core.security.RestAuthenticationEntryPoint;
import cn.surveyking.server.service.UserService;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/6
 */
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, prePostEnabled = true)
@Configuration
@ConfigurationProperties("sk.security")
public class WebSecurityConfig {

	/**
	 * 开启 url token 认证
	 */
	private final UrlTokenAuthentication urlTokenAuthentication = new UrlTokenAuthentication();

	private final Cors cors = new Cors();

	private final JwtTokenFilter jwtTokenFilter;

	private final UserService userService;

	private final RestAuthenticationEntryPoint authenticationEntryPoint;

	/** 题库类接口限流，防止脚本刷题/爬库 */
	private final RateLimitFilter rateLimitFilter;

	public WebSecurityConfig(JwtTokenFilter jwtTokenFilter, UserService userService,
			RestAuthenticationEntryPoint authenticationEntryPoint, RateLimitFilter rateLimitFilter) {
		this.jwtTokenFilter = jwtTokenFilter;
		this.userService = userService;
		this.authenticationEntryPoint = authenticationEntryPoint;
		this.rateLimitFilter = rateLimitFilter;
		// 允许在 @Async 方法里面获取 SecurityContext
		SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
	}

	/**
	 * 账号密码登录用的认证提供者。
	 *
	 * <p>
	 * 迁移到 Spring Security 7 之前这里是 {@code configure(AuthenticationManagerBuilder)} 里的一句
	 * {@code auth.userDetailsService(...)}：框架会自动挑一个 {@code PasswordEncoder} Bean 装进
	 * DaoAuthenticationProvider。适配器被移除后这个「自动挑」不再发生，必须显式装配，
	 * 否则登录会在运行期报「没有 PasswordEncoder」。
	 */
	@Bean
	public AuthenticationProvider authenticationProvider(PasswordEncoder passwordEncoder) {
		// Spring Security 7 只剩 DaoAuthenticationProvider(UserDetailsService) 这一个构造器，
		// 无参构造 + setUserDetailsService 的写法已被删除。
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userService);
		provider.setPasswordEncoder(passwordEncoder);
		return provider;
	}

	/**
	 * 暴露给 {@code UserApi} / {@code LoginFormValidator} 手动认证使用。
	 */
	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
		return configuration.getAuthenticationManager();
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		// 设置允许 iframe 引用
		http.headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable));
		http.cors(corsConfigurer -> {
		});
		http.csrf(csrf -> csrf.disable());
		http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
		http.exceptionHandling(handling -> handling.authenticationEntryPoint(authenticationEntryPoint));
		// 所有请求都放行，目的是单 jar 部署，输入任意路由也能跳转到对应的页面，权限拦截通过注解配置

		// /api/system/version 也放行：升级脚本、监控、排障都要在"还没登录"时确认程序版本与库结构版本，
		// 里面只有版本号（README/Release 页本来就公开），不含任何密钥或用户数据。
		http.authorizeHttpRequests(registry -> registry.requestMatchers("/api/public/**").permitAll()
				.requestMatchers("/api/system").permitAll().requestMatchers("/api/system/version").permitAll()
				.requestMatchers("/captcha/get", "/captcha/check").permitAll().requestMatchers("/api/**")
				.authenticated().anyRequest().permitAll());
		http.addFilterBefore(jwtTokenFilter, UsernamePasswordAuthenticationFilter.class);
		// 限流放在 JWT 之后：要先知道是谁，才能按用户计数
		http.addFilterAfter(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	@Bean
	public CorsFilter corsFilter() {
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		if (cors.getAllowedOriginPatterns().isEmpty()) {
			return new CorsFilter(source);
		}
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowCredentials(true);
		config.setAllowedOriginPatterns(cors.getAllowedOriginPatterns());
		config.addAllowedHeader("*");
		config.addAllowedMethod("*");
		source.registerCorsConfiguration("/**", config);
		return new CorsFilter(source);
	}

	public UrlTokenAuthentication getUrlTokenAuthentication() {
		return urlTokenAuthentication;
	}

	public Cors getCors() {
		return cors;
	}

	public static class UrlTokenAuthentication {

		/**
		 * 是否开启 token 认证
		 */
		private boolean enabled = false;

		public boolean isEnabled() {
			return this.enabled;
		}

		public void setEnabled(boolean enabled) {
			this.enabled = enabled;
		}

	}

	public static class Cors {

		private List<String> allowedOriginPatterns = new ArrayList<>();

		public List<String> getAllowedOriginPatterns() {
			return allowedOriginPatterns;
		}

		public void setAllowedOriginPatterns(List<String> allowedOriginPatterns) {
			this.allowedOriginPatterns = allowedOriginPatterns == null ? new ArrayList<>() : allowedOriginPatterns;
		}

	}

}
