package cn.surveyking.server.core.uitls;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import lombok.extern.slf4j.Slf4j;





@Slf4j
public class JSONUtil {

	private static final JsonMapper MAPPER = JsonMapper.builder().build();

	/** Transfer object to JSON string */
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
