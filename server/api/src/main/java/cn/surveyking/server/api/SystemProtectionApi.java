package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.SystemInfoRequest;
import cn.surveyking.server.impl.SystemServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

























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
