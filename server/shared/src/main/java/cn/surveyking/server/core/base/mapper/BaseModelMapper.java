package cn.surveyking.server.core.base.mapper;

import cn.surveyking.server.core.uitls.ContextHelper;
import tools.jackson.databind.ObjectMapper;
import org.springframework.util.CollectionUtils;

import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;










public interface BaseModelMapper<R, V, M> {

	/** 将请求转换成 Model 实体对象；返回 Domain域对象。 */
	M fromRequest(R request);

	List<M> fromRequest(List<R> requestList);

	/** 转换Model实体对象到视图对象；返回 View视图对象。 */
	V toView(M model);

	List<V> toView(List<M> modelList);

	/** 转换bean到map；返回 转换后的map对象 */
	default Map<String, Object> beanToMap(Object bean) {
		ObjectMapper om = ContextHelper.getBean(ObjectMapper.class);
		return om.convertValue(bean, Map.class);
	}

	/** 转换bean集合到map集合；返回 转换后的map对象集合 */
	default <T> List<Map<String, Object>> beanToMap(List<T> dataList) {
		if (CollectionUtils.isEmpty(dataList)) {
			return new LinkedList<>();
		}
		return dataList.stream().map(this::beanToMap).collect(Collectors.toList());
	}

	/** 转换map到bean；返回 转换后的bean对象 */
	default <T> T mapToBean(Map<String, Object> map, Class<T> beanClazz) {
		ObjectMapper om = ContextHelper.getBean(ObjectMapper.class);
		return om.convertValue(map, beanClazz);
	}

	/** 转换map集合到bean集合；返回 转换后的bean对象集合 */
	default <T> List<T> mapToBean(List<Map<String, Object>> mapList, Class<T> beanClazz) {
		if (CollectionUtils.isEmpty(mapList)) {
			return new LinkedList<>();
		}
		return mapList.stream().map(m -> mapToBean(m, beanClazz)).collect(Collectors.toList());
	}

	/** 对于Map字段到Map字段的映射场景，MapStruct会根据方法签名自动选择该函数 作为对象copy的函数；返回 直接返回的map */
	default Map<String, Object> mapToMap(Map<String, Object> map) {
		return map;
	}

}
