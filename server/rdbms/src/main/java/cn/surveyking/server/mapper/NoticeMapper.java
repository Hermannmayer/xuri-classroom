package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.Notice;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 通知公告 Mapper。
 *
 * <p>查询条件全部在 {@code NoticeServiceImpl} 里用 Wrapper 拼（可见性、状态、受众、范围、未读），
 * 这里不需要额外 SQL：逻辑删除由 {@link Notice} 上的 {@code @TableLogic} 自动带上 is_deleted = 0。
 */
@Mapper
public interface NoticeMapper extends BaseMapper<Notice> {

}
