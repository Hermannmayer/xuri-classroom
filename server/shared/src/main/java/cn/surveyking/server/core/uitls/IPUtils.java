package cn.surveyking.server.core.uitls;

import javax.servlet.http.HttpServletRequest;
import java.util.regex.Pattern;

/**
 * 客户端 IP 的唯一解析入口。
 *
 * <p>
 * 背景：线上链路是 公网 → Lucky（宿主机进程，:200）→ 127.0.0.1:201 → docker → nginx → app。
 * nginx 的 {@code proxy_set_header X-Real-IP $remote_addr} 拿到的是 docker 网关（172.19.0.1），
 * 所以「X-Real-IP 优先」的写法会让所有公网用户对后端而言是同一个 IP：
 * 登录失败锁定变成「全站按用户名锁定」、未登录限流全站共用一个桶、审计里的 IP 失去溯源价值。
 *
 * <p>
 * 规则：优先取 {@code X-Forwarded-For} 中最左边的合法 IP（nginx 用 $proxy_add_x_forwarded_for 追加，
 * 真实客户端在首位）；其次 X-Real-IP；最后 remoteAddr。没有绝对可信的代理链信息时，
 * 这是能在单机反代场景下拿到真实来源的最小方案；要彻底可信需要配置可信代理列表。
 */
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
			// 优先返回第一个公网地址：反代链上私有地址通常是内网跳点，不是真实客户端
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