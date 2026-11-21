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





@RestController
@RequestMapping("${api.prefix}/file")
@AllArgsConstructor
public class FileApi {

	private final FileService fileService;






	@GetMapping
	@PreAuthorize("hasAuthority('file:detail')")
	public ResponseEntity<Resource> getFile(FileQuery query) {
		return fileService.loadUserFile(query);
	}






	@GetMapping("/list")
	@PreAuthorize("hasAuthority('file:list')")
	public List<FileView> listFiles(FileQuery query) {
		return fileService.listFiles(query);
	}

	/** 添加文件（上传附件 / 图片）；返回 文件信息 */
	@PostMapping("/create")
	@PreAuthorize("hasAnyAuthority('file:upload','file:import') or hasRole('admin')")
	public FileView upload(UploadFileRequest request) {
		return fileService.upload(request);
	}





	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('file:delete')")
	public void deleteImage(@RequestBody UploadFileRequest request) {
		fileService.deleteFile(request.getId());
	}






	@GetMapping("/downloadTemplate")
	// 下载导入模板：凡是「能导入」的角色都应该能拿到模板（附件导入 / 题目导入 / 题库导入）
	@PreAuthorize("hasAnyAuthority('file:import','template:import') or hasRole('admin')")
	public ResponseEntity<Resource> downloadTemplate(String name) {
		return fileService.downloadTemplate(name);
	}

}
