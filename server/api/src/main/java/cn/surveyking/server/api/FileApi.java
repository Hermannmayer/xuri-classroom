package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.UploadFileRequest;
import cn.surveyking.server.service.FileService;
import lombok.AllArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/9/10
 */
@RestController
@RequestMapping("${api.prefix}/file")
@AllArgsConstructor
public class FileApi {

	private final FileService fileService;

	/**
	 * 获取文件
	 * @param query
	 * @return
	 */
	@GetMapping
	@PreAuthorize("hasAuthority('file:detail')")
	public ResponseEntity<Resource> getFile(FileQuery query) {
		return fileService.loadUserFile(query);
	}

	/**
	 * 获取文件列表
	 * @param query
	 * @return
	 */
	@GetMapping("/list")
	@PreAuthorize("hasAuthority('file:list')")
	public List<FileView> listFiles(FileQuery query) {
		return fileService.listFiles(query);
	}

	/**
	 * 添加文件（上传附件 / 图片）。
	 *
	 * <p>
	 * 权限细分（与 {@link #downloadTemplate(String)} 的 {@code file:import} 区分）：
	 * <ul>
	 * <li>{@code file:upload}：通用上传，系统 Logo、头像这类「传个文件」的场景；不代表能导入外部数据；</li>
	 * <li>{@code file:import}：导入类上传（题库模板、导入模板等），历史角色用的就是它；</li>
	 * <li>{@code admin}：超级管理员直接放行。</li>
	 * </ul>
	 * 两个都接受是为了兼容老角色：只配了 {@code file:import} 的老师原来就能传 Logo，改成只认
	 * {@code file:upload} 会让这些人在升级后突然传不了；反过来只给 {@code file:upload}
	 * 的角色也拿不到「导入模板/批量导入」这类能力（那两个接口仍只认 {@code file:import}）。
	 * @param request 上传的表单
	 * @return 文件信息
	 */
	@PostMapping("/create")
	@PreAuthorize("hasAnyAuthority('file:upload','file:import') or hasRole('admin')")
	public FileView upload(UploadFileRequest request) {
		return fileService.upload(request);
	}

	/**
	 * 删除文件
	 * @param request
	 */
	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('file:delete')")
	public void deleteImage(@RequestBody UploadFileRequest request) {
		fileService.deleteFile(request.getId());
	}

	/**
	 * 下载导入 Excel 模板
	 * @param name 导入模板名称
	 * @return
	 */
	@GetMapping("/downloadTemplate")
	@PreAuthorize("hasAuthority('file:import')")
	public ResponseEntity<Resource> downloadTemplate(String name) {
		return fileService.downloadTemplate(name);
	}

}
