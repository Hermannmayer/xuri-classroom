package cn.surveyking.server.service;

import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.domain.dto.DeptDeleteCheckView;
import cn.surveyking.server.domain.dto.DeptDeleteRequest;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.DeptSortRequest;
import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.dto.SelectDeptRequest;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/11/2
 */
public interface DeptService {

	/**
	 * 查询组织机构信息，只有查询所有机构（request 为 null）的时候才启用缓存。
	 *
	 * <p>request.deptType 非空时只返回该类型的节点：{@code org}=用户组（教职工），
	 * {@code class}=班级（学员）；为空则不过滤（全量组织树）。
	 * @param request
	 */
	@Cacheable(cacheNames = CacheConsts.deptCacheName, keyGenerator = "deptKeyGenerator", condition = "#p0 == null")
	List<DeptView> listDept(SelectDeptRequest request);

	DeptView getDept(String id);

	@CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true)
	void addDept(DeptRequest request);

	@CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true)
	void updateDept(DeptRequest request);

	@CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true)
	void deleteDept(String id);

	/**
	 * 删除前的预检：子组、成员数量/姓名、是否最后一个组。
	 */
	DeptDeleteCheckView deleteCheck(String id);

	/**
	 * 删除用户组，并按 memberAction 处理主组成员（MOVE / UNASSIGN）。
	 */
	void deleteDept(DeptDeleteRequest request);

	@CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true)
	void sortDept(DeptSortRequest request);

}
