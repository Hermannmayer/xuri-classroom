package cn.surveyking.server.core.uitls;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import lombok.extern.slf4j.Slf4j;





@Slf4j
public class JSONUtil {

	private static final JsonMapper MAPPER = JsonMapper.builder().build();

	/**
	 * Transfer object to JSON string
	 * <p>
	 * 只给 {@code ApiResponse#toString()} 这类日志/排障场景用，不参与接口序列化
	 * （接口序列化走 Spring 的 Jackson 3 转换器）。Jackson 3 里
	 * {@code writeValueAsString} 抛的是非受检的 {@link JacksonException}，所以不再需要
	 * 受检异常分支；原先顺手设置的「允许单引号 / 无引号字段名」是解析侧特性，对序列化无效果，已去掉。
	 */
	public static String toJSONString(Object object) {
		try {
			return MAPPER.writeValueAsString(object);
		}
		catch (JacksonException e) {
			log.error("Generate JSON String error!" + e.getMessage());
			return null;
		}
	}

}
