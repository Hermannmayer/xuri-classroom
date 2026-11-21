package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.UserBookRequest;
import cn.surveyking.server.domain.dto.UserBookView;
import cn.surveyking.server.domain.model.UserBook;
import org.mapstruct.Mapper;





@Mapper
public interface UserBookViewMapper extends BaseModelMapper<UserBookRequest, UserBookView, UserBook> {

}
