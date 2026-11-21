package cn.surveyking.server.core.security;

import cn.surveyking.server.domain.dto.UserTokenView;
import cn.surveyking.server.domain.dto.SurveyWechatIdentity;
import tools.jackson.databind.ObjectMapper;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Encoders;
import io.jsonwebtoken.lang.Maps;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Collections;
import java.util.Date;





@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenUtil {

	private final ObjectMapper objectMapper;






	@Value("${sk.security.jwt.secret:}")
	private String configuredJwtSecret;

	private String jwtSecret;

	@jakarta.annotation.PostConstruct
	void initJwtSecret() {
		if (configuredJwtSecret != null && !configuredJwtSecret.trim().isEmpty()) {
			jwtSecret = configuredJwtSecret.trim();
			return;
		}
		jwtSecret = generateSecurityKey();
		org.slf4j.LoggerFactory.getLogger(JwtTokenUtil.class).warn(
				"未配置 sk.security.jwt.secret（环境变量 SK_JWT_SECRET），已随机生成 JWT 密钥：重启后所有登录态将失效，多实例之间无法互认。");
	}

	@Value("${sk.security.jwt.expiration-seconds:28800}")
	private long jwtExpirationSeconds;

	public String generateAccessToken(UserTokenView user) {
		return Jwts.builder().serializeToJsonWith(new JwtJsonCodec.Jackson3Serializer(objectMapper)).claim("user", user)
				.setIssuedAt(new Date())
				.setExpiration(new Date(System.currentTimeMillis() + jwtExpirationSeconds * 1000))
				.signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes())).compact();
	}

	public String generateSurveyWechatToken(SurveyWechatIdentity identity) {
		return Jwts.builder().serializeToJsonWith(new JwtJsonCodec.Jackson3Serializer(objectMapper)).claim("surveyWechat", identity)
				.setIssuedAt(new Date())
				.setExpiration(new Date(System.currentTimeMillis() + jwtExpirationSeconds * 1000))
				.signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes())).compact();
	}

	public boolean validate(String token) {
		try {


			Jwts.parser()
					.deserializeJsonWith(new JwtJsonCodec.Jackson3Deserializer(objectMapper, Collections.emptyMap()))
					.verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes())).build().parseClaimsJws(token);
			return true;
		}
		catch (SignatureException ex) {
			log.error("Invalid JWT signature - {}", ex.getMessage());
		}
		catch (MalformedJwtException ex) {
			log.error("Invalid JWT token - {}", ex.getMessage());
		}
		catch (ExpiredJwtException ex) {
			log.error("Expired JWT token - {}", ex.getMessage());
		}
		catch (UnsupportedJwtException ex) {
			log.error("Unsupported JWT token - {}", ex.getMessage());
		}
		catch (IllegalArgumentException ex) {
			log.error("JWT claims string is empty - {}", ex.getMessage());
		}
		return false;
	}

	public UserTokenView getUser(String token) {
		return Jwts.parser()
				.deserializeJsonWith(new JwtJsonCodec.Jackson3Deserializer(objectMapper, Maps.of("user", UserTokenView.class).build()))
				.verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes())).build().parseClaimsJws(token).getBody()
				.get("user", UserTokenView.class);
	}

	public SurveyWechatIdentity getSurveyWechatIdentity(String token) {
		return Jwts.parser()
				.deserializeJsonWith(
						new JwtJsonCodec.Jackson3Deserializer(objectMapper, Maps.of("surveyWechat", SurveyWechatIdentity.class).build()))
				.verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes())).build().parseClaimsJws(token).getBody()
				.get("surveyWechat", SurveyWechatIdentity.class);
	}

	private static String generateSecurityKey() {
		Key key = Keys.secretKeyFor(SignatureAlgorithm.HS512);
		String secretString = Encoders.BASE64.encode(key.getEncoded());
		return secretString;
	}

}