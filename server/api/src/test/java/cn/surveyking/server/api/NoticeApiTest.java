package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.NoticeQuery;
import cn.surveyking.server.domain.dto.NoticeReadRequest;
import cn.surveyking.server.domain.dto.NoticeRequest;
import cn.surveyking.server.domain.dto.NoticeView;
import cn.surveyking.server.service.NoticeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 公告接口的契约回归：路径、参数名、返回结构。
 *
 * <p>公告中心与顶栏铃铛直接按这些路径调用，改路径 / 改参数名等于破坏前端契约，
 * 所以这里把 {@code /api/notice/**} 的形状钉死在测试里。
 *
 * <p>standalone MockMvc + mock service：不启动 Spring 上下文、不连库，没配 {@code S2_TEST_DB_URL} 也会跑。
 */
class NoticeApiTest {

	private NoticeService noticeService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		noticeService = mock(NoticeService.class);
		// ${api.prefix} 在 standalone 环境里没有 application.yml，手动给成线上的 /api
		mockMvc = MockMvcBuilders.standaloneSetup(new NoticeApi(noticeService))
				.addPlaceholderValue("api.prefix", "/api").build();
	}

	@Test
	@DisplayName("GET /api/notice/list -> {total, list}")
	void list() throws Exception {
		when(noticeService.list(any(NoticeQuery.class))).thenReturn(new PaginationResponse<>(0L, new ArrayList<>()));
		mockMvc.perform(get("/api/notice/list").param("current", "1").param("pageSize", "20").param("onlyUnread", "true"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
	}

	@Test
	@DisplayName("GET /api/notice/unread-count -> {count}")
	void unreadCount() throws Exception {
		when(noticeService.unreadCount()).thenReturn(3L);
		mockMvc.perform(get("/api/notice/unread-count")).andExpect(status().isOk())
				.andExpect(jsonPath("$.count").value(3));
	}

	@Test
	@DisplayName("GET /api/notice?id= 与 /api/notice/detail?id= 等价")
	void detail() throws Exception {
		NoticeView view = new NoticeView();
		view.setId("n1");
		view.setTitle("关于本周停课的通知");
		when(noticeService.detail("n1")).thenReturn(view);
		mockMvc.perform(get("/api/notice").param("id", "n1")).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("n1"));
		mockMvc.perform(get("/api/notice/detail").param("id", "n1")).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("n1"));
	}

	@Test
	@DisplayName("POST /api/notice/read 接受 {ids: []}")
	void read() throws Exception {
		mockMvc.perform(post("/api/notice/read").contentType(MediaType.APPLICATION_JSON)
				.content("{\"ids\":[\"n1\",\"n2\"]}")).andExpect(status().isOk());
		verify(noticeService).read(any(NoticeReadRequest.class));
	}

	@Test
	@DisplayName("POST /api/notice/create -> {id}")
	void create() throws Exception {
		when(noticeService.create(any(NoticeRequest.class))).thenReturn("new-id");
		mockMvc.perform(post("/api/notice/create").contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"停课通知\",\"content\":\"<p>周四停课</p>\",\"audience\":\"all\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.id").value("new-id"));
	}

	@Test
	@DisplayName("POST /api/notice/publish|archive|delete 都从 body 读 id")
	void publishArchiveDelete() throws Exception {
		mockMvc.perform(post("/api/notice/publish").contentType(MediaType.APPLICATION_JSON).content("{\"id\":\"n1\"}"))
				.andExpect(status().isOk());
		mockMvc.perform(post("/api/notice/archive").contentType(MediaType.APPLICATION_JSON).content("{\"id\":\"n1\"}"))
				.andExpect(status().isOk());
		mockMvc.perform(post("/api/notice/delete").contentType(MediaType.APPLICATION_JSON).content("{\"id\":\"n1\"}"))
				.andExpect(status().isOk());
		verify(noticeService).publish("n1");
		verify(noticeService).archive("n1");
		verify(noticeService).delete("n1");
	}

}
