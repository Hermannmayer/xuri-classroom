package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 首页趋势图（GET /api/dashboard/trend?days=14）。
 *
 * <p>五个数组<b>等长且按下标对齐</b>：{@code days} 是日期轴，其余四个是同一批日期的值，
 * 前端直接 {@code days.map((d, i) => ...)} 就能画折线，不需要再按日期 join。
 *
 * <p>补空规则（见 DashboardStatsServiceImpl）：
 * <ul>
 * <li>按<b>自然日</b>分组（DATE(create_at)），不是滚动 24 小时；</li>
 * <li>当天没有数据补 0；{@code avgScores} 当天没有带分数的答卷补 {@code null}，
 * 折线在那里断开，而不是把 0 分画成一个真实的低点；</li>
 * <li>窗口是「含今天在内的最近 N 个自然日」，N 默认 14、上限 90。</li>
 * </ul>
 *
 * <p>口径与 {@link DashboardOverviewView.Answers} 一致：只算正式交卷（temp_save=1）并排除练习记录；
 * {@code graded} 与 {@code answers} 同一天口径（按交卷日），表示这批卷子里已经批完的数量，
 * 不是按批改时间；{@code activeUsers} 是当天交过卷的去重人数（匿名答卷没有 create_by，不计入）。
 *
 * @author be-stats
 */
@Data
public class DashboardTrendView {

	/** 日期轴，格式 MM-dd，从窗口第一天到今天 */
	private List<String> days = new ArrayList<>();

	/** 当天交卷数 */
	private List<Long> answers = new ArrayList<>();

	/** 当天交的卷子里已批改完的数量 */
	private List<Long> graded = new ArrayList<>();

	/** 当天交的卷子的平均分；当天没有带分数的答卷时为 null */
	private List<Double> avgScores = new ArrayList<>();

	/** 当天交过卷的去重人数 */
	private List<Long> activeUsers = new ArrayList<>();

}
