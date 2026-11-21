package cn.surveyking.server.core.uitls;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;





public class DateUtils {

	public static Date localDateTime2date(LocalDateTime in) {
		return Date.from(in.atZone(ZoneId.systemDefault()).toInstant());
	}

	public static LocalDateTime date2localDateTime(Date in) {
		return LocalDateTime.ofInstant(in.toInstant(), ZoneId.systemDefault());
	}

	/** 返回 当前日期是否在指定日期范围内；返回 当前日期是否在指定日期范围内 */
	public static boolean isBetween(Date current, Date start, Date end) {
		if (current.compareTo(start) >= 0 && current.compareTo(end) <= 0) {
			return true;
		}
		return false;
	}

}
