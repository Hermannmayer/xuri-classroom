package cn.surveyking.server.core.uitls;

import lombok.Data;
import lombok.experimental.Accessors;
import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 轻量级 excel 导出工具，换成 poi 打的包会多出十几 M，不能接受，-_-||
 *
 * @author javahuang
 * @date 2021/2/1
 */
public class ExcelExporter {

	private Workbook workbook;

	private Map<String, List<String>> columnsBySheet = new ConcurrentHashMap<>();

	private Map<String, Integer> rowIndexBySheet = new ConcurrentHashMap<>();

	private final ByteArrayOutputStream os = new ByteArrayOutputStream();

	/**
	 * 这个实例最终把工作簿写到哪里。
	 *
	 * <p>
	 * 无参构造写内部缓冲（配合 {@link #export()} 取字节）；带参构造写调用方给的流（配合
	 * {@link #exportToStream()}）。早期两个入口混用时会静默拿到空字节——{@code export()} 读的是内部
	 * 缓冲，而 Workbook 写的是外部流。现在 {@code export()} 发现目标不是内部缓冲会直接报错，
	 * 不再返回 0 字节。
	 */
	private final OutputStream target;

	ThreadLocal<Worksheet> localSheet = new ThreadLocal<>();

	protected static ThreadLocal<Integer> localOpenid = new ThreadLocal<>();

	public ExcelExporter() {
		this.target = os;
		this.workbook = new Workbook(os, "survey", "1.0");
	}

	public ExcelExporter(OutputStream outputStream) {
		if (outputStream == null) {
			throw new IllegalArgumentException("outputStream 不能为 null");
		}
		this.target = outputStream;
		this.workbook = new Workbook(outputStream, "survey", "1.0");
	}

	public Worksheet createSheet(String sheetName) {
		Worksheet worksheet = workbook.newWorksheet(sheetName);
		worksheet.fitToWidth((short) 10);
		worksheet.setFitToPage(true);
		localSheet.set(worksheet);
		rowIndexBySheet.put(sheetName, 1);
		return worksheet;
	}

	public void createHeader(List<String> columns) {
		Worksheet sheet = localSheet.get();
		for (int i = 0; i < columns.size(); i++) {
			sheet.value(0, i, columns.get(i));
		}
	}

	public void createRow(List<List<Object>> rows) {
		Worksheet sheet = localSheet.get();
		String sheetName = sheet.getName();
		int rowNum = rowIndexBySheet.get(sheetName);
		for (int r = 1; r <= rows.size(); r++) {
			List<Object> row = rows.get(r - 1);
			for (int c = 0; c < row.size(); c++) {
				Object value = row.get(c);
				if (value instanceof Integer) {
					sheet.value(r, c, (Number) value);
				}
				else if (value instanceof String) {
					sheet.value(r, c, (String) value);
				}
				else if (value != null) {
					sheet.value(r, c, value.toString());
				}
			}
			rowNum++;
		}
		rowIndexBySheet.put(sheetName, rowNum);
	}

	/**
	 * 收尾并返回字节。**只适用于无参构造**：带参构造写的是调用方的流，这里拿不到那份字节。
	 * @throws IllegalStateException 本实例是写外部流的（用 exportToStream()），或写盘失败
	 */
	public ByteArrayInputStream export() {
		if (this.target != this.os) {
			throw new IllegalStateException("本实例写的是外部流，请改用 exportToStream()；export() 只适用于无参构造");
		}
		try {
			this.workbook.finish();
		}
		catch (IOException e) {
			throw new IllegalStateException("导出 Excel 失败：" + e.getMessage(), e);
		}
		return new ByteArrayInputStream(this.os.toByteArray());
	}

	/** 收尾（把内容写进构造时给的流）。无参构造时内容进内部缓冲，用 {@link #export()} 取。 */
	public void exportToStream() {
		try {
			this.workbook.finish();
		}
		catch (IOException e) {
			throw new IllegalStateException("导出 Excel 失败：" + e.getMessage(), e);
		}
	}

	@Data
	@Accessors(chain = true)
	public static class Builder {

		private String sheetName = "Sheet1";

		private List<String> columns;

		private List<List<Object>> rows;

		private OutputStream outputStream;

		public ExcelExporter build() {
			ExcelExporter excelExporter;
			if (this.outputStream != null) {
				excelExporter = new ExcelExporter(this.outputStream);
			}
			else {
				excelExporter = new ExcelExporter();
			}
			removeEmptyColumn(SchemaHelper.getOpenIdColumnName(), SchemaHelper.localOpenId);
			removeEmptyColumn(SchemaHelper.getWechatNicknameColumnName(), SchemaHelper.localWechatNickname);
			removeEmptyColumn(SchemaHelper.getWechatAvatarColumnName(), SchemaHelper.localWechatAvatar);
			excelExporter.createSheet(this.sheetName);
			excelExporter.createRow(this.rows);
			excelExporter.createHeader(this.columns);

			return excelExporter;
		}

		private void removeEmptyColumn(String columnName, ThreadLocal<Boolean> present) {
			int columnIndex = this.columns.indexOf(columnName);
			if (!Boolean.TRUE.equals(present.get()) && columnIndex != -1) {
				this.columns.remove(columnIndex);
				this.rows.forEach(row -> row.remove(columnIndex));
			}
			present.remove();
		}

	}

}
