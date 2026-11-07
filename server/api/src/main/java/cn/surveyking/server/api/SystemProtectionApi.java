package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.SystemInfoRequest;
import cn.surveyking.server.impl.SystemServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 内容保护（水印 / 防复制）的独立写接口。
 *
 * <p>
 * 为什么和 {@code POST /api/system/update} 分开：后者是「整页系统设置」的保存入口，要
 * {@code system:setting:update}，一次能改系统名称、注册开关、AI、导出密码等；而水印与防复制
 * 属于内容策略，权限点是 {@code content:protect}。把两者混在一个接口里，等于让「只能改水印」
 * 的角色顺带拿到改全部系统配置的能力。
 *
 * <p>
 * 本接口只接受 {@code setting} 里的三个字段：{@code copyProtected}、
 * {@code watermarkEnabled}、{@code watermarkMode}。请求体里的其它字段（name / avatar /
 * registerInfo / aiSetting / exportPassword / collaboratorAuthority …）一律忽略：白名单在
 * {@link SystemServiceImpl#updateProtection(SystemInfoRequest)} 里做，直接构造 JSON 也写不进别的配置。
 *
 * <p>
 * 这里注入实现类而不是 {@code SystemService} 接口，是因为本次改动不允许动
 * {@code server/shared/.../service/SystemService.java}，而新增的
 * {@code updateProtection} 只能加在实现类上。本仓库已有同样的写法
 * （{@code SystemServiceImpl} 注入 {@code RoleServiceImpl}），@Transactional / @Service
 * 的实现类由 Spring Boot 默认的 CGLIB 代理包装，按实现类注入可以正常拿到代理对象。
 *
 * @author xuri
 */
@RestController
@RequestMapping("${api.prefix}/system")
@RequiredArgsConstructor
public class SystemProtectionApi {

	private final SystemServiceImpl systemService;

	/**
	 * 保存水印 / 防复制策略（三项任意子集，未给的字段保持不变）。
	 * @param request 只读取 setting.copyProtected、setting.watermarkEnabled、
	 * setting.watermarkMode，其它字段忽略
	 */
	@PostMapping("/protection")
	@PreAuthorize("hasAuthority('content:protect') or hasRole('admin')")
	public void updateProtection(@RequestBody SystemInfoRequest request) {
		systemService.updateProtection(request);
	}

}
