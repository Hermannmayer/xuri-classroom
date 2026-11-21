package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ClassResource;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ClassResourceMapper extends BaseMapper<ClassResource> {

	/**
	 * 物理删除一条分配记录。
	 *
	 * <p>表上有 {@code (class_id, resource_type, resource_id)} 唯一键：逻辑删除后会留下 is_deleted=1 的行，

	 * 班级资源分配是「随时可以重新分配」的轻量关系，不留审计负担。
	 */
	@Delete("DELETE FROM t_class_resource WHERE id = #{id}")
	int hardDelete(@Param("id") String id);

	/** 班级删除时清掉它的全部资源分配，避免孤儿行 */
	@Delete("DELETE FROM t_class_resource WHERE class_id = #{classId}")
	int hardDeleteByClassId(@Param("classId") String classId);

}
