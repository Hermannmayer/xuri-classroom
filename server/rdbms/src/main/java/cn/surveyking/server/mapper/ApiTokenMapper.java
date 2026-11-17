package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ApiToken;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * API Token Mapper。
 *
 * <p>条件全部在 {@code ApiTokenServiceImpl} 里用 Wrapper 拼：按哈希查一行、按用户重排 last_used_at。
 * 表上没有逻辑删除列，撤销是 {@code revoked = 1} 的软状态，所以不需要 {@code @TableLogic}。
 */
@Mapper
public interface ApiTokenMapper extends BaseMapper<ApiToken> {

}
