package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ApiIdempotency;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;







@Mapper
public interface ApiIdempotencyMapper extends BaseMapper<ApiIdempotency> {

}
