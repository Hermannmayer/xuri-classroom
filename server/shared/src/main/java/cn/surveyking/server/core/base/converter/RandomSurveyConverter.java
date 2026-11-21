package cn.surveyking.server.core.base.converter;

import cn.surveyking.server.core.uitls.MapBeanUtils;
import cn.surveyking.server.domain.dto.ProjectSetting;
import lombok.SneakyThrows;
import org.springframework.core.convert.converter.Converter;

import java.util.LinkedHashMap;





public class RandomSurveyConverter
		implements Converter<LinkedHashMap<String, Object>, ProjectSetting.RandomSurveyCondition> {

	@Override
	@SneakyThrows
	public ProjectSetting.RandomSurveyCondition convert(LinkedHashMap<String, Object> value) {
		Object examScore = value.get("examScore");

		if (examScore != null && examScore instanceof Integer) {
			value.put("examScore", ((Integer) examScore).doubleValue());
		}

		return MapBeanUtils.mapToBean(value, ProjectSetting.RandomSurveyCondition.class);
	}

}
