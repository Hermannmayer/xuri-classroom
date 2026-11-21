package cn.surveyking.server.core.importer;

import org.springframework.util.StringUtils;

import java.util.Locale;




public enum ImportKind {

	word, excel, text, json, auto;

	public static ImportKind from(String value) {
		if (!StringUtils.hasText(value)) {
			return auto;
		}
		try {
			return valueOf(value.trim().toLowerCase(Locale.ROOT));
		}
		catch (IllegalArgumentException e) {
			return auto;
		}
	}

}
