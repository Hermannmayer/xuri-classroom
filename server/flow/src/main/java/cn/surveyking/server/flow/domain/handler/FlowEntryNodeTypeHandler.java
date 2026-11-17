package cn.surveyking.server.flow.domain.handler;

import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.flow.domain.model.FlowEntryNode;
import com.baomidou.mybatisplus.extension.handlers.AbstractJsonTypeHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

import java.util.List;

/**
 * @author javahuang
 * @date 2022/1/12
 */
@MappedTypes({ Object.class })
@MappedJdbcTypes(JdbcType.VARCHAR)
public class FlowEntryNodeTypeHandler extends AbstractJsonTypeHandler<List<FlowEntryNode>> {

	@Override
	protected List<FlowEntryNode> parse(String json) {
		ObjectMapper mapper = ContextHelper.getBean(ObjectMapper.class);
		try {
			return mapper.readValue(json, new TypeReference<List<FlowEntryNode>>() {
			});
		}
		catch (JacksonException e) {
			throw new RuntimeException(e);
		}
	}

	@Override
	protected String toJson(List<FlowEntryNode> obj) {
		ObjectMapper mapper = ContextHelper.getBean(ObjectMapper.class);
		try {
			return mapper.writeValueAsString(obj);
		}
		catch (JacksonException e) {
			throw new RuntimeException(e);
		}
	}

}
