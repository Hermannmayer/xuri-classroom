package cn.surveyking.server.core.security;

import io.jsonwebtoken.io.DeserializationException;
import io.jsonwebtoken.io.Deserializer;
import io.jsonwebtoken.io.SerializationException;
import io.jsonwebtoken.io.Serializer;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.OutputStream;
import java.io.Reader;
import java.util.Map;

/**
 * jjwt 与 Jackson 3 之间的桥。
 *
 * <p>
 * 官方 {@code jjwt-jackson} 模块绑死在 Jackson 2（{@code com.fasterxml.jackson.databind.ObjectMapper}）。
 * 迁到 Spring Boot 4 之后应用侧只有 Jackson 3（{@code tools.jackson.*}），而两者的注解包
 * {@code com.fasterxml.jackson.annotation} 是同一个坐标、版本却分属 2.x / 3.x，混用会在运行期踩
 * 二进制不兼容。这里用 Jackson 3 实现 jjwt 的两个接口，直接去掉 {@code jjwt-jackson} 依赖，
 * 产出的仍然是同样的 JSON 结构，历史 token 不受影响。
 *
 * <p>
 * jjwt 0.13 起 {@link Serializer} / {@link Deserializer} 各有两个抽象方法（byte[] 与流式），
 * 所以下面两种形态都要实现。
 */
public final class JwtJsonCodec {

	private JwtJsonCodec() {
	}

	/** 把 JWT 载荷序列化成 JSON 字节。 */
	public static class Jackson3Serializer implements Serializer<Map<String, ?>> {

		private final ObjectMapper objectMapper;

		public Jackson3Serializer(ObjectMapper objectMapper) {
			this.objectMapper = objectMapper;
		}

		@Override
		public byte[] serialize(Map<String, ?> source) {
			try {
				return objectMapper.writeValueAsBytes(source);
			}
			catch (JacksonException e) {
				throw new SerializationException("JWT 载荷序列化失败", e);
			}
		}

		@Override
		public void serialize(Map<String, ?> source, OutputStream out) {
			try {
				objectMapper.writeValue(out, source);
			}
			catch (JacksonException e) {
				throw new SerializationException("JWT 载荷序列化失败", e);
			}
		}

	}

	/**
	 * 反序列化 JWT 载荷，并把登记的 claim（如 user / surveyWechat）还原成目标类型。
	 *
	 * <p>
	 * jjwt 解析出来的是 {@code Map<String, Object>}，自定义 claim 默认是 LinkedHashMap，
	 * 不能直接当 DTO 用，所以这里按 {@code claimTypes} 再做一次 convertValue。
	 */
	public static class Jackson3Deserializer implements Deserializer<Map<String, ?>> {

		private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<Map<String, Object>>() {
		};

		private final ObjectMapper objectMapper;

		private final Map<String, ? extends Class<?>> claimTypes;

		public Jackson3Deserializer(ObjectMapper objectMapper, Map<String, ? extends Class<?>> claimTypes) {
			this.objectMapper = objectMapper;
			this.claimTypes = claimTypes;
		}

		@Override
		public Map<String, ?> deserialize(byte[] bytes) {
			try {
				return convert(objectMapper.readValue(bytes, MAP_TYPE));
			}
			catch (JacksonException e) {
				throw new DeserializationException("JWT 载荷解析失败", e);
			}
		}

		@Override
		public Map<String, ?> deserialize(Reader reader) {
			try {
				Map<String, Object> claims = objectMapper.readValue(reader, MAP_TYPE);
				return convert(claims);
			}
			catch (JacksonException e) {
				throw new DeserializationException("JWT 载荷解析失败", e);
			}
		}

		private Map<String, ?> convert(Map<String, Object> claims) {
			claimTypes.forEach((name, type) -> {
				Object value = claims.get(name);
				if (value != null && !type.isInstance(value)) {
					claims.put(name, objectMapper.convertValue(value, type));
				}
			});
			return claims;
		}

	}

}
