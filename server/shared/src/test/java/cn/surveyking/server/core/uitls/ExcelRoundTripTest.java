package cn.surveyking.server.core.uitls;

import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Excel 导出/导入的「真写出 + 真读回」冒烟。
 *
 * <p>
 * fastexcel 0.12 → 0.20 跨了 8 个小版本，而仓库里没有任何 Excel 测试覆盖。
 * 这里用项目自己的 {@link ExcelExporter} 写一份工作簿，再用 fastexcel-reader 读回来，
 * 断言表头、字符串与数字都正确落格——写端与读端一次验完。
 */
class ExcelRoundTripTest {

	@Test
	void writesAndReadsBackHeaderAndRows() throws Exception {
		// 用无参构造：export() 读的是内部 ByteArrayOutputStream。
		// （带参构造把 Workbook 写到调用方传的流上，但 export() 仍读内部流 —— 那是既有实现的怪处，
		//   不是本次升级引入的，这里只走生产代码实际用的那条路。）
		ExcelExporter exporter = new ExcelExporter();
		exporter.createSheet("成绩");
		exporter.createHeader(Arrays.asList("姓名", "分数", "备注"));
		exporter.createRow(Arrays.asList(
				Arrays.asList("张三", 90, "优秀"),
				Arrays.asList("李四", 72, null)));
		byte[] xlsx;
		try (ByteArrayInputStream in = exporter.export()) {
			assertTrue(in != null, "导出返回空流");
			xlsx = in.readAllBytes();
		}

		assertTrue(xlsx.length > 1024, "xlsx 太小：" + xlsx.length + " 字节");
		assertEquals("PK", new String(xlsx, 0, 2), "不是合法 xlsx（缺少 ZIP 头）");

		List<String> rowTexts = new ArrayList<>();
		try (ReadableWorkbook book = new ReadableWorkbook(new ByteArrayInputStream(xlsx))) {
			Sheet sheet = book.getFirstSheet();
			assertEquals("成绩", sheet.getName(), "工作表名丢了");
			try (var rows = sheet.openStream()) {
				for (Row row : (Iterable<Row>) rows::iterator) {
					StringBuilder line = new StringBuilder();
					for (int c = 0; c < row.getCellCount(); c++) {
						Cell cell = row.getCell(c);
						line.append(cell == null || cell.getValue() == null ? "" : cell.getRawValue()).append('|');
					}
					rowTexts.add(line.toString());
				}
			}
		}

		assertTrue(rowTexts.size() >= 3, "读回来的行数不对：" + rowTexts.size());
		assertTrue(rowTexts.get(0).contains("姓名") && rowTexts.get(0).contains("分数"), "表头没读到：" + rowTexts.get(0));
		assertTrue(rowTexts.get(1).contains("张三") && rowTexts.get(1).contains("90"), "第一行数据不对：" + rowTexts.get(1));
		assertTrue(rowTexts.get(2).contains("李四") && rowTexts.get(2).contains("72"), "第二行数据不对：" + rowTexts.get(2));
	}


	/**
	 * 带外部 OutputStream 的构造不能和 export() 混用：历史上会**静默**拿到 0 字节。
	 * 从 ExcelExporterStreamTest 合并进来（同包同类，没必要单独一个文件）。
	 */
	@Test
	void exportRejectsExternalStreamInstance() {
		ByteArrayOutputStream external = new ByteArrayOutputStream();
		ExcelExporter exporter = new ExcelExporter(external);
		exporter.createSheet("S1");
		exporter.createHeader(Arrays.asList("姓名"));
		exporter.createRow(Arrays.asList(Arrays.asList("张三")));

		IllegalStateException error = assertThrows(IllegalStateException.class, exporter::export);
		assertTrue(error.getMessage().contains("exportToStream"), "错误提示要指路：" + error.getMessage());

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
		} catch (java.io.IOException e) {
			throw new IllegalStateException(e);
		}
	}
}
