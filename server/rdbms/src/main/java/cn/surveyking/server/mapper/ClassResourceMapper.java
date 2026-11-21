package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ClassResource;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ClassResourceMapper extends BaseMapper<ClassResource> {

	/** 物理删除一条分配记录 */
	@Delete("DELETE FROM t_class_resource WHERE id = #{id}")
	int hardDelete(@Param("id") String id);

	/** 班级删除时清掉它的全部资源分配，避免孤儿行 */
	@Delete("DELETE FROM t_class_resource WHERE class_id = #{classId}")
	int hardDeleteByClassId(@Param("classId") String classId);

}
