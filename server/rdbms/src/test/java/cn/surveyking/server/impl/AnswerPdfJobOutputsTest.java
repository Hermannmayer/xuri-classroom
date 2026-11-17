package cn.surveyking.server.impl;

import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.impl.AnswerPdfJobServiceImpl.ExportJob;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.domain.dto.DownloadQuery.DownloadType;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.SysInfoMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.storage.StorageProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/**
 * 多格式导出（task-31）的三件事：格式解析、ZIP 命名、失败统计。
 *
 * <p>
 * 为什么用「假渲染器」而不是真出 PDF：这条链路的坑不在 PDFBox 里，而在
 * 「哪一种格式算哪一种文件、失败记到谁头上、全部失败和部分失败怎么区分」。
 * 真渲染既慢又要字体资源，还会把测试变成一碰排版就红。所以 {@code renderOne} 留了一个
 * 渲染函数入口，这里塞进只会返回几个字节的假实现。
 *
 * <p>
 * 纯 Mockito，不启动 Spring、不连库、不写磁盘产物。
 */
class AnswerPdfJobOutputsTest {

	private static final byte[] FAKE_BYTES = "x".getBytes(StandardCharsets.UTF_8);

	private final AnswerPdfJobServiceImpl service = new AnswerPdfJobServiceImpl(mock(AnswerMapper.class),
			mock(AnswerViewMapper.class), mock(ProjectMapper.class), mock(DeptMapper.class), mock(UserMapper.class),
			mock(SysInfoMapper.class), mock(FileService.class), mock(StorageProperties.class));

	/* ====== 格式解析 ====== */

	@Test
	@DisplayName("outputs 为空时按 type 回退；type 也缺省 = 线上的成绩单（老调用方行为不变）")
	void resolveOutputsFallsBackToType() {
		DownloadQuery query = new DownloadQuery();
		assertEquals(List.of(DownloadType.answerPdf), AnswerPdfJobServiceImpl.resolveOutputs(query));

		query.setType(DownloadType.answerPdf);
		assertEquals(List.of(DownloadType.answerPdf), AnswerPdfJobServiceImpl.resolveOutputs(query));

		query.setType(DownloadType.answerSheetPdf);
		assertEquals(List.of(DownloadType.answerSheetPdf), AnswerPdfJobServiceImpl.resolveOutputs(query));
	}

	@Test
	@DisplayName("outputs 保序 + 去重（前端勾选顺序就是 ZIP 里的渲染顺序）")
	void resolveOutputsKeepsOrderAndDedupes() {
		DownloadQuery query = new DownloadQuery();
		query.setOutputs(List.of(DownloadType.answerImage, DownloadType.answerPdf, DownloadType.answerImage));

		assertEquals(List.of(DownloadType.answerImage, DownloadType.answerPdf),
				AnswerPdfJobServiceImpl.resolveOutputs(query));
	}

	@Test
	@DisplayName("四种答卷格式全收")
	void resolveOutputsAcceptsAllAnswerFormats() {
		DownloadQuery query = new DownloadQuery();
		List<DownloadType> all = List.of(DownloadType.answerPdf, DownloadType.answerSheetPdf,
				DownloadType.answerImage, DownloadType.confirmSheetPdf);
		query.setOutputs(all);

		assertEquals(all, AnswerPdfJobServiceImpl.resolveOutputs(query));
	}

	@Test
	@DisplayName("Excel 明细 / 全班成绩册 / null 一律拒绝，中文提示说清只支持答卷相关类型")
	void resolveOutputsRejectsNonAnswerTypes() {
		for (DownloadType bad : List.of(DownloadType.answer, DownloadType.attachment, DownloadType.gradeBookPdf)) {
			DownloadQuery query = new DownloadQuery();
			query.setOutputs(List.of(bad));
			ErrorCodeException error = assertThrows(ErrorCodeException.class,
					() -> AnswerPdfJobServiceImpl.resolveOutputs(query));
			assertTrue(error.getMessage().contains("只支持答卷相关导出类型"), error.getMessage());
		}

		// 数组里混进 null：按脏数据拒掉，不能悄悄补一个默认格式
		DownloadQuery withNull = new DownloadQuery();
		withNull.setOutputs(Arrays.asList(DownloadType.answerPdf, null));
		assertThrows(ErrorCodeException.class, () -> AnswerPdfJobServiceImpl.resolveOutputs(withNull));
	}

	/* ====== ZIP 命名 ====== */

	@Test
	@DisplayName("单格式沿用历史命名：只有成绩单时 ZIP 仍叫「答卷PDF」")
	void zipFormatTagKeepsLegacyNameForGradeReport() {
		assertEquals("答卷PDF", AnswerPdfJobServiceImpl.zipFormatTag(List.of(DownloadType.answerPdf)));
		assertEquals("答卷PDF", AnswerPdfJobServiceImpl.zipFormatTag(List.of()));
	}

	@Test
	@DisplayName("单格式用格式名，多格式用「答题卷+长图」拼接（老师不用解压就知道里面有什么）")
	void zipFormatTagForOtherFormats() {
		assertEquals("答题卷", AnswerPdfJobServiceImpl.zipFormatTag(List.of(DownloadType.answerSheetPdf)));
		assertEquals("长图", AnswerPdfJobServiceImpl.zipFormatTag(List.of(DownloadType.answerImage)));
		assertEquals("确认单", AnswerPdfJobServiceImpl.zipFormatTag(List.of(DownloadType.confirmSheetPdf)));
		assertEquals("答题卷+长图",
				AnswerPdfJobServiceImpl.zipFormatTag(List.of(DownloadType.answerSheetPdf, DownloadType.answerImage)));
	}

	@Test
	@DisplayName("子目录名与前端提示一致；长图是 png，其余是 pdf")
	void outputDirAndExtension() {
		assertEquals("成绩单", AnswerPdfJobServiceImpl.outputDir(DownloadType.answerPdf));
		assertEquals("答题卷", AnswerPdfJobServiceImpl.outputDir(DownloadType.answerSheetPdf));
		assertEquals("长图", AnswerPdfJobServiceImpl.outputDir(DownloadType.answerImage));
		assertEquals("确认单", AnswerPdfJobServiceImpl.outputDir(DownloadType.confirmSheetPdf));
		assertEquals("png", AnswerPdfJobServiceImpl.outputExt(DownloadType.answerImage));
		assertEquals("pdf", AnswerPdfJobServiceImpl.outputExt(DownloadType.answerPdf));
	}

	/* ====== 渲染循环 / 失败统计 ====== */

	@Test
	@DisplayName("多格式：一个 ZIP 里按格式分子目录，长图是 png")
	void renderOneWritesPerFormatSubdirectories() throws Exception {
		ExportJob job = job(DownloadType.answerPdf, DownloadType.answerImage);

		List<String> entries = render(job, answer("张三"), (output, project, view, source, className, spec) -> FAKE_BYTES);

		assertEquals(List.of("成绩单/张三.pdf", "长图/张三.png"), entries);
		assertEquals(1, job.getDone());
		assertEquals(2, job.getFilesWritten());
		assertEquals(0, job.getFailed());
		assertFalse(AnswerPdfJobServiceImpl.allFailed(job));
	}

	@Test
	@DisplayName("单个格式失败只记这个格式，不中断：同一份答卷的其它格式照出")
	void singleFormatFailureIsCountedNotFatal() throws Exception {
		ExportJob job = job(DownloadType.answerPdf, DownloadType.answerImage);

		List<String> entries = render(job, answer("张三"), (output, project, view, source, className, spec) -> {
			if (output == DownloadType.answerImage) {
				throw new IllegalStateException("长图渲染失败");
			}
			return FAKE_BYTES;
		});

		assertEquals(List.of("成绩单/张三.pdf"), entries);
		assertEquals(1, job.getFailed());
		assertEquals(List.of("张三（长图）"), new ArrayList<>(job.getFailedNames()));
		// 至少一种格式成功 → 这一份算成功，任务不会因为一张长图挂掉
		assertEquals(1, job.getDone());
		assertEquals(1, job.getFilesWritten());
		assertFalse(AnswerPdfJobServiceImpl.allFailed(job));
	}

	@Test
	@DisplayName("全部格式都失败：done=0、allFailed=true（整任务按失败处理，不发布空 ZIP）")
	void allFormatsFailureMarksJobFailed() throws Exception {
		ExportJob job = job(DownloadType.answerPdf, DownloadType.answerImage);

		List<String> entries = render(job, answer("张三"), (output, project, view, source, className, spec) -> {
			throw new IllegalStateException("什么都渲染不出来");
		});

		assertTrue(entries.isEmpty());
		assertEquals(0, job.getDone());
		assertEquals(2, job.getFailed());
		assertEquals(0, job.getFilesWritten());
		assertTrue(AnswerPdfJobServiceImpl.allFailed(job));
	}

	@Test
	@DisplayName("同名答卷在同一子目录里加 (2)；非法字符（/ 与 :）被替换掉")
	void entryNamesAreUniqueAndSanitized() throws Exception {
		ExportJob job = job(DownloadType.answerPdf);
		Set<String> usedNames = new HashSet<>();
		List<String> entries = new ArrayList<>();
		try (ByteArrayOutputStream out = new ByteArrayOutputStream();
				ZipOutputStream zip = new ZipOutputStream(out)) {
			Answer first = answer("张三");
			AnswerView view = new AnswerView();
			service.renderOne(zip, null, null, first, view, usedNames, job, fakeOk());
			service.renderOne(zip, null, null, answer("张三"), new AnswerView(), usedNames, job, fakeOk());
			service.renderOne(zip, null, null, answer("李/四:五"), new AnswerView(), usedNames, job, fakeOk());
			zip.finish();
			entries = entryNames(out.toByteArray());
		}

		assertEquals(List.of("成绩单/张三.pdf", "成绩单/张三(2).pdf", "成绩单/李_四_五.pdf"), entries);
	}

	/* ====== 辅助 ====== */

	private AnswerPdfJobServiceImpl.OutputRenderer fakeOk() {
		return (output, project, view, source, className, spec) -> FAKE_BYTES;
	}

	private ExportJob job(DownloadType... outputs) {
		AnswerPdfJobServiceImpl.ExportSpec spec = new AnswerPdfJobServiceImpl.ExportSpec().projectId("p1")
				.outputs(Arrays.asList(outputs));
		return new AnswerPdfJobServiceImpl.ExportJob("job-1", spec);
	}

	private static Answer answer(String name) {
		Answer answer = new Answer();
		answer.setId("a-" + name);
		answer.setAnswererName(name);
		answer.setAttemptNo(Integer.valueOf(0));
		return answer;
	}

	private List<String> render(ExportJob job, Answer answer, AnswerPdfJobServiceImpl.OutputRenderer renderer)
			throws Exception {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(out)) {
			service.renderOne(zip, mock(ProjectView.class), "保育员1班", answer, new AnswerView(), new HashSet<>(),
					job, renderer);
			zip.finish();
		}
		return entryNames(out.toByteArray());
	}

	private static List<String> entryNames(byte[] zipBytes) throws Exception {
		List<String> names = new ArrayList<>();
		try (ZipInputStream zip = new ZipInputStream(new java.io.ByteArrayInputStream(zipBytes))) {
			ZipEntry entry = zip.getNextEntry();
			while (entry != null) {
				names.add(entry.getName());
				entry = zip.getNextEntry();
			}
		}
		return names;
	}

}
