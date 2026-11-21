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















public final class JwtJsonCodec {

	private JwtJsonCodec() {
	}


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
