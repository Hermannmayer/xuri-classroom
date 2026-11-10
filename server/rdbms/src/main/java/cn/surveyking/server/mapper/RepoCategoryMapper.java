package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.RepoCategory;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 题库分类（目录登记表）Mapper；查询/写入都走 MyBatis-Plus Wrapper。
 *
 * @author surveyking
 */
@Mapper
public interface RepoCategoryMapper extends BaseMapper<RepoCategory> {

}
