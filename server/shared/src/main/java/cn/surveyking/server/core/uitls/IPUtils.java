package cn.surveyking.server.core.uitls;

import jakarta.servlet.http.HttpServletRequest;
import java.util.regex.Pattern;















public final class IPUtils {

	private static final Pattern IPV4 = Pattern
			.compile("^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$");

	private static final Pattern IPV6 = Pattern.compile("^[0-9a-fA-F:]{2,45}$");

	private IPUtils() {
	}

	public static String getClientIpAddress(HttpServletRequest request) {
		if (request == null) {
			return null;
		}
		String fromForwarded = firstUsable(request.getHeader("X-Forwarded-For"));
		if (fromForwarded != null) {
			return fromForwarded;
		}
		String realIp = request.getHeader("X-Real-IP");
		if (isValid(realIp)) {
			return realIp.trim();
		}
		return request.getRemoteAddr();
	}

	private static String firstUsable(String forwardedFor) {
		if (forwardedFor == null || forwardedFor.isEmpty()) {
			return null;
		}
		String firstPrivate = null;
		for (String part : forwardedFor.split(",")) {
			if (!isValid(part)) {
				continue;
			}
			String ip = part.trim();
			if (firstPrivate == null) {
				firstPrivate = ip;
			}

			if (!isPrivate(ip)) {
				return ip;
			}
		}
		return firstPrivate;
	}

	private static boolean isValid(String raw) {
		if (raw == null) {
			return false;
		}
		String ip = raw.trim();
		if (ip.isEmpty() || ip.length() > 45 || "unknown".equalsIgnoreCase(ip)) {
			return false;
		}
		return IPV4.matcher(ip).matches() || IPV6.matcher(ip).matches();
	}

	private static boolean isPrivate(String ip) {
		if (ip.startsWith("10.") || ip.startsWith("127.") || ip.startsWith("169.254.") || ip.startsWith("192.168.")) {
			return true;
		}
		if (ip.startsWith("172.")) {
			int second = parseSecondOctet(ip);
			return second >= 16 && second <= 31;
		}
		if (ip.startsWith("::1") || ip.startsWith("fc") || ip.startsWith("fd") || ip.toLowerCase().startsWith("fe80")) {
			return true;
		}
		return false;
	}

	private static int parseSecondOctet(String ip) {
		int firstDot = ip.indexOf('.');
		if (firstDot < 0) {
			return -1;
		}
		int secondDot = ip.indexOf('.', firstDot + 1);
		if (secondDot < 0) {
			return -1;
		}
		try {
			return Integer.parseInt(ip.substring(firstDot + 1, secondDot));
		}
		catch (NumberFormatException e) {
			return -1;
		}
	}

}