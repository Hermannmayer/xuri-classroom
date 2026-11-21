package cn.surveyking.server.core.mybatis;

import com.baomidou.mybatisplus.core.toolkit.Assert;
import com.baomidou.mybatisplus.extension.handlers.AbstractJsonTypeHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;











@Slf4j
@MappedTypes({ List.class })
@MappedJdbcTypes({ JdbcType.VARCHAR })
public abstract class ListTypeHandler<T> extends AbstractJsonTypeHandler<T> {

	private static ObjectMapper objectMapper = new ObjectMapper();

	public ListTypeHandler(Class<?> type) {
		super(type);
		if (log.isTraceEnabled()) {
			log.trace("ListTypeHandler(" + type + ")");
		}
		Assert.notNull(type, "Type argument cannot be null", new Object[0]);
	}

	@Override
	@SuppressWarnings("unchecked")
	public T parse(String json) {
		try {
			Type type = getSuperGenricTypes(this.getClass());
			JavaType javaType = objectMapper.getTypeFactory().constructType(type);
			return (T) objectMapper.readValue(json, javaType);
		}
		catch (JacksonException e) {
			throw new RuntimeException(e);
		}
	}

	@Override
	public String toJson(T obj) {
		try {
			return objectMapper.writeValueAsString(obj);
		}
		catch (JacksonException e) {
			throw new RuntimeException(e);
		}
	}

	public static void setObjectMapper(ObjectMapper mapper) {
		Assert.notNull(mapper, "ObjectMapper should not be null", new Object[0]);

		ListTypeHandler.objectMapper = mapper;
	}

	public static Type getSuperGenricTypes(final Class<?> clz) {
		Class<?> superClass = clz;
		Type type = superClass.getGenericSuperclass();
		while (superClass != Object.class && !(type instanceof ParameterizedType)) {
			superClass = superClass.getSuperclass();
			type = superClass.getGenericSuperclass();
		}
		if (superClass == Object.class) {
			throw new IllegalArgumentException("父类不含泛型类型：" + clz);
		}
		return ((ParameterizedType) type).getActualTypeArguments()[0];
	}

}
