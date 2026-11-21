package cn.surveyking.server.service;

import java.util.Collection;
import java.util.Set;




public interface FileRefService {

	/** 绑定一次引用（幂等）。ownerType 只接受 project / repo。 */
	void bind(String fileId, String ownerType, String ownerId, String questionId);

	/** 批量绑定（用于保存时扫描 HTML）。 */
	void bindAll(Collection<String> fileIds, String ownerType, String ownerId);

	/** 某个项目/题库引用的文件 id。 */
	Set<String> listFileIds(String ownerType, String ownerId);

	/** 删除某个项目/题库的全部引用，返回被解除引用的文件 id（调用方决定是否删物理文件）。 */
	Set<String> deleteByOwner(String ownerType, String ownerId);

	/** 删除一个文件的全部引用。 */
	void deleteByFile(String fileId);

	/** 从 HTML/JSON 里扫描 /api/public/preview/{id} 并绑定。 */
	void syncHtml(String ownerType, String ownerId, String html);

	/** 用一份完整 HTML 替换某个 owner 的引用；返回被移除引用的文件 id。 */
	Set<String> replaceHtml(String ownerType, String ownerId, String html);

	/** 一个文件还剩多少引用。 */
	long countByFile(String fileId);

}
