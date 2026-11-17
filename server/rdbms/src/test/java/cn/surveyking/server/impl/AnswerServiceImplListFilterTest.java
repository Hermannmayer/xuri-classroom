package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.AnonymousIdentityService;
import cn.surveyking.server.service.AnswerPdfJobService;
import cn.surveyking.server.service.ClassResourceService;
import cn.surveyking.server.service.FileService;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 答卷列表筛选（姓名模糊 + 分数段）的 SQL 形状回归。
 *
 * <p>为什么要断言 SQL 而不是造数据跑查询：这两个条件最容易出的错都不是「结果不对」，而是
 * 「条件没加」或「加错了层级」——比如把姓名两个分支的 OR 直接摊平，会连项目 / 班级 / 权限条件
 * 一起短路，变成「输入一个名字就能翻别人的答卷」。这类错只有看生成的 SQL 片段才看得出来，
 * 所以这里用 mock 的 Mapper 把 {@link AnswerServiceImpl#listAnswer} 真正生成的 Wrapper 抓下来检查。
 *
 * <p>纯 Mockito，不启动 Spring、不连库（与 {@code ApiTokenServiceImplTest} 同一套路）。
 */
class AnswerServiceImplListFilterTest {

	private final ProjectMapper projectMapper = mock(ProjectMapper.class);

	private final UserMapper userMapper = mock(UserMapper.class);

	private final AnswerViewMapper answerViewMapper = mock(AnswerViewMapper.class);

	private final AnswerAccessGuard answerAccessGuard = mock(AnswerAccessGuard.class);

	private final AnswerItemProjector answerItemProjector = mock(AnswerItemProjector.class);

	private final AnswerItemMapper answerItemMapper = mock(AnswerItemMapper.class);

	private final AnswerItemAnswerRebuilder answerItemAnswerRebuilder = mock(AnswerItemAnswerRebuilder.class);

	private final AnswerSchemaDecorator answerSchemaDecorator = mock(AnswerSchemaDecorator.class);

	private final AnswerExporter answerExporter = mock(AnswerExporter.class);

	private final AnswerPdfJobService answerPdfJobService = mock(AnswerPdfJobService.class);

	private final FileService fileService = mock(FileService.class);

	private final AnswerSubmitIdempotency answerSubmitIdempotency = mock(AnswerSubmitIdempotency.class);

	private final AnswerUploadParser answerUploadParser = mock(AnswerUploadParser.class);

	private final AnswerScoringService answerScoringService = mock(AnswerScoringService.class);

	private final AnswerMetaEnricher answerMetaEnricher = mock(AnswerMetaEnricher.class);

	private final ExerciseAnswerService exerciseAnswerService = mock(ExerciseAnswerService.class);

	private final AnswerAttemptAllocator answerAttemptAllocator = mock(AnswerAttemptAllocator.class);

	private final ClassResourceService classResourceService = mock(ClassResourceService.class);

	private final AnonymousIdentityService anonymousIdentityService = mock(AnonymousIdentityService.class);

	/** Mapper 只用来接住 selectPage 的 Wrapper */
	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AnswerServiceImpl service = new TestableAnswerService(projectMapper, userMapper, answerViewMapper,
			answerAccessGuard, answerItemProjector, answerItemMapper, answerItemAnswerRebuilder, answerSchemaDecorator,
			answerExporter, answerPdfJobService, fileService, answerSubmitIdempotency, answerUploadParser,
			answerScoringService, answerMetaEnricher, exerciseAnswerService, answerAttemptAllocator,
			classResourceService, anonymousIdentityService, answerMapper);

	/** 最近一次 listAnswer 生成的 Wrapper（SQL 与绑定参数都从这里读） */
	private Wrapper<Answer> lastWrapper;

	/**
	 * 单测不启动 MyBatis，Lambda 缓存是空的：{@code Answer::getExamScore} 解析不出列名。
	 * 这里手动登记一次表元数据（与 {@code ApiTokenServiceImplTest} 同样的处理）。
	 */
	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				Answer.class);
		LambdaUtils.installCache(tableInfo);
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("姓名：命中答卷上的姓名快照（新数据走这条路）")
	void nameFilterMatchesAnswererNameSnapshot() {
		String sql = sqlOf(query(q -> q.setCreateByName("王小明")));

		assertTrue(sql.contains("answerer_name like"), sql);
		assertTrue(params().containsValue("%王小明%"), params().toString());
	}

	@Test
	@DisplayName("姓名：老答卷没有快照，靠 t_user.name 反查 create_by 也能命中")
	void nameFilterFallsBackToUserTable() {
		String sql = sqlOf(query(q -> q.setCreateByName("王小明")));

		// 子查询必须钉在 create_by 上：答卷上没有姓名快照时，这是唯一的身份线索
		assertTrue(sql.contains("create_by in (select id from t_user where name like"), sql);
		assertTrue(params().containsValue("%王小明%"), params().toString());
	}

	@Test
	@DisplayName("姓名：两个分支用括号 OR 成一个整体，不能把项目/权限条件短路掉")
	void nameFilterIsNestedInsideOneAnd() {
		String sql = sqlOf(query(q -> q.setCreateByName("王")));

		int nameAt = sql.indexOf("answerer_name like");
		assertTrue(nameAt > 0, sql);
		// 名字条件前面必须紧跟一层左括号：否则 OR 会和外面的 AND 平铺，项目 / 班级 / 权限条件会被短路
		String before = sql.substring(0, nameAt).trim();
		assertEquals("(", before.substring(before.length() - 1), sql);
		assertTrue(sql.toLowerCase(Locale.ROOT).contains(" or "), sql);
	}

	@Test
	@DisplayName("姓名：搜索框里的 % 和 _ 当字面量，不能变成通配所有人")
	void nameFilterEscapesLikeWildcards() {
		sqlOf(query(q -> q.setCreateByName("张_%")));

		// 期望绑定值是「%张\_\%%」：_ 与 % 被反斜杠转义成字面量，两头的 % 仍是模糊匹配
		assertTrue(params().containsValue("%张\\_\\%%"), params().toString());
	}

	@Test
	@DisplayName("分数段：含边界（>= / <=），不是开区间")
	void scoreRangeUsesInclusiveBounds() {
		String sql = sqlOf(query(q -> {
			q.setMinScore(60.0);
			q.setMaxScore(89.5);
		}));

		assertTrue(sql.contains("exam_score >= "), sql);
		assertTrue(sql.contains("exam_score <= "), sql);
		// 写成 > / < 就成了开区间，60 分及格的人会被漏掉
		assertFalse(sql.contains("exam_score > "), sql);
		assertFalse(sql.contains("exam_score < "), sql);
		assertTrue(params().containsValue(60.0), params().toString());
		assertTrue(params().containsValue(89.5), params().toString());
	}

	@Test
	@DisplayName("分数段：只给下限时不加上限条件")
	void scoreLowerBoundOnly() {
		String sql = sqlOf(query(q -> q.setMinScore(60.0)));

		assertTrue(sql.contains("exam_score >= "), sql);
		assertFalse(sql.contains("exam_score <="), sql);
	}

	@Test
	@DisplayName("分数段：只给上限时不加下限条件")
	void scoreUpperBoundOnly() {
		String sql = sqlOf(query(q -> q.setMaxScore(59.0)));

		assertTrue(sql.contains("exam_score <= "), sql);
		assertFalse(sql.contains("exam_score >="), sql);
	}

	@Test
	@DisplayName("条件全空：姓名与分数段一条 SQL 都不加")
	void emptyFiltersAddNoSql() {
		String sql = sqlOf(query(q -> {
		})).toLowerCase(Locale.ROOT);

		assertFalse(sql.contains("answerer_name"), sql);
		assertFalse(sql.contains("t_user"), sql);
		assertFalse(sql.contains("exam_score"), sql);
	}

	// ------ 辅助

	/**
	 * 跑一次 {@code listAnswer} 并把生成的 Wrapper 抓下来。
	 *
	 * <p>项目一律 mock 成「可管理」（{@code canManageProject=true}），否则 wrapper 里会多一条
	 * {@code create_by = 当前用户}，把要断言的片段挤在一起。
	 */
	private String sqlOf(AnswerQuery query) {
		when(answerAccessGuard.canManageProject("p1")).thenReturn(true);
		when(projectMapper.selectById("p1")).thenReturn(new Project());
		when(answerViewMapper.toView(anyList())).thenReturn(new ArrayList<>());

		service.listAnswer(query);

		ArgumentCaptor<Wrapper> captor = ArgumentCaptor.forClass(Wrapper.class);
		verify(answerMapper, atLeastOnce()).selectPage(any(), captor.capture());
		lastWrapper = captor.getValue();
		return lastWrapper.getSqlSegment();
	}

	private Map<String, Object> params() {
		assertTrue(lastWrapper instanceof AbstractWrapper, "应该是 MyBatis-Plus 的 Wrapper");
		return ((AbstractWrapper<?, ?, ?>) lastWrapper).getParamNameValuePairs();
	}

	private static AnswerQuery query(Consumer<AnswerQuery> customizer) {
		AnswerQuery query = new AnswerQuery();
		query.setProjectId("p1");
		customizer.accept(query);
		return query;
	}

	/** 只为把 protected 的 baseMapper 传进去：ServiceImpl 没有公开 setter */
	private static final class TestableAnswerService extends AnswerServiceImpl {

		private TestableAnswerService(ProjectMapper projectMapper, UserMapper userMapper,
				AnswerViewMapper answerViewMapper, AnswerAccessGuard answerAccessGuard,
				AnswerItemProjector answerItemProjector, AnswerItemMapper answerItemMapper,
				AnswerItemAnswerRebuilder answerItemAnswerRebuilder, AnswerSchemaDecorator answerSchemaDecorator,
				AnswerExporter answerExporter, AnswerPdfJobService answerPdfJobService, FileService fileService,
				AnswerSubmitIdempotency answerSubmitIdempotency, AnswerUploadParser answerUploadParser,
				AnswerScoringService answerScoringService, AnswerMetaEnricher answerMetaEnricher,
				ExerciseAnswerService exerciseAnswerService, AnswerAttemptAllocator answerAttemptAllocator,
				ClassResourceService classResourceService, AnonymousIdentityService anonymousIdentityService,
				AnswerMapper answerMapper) {
			super(projectMapper, userMapper, answerViewMapper, answerAccessGuard, answerItemProjector,
					answerItemMapper, answerItemAnswerRebuilder, answerSchemaDecorator, answerExporter,
					answerPdfJobService, fileService, answerSubmitIdempotency, answerUploadParser, answerScoringService,
					answerMetaEnricher, exerciseAnswerService, answerAttemptAllocator, classResourceService,
					anonymousIdentityService);
			this.baseMapper = answerMapper;
		}

	}

}
