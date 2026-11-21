package cn.surveyking.server.core.security;

import cn.surveyking.server.core.config.WebSecurityConfig;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;





@Component
@RequiredArgsConstructor
public class JwtTokenFilter extends OncePerRequestFilter {

	private final JwtTokenUtil jwtTokenUtil;

	private final UserService userService;

	private final RestAuthenticationEntryPoint resolveException;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {

		Cookie tokenFromCookie = WebUtils.getCookie(request, AppConsts.TOKEN_NAME);
		WebSecurityConfig securityConfig = ContextHelper.getBean(WebSecurityConfig.class);
		String tokenFromParameter = securityConfig.getUrlTokenAuthentication().isEnabled()
				? request.getParameter(AppConsts.TOKEN_NAME) : null;
		if (tokenFromCookie == null && isBlank(tokenFromParameter)) {
			chain.doFilter(request, response);
			return;
		}


		final String token = isNotBlank(tokenFromParameter) ? tokenFromParameter : tokenFromCookie.getValue().trim();
		if (!jwtTokenUtil.validate(token)) {
			chain.doFilter(request, response);
			return;
		}

		try {

			UserDetails userDetails = userService.loadUserById(jwtTokenUtil.getUser(token).getUserId());
			if (userDetails == null || !userDetails.isEnabled() || !userDetails.isAccountNonLocked()
					|| !userDetails.isAccountNonExpired() || !userDetails.isCredentialsNonExpired()) {
				throw new DisabledException("User account is unavailable");
			}

			UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userDetails,
					null, userDetails.getAuthorities());
			authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

			SecurityContextHolder.getContext().setAuthentication(authentication);


			if (tokenFromCookie == null && tokenFromParameter != null) {
				ResponseCookie cookie = ResponseCookie.from(AppConsts.TOKEN_NAME, tokenFromParameter).path("/")
						.httpOnly(true).secure(request.isSecure()).sameSite("Lax").build();
				response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
			}

			chain.doFilter(request, response);
		}
		catch (AuthenticationException e) {

			resolveException.commence(request, response, e);
		}

	}

}
