package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.model.Answer;
import org.mapstruct.Mapper;





@Mapper
public interface AnswerViewMapper extends BaseModelMapper<AnswerRequest, AnswerView, Answer> {

}
