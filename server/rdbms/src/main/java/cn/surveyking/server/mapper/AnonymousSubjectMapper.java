package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AnonymousSubject;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 匿名答题主体 Mapper；查询/清理都走 MyBatis-Plus Wrapper。
 *
 * @author surveyking
 */
@Mapper
public interface AnonymousSubjectMapper extends BaseMapper<AnonymousSubject> {

}
