package cn.surveyking.server.core.uitls;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link ExcelExporter} 两个构造入口的边界。
 *
 * <p>
 * 历史实现里带 {@code OutputStream} 的构造把 Workbook 写到调用方的流，而 {@code export()} 读的是
 * 内部 {@code ByteArrayOutputStream} —— 混用会**静默**拿到 0 字节。现在 export() 会直接报错，
 * 并指路到 exportToStream()。这个测试把两条路都钉住。
 */
class ExcelExporterStreamTest {

	@Test
	void exportRejectsExternalStreamInstance() {
		ByteArrayOutputStream external = new ByteArrayOutputStream();
		ExcelExporter exporter = new ExcelExporter(external);
		exporter.createSheet("S1");
		exporter.createHeader(Arrays.asList("姓名"));
		exporter.createRow(Arrays.asList(Arrays.asList("张三")));

		IllegalStateException error = assertThrows(IllegalStateException.class, exporter::export);
		assertTrue(error.getMessage().contains("exportToStream"), "错误提示要指路：" + error.getMessage());

		// 报错发生在 finish() 之前，所以外部流这条路仍然可用
		exporter.exportToStream();
		assertTrue(external.size() > 0, "exportToStream 应该把内容写进外部流");
	}

	@Test
	void exportWorksOnInternalBufferInstance() {
		ExcelExporter exporter = new ExcelExporter();
		exporter.createSheet("S1");
		exporter.createHeader(Arrays.asList("姓名"));
		exporter.createRow(Arrays.asList(Arrays.asList("张三")));
		try (var in = exporter.export()) {
			assertTrue(in != null && in.readAllBytes().length > 0, "无参构造的 export() 应该有内容");
		}
		catch (java.io.IOException e) {
			throw new IllegalStateException(e);
		}
	}

}
