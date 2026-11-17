package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.NoticeRead;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 公告已读记录 Mapper。
 *
 * <p>只做「按用户 + 公告 id 批量查/插」，没有复杂 SQL；未读数的「没读过」用
 * {@code NOT EXISTS} 子查询在 {@code NoticeServiceImpl} 里拼，避免把已读 id 全量捞进内存。
 */
@Mapper
public interface NoticeReadMapper extends BaseMapper<NoticeRead> {

}
