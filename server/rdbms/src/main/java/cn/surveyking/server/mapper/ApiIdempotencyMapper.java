package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ApiIdempotency;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * MCP 写操作幂等 Mapper。
 *
 * <p>命中判定靠 {@code uk_api_idem (user_id, key_value)} 唯一键：先查再插，并发下插入冲突
 * 由 {@code ApiIdempotencyServiceImpl} 吞掉 {@code DuplicateKeyException}（另一路已经写进去了）。
 */
@Mapper
public interface ApiIdempotencyMapper extends BaseMapper<ApiIdempotency> {

}
