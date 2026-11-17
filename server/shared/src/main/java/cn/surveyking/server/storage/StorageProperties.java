package cn.surveyking.server.storage;

import cn.surveyking.server.core.constant.LocalStorageNameStrategyEnum;
import cn.surveyking.server.core.constant.LocalStoragePathStrategyEnum;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.io.File;

/**
 * @author javahuang
 * @date 2021/9/7
 */
@ConfigurationProperties("file-storage")
@Data
public class StorageProperties {

	/**
	 * 本次存储配置
	 */
	@NestedConfigurationProperty
	private final LocalStorage local = new LocalStorage();

	public final ThumbImage thumbImage = new ThumbImage();

	/**
	 * 公开问卷单文件默认最大体积，单位 MB。
	 *
	 * <p>从 20 收到 10：图片落盘前会先等比缩放并重新编码，2K/4K 截图压完通常不到 1MB，
	 * 10MB 足够覆盖 PDF、Office、压缩包这类不该动的内容；再大的基本是整段录屏或素材包。
	 * 注意它也同时是「单题 maxFileSize」的天花板，见 FileServiceImpl#toBytes。
	 */
	private long maxPublicFileSizeMb = 10;

	/** 单个客户端每分钟最多上传文件数 */
	private int maxPublicUploadsPerMinute = 10;

	/** 单个项目每分钟最多上传文件数 */
	private int maxPublicUploadsPerProjectPerMinute = 60;

	/** 单个项目附件存储上限，单位 MB */
	private long maxProjectStorageMb = 1024;

	/** 所有公开问卷附件的总存储上限，单位 MB */
	private long maxTotalPublicStorageMb = 5120;

	/** 允许生成缩略图的最大像素数 */
	private long maxImagePixels = 16000000L;

	/**
	 * 图片落盘前的最大宽度，单位像素；只有超过这个宽度才等比缩放。
	 *
	 * <p>取 1920 而不是 1280：签名题的画布是 1280 宽，手写笔迹一旦被重采样就会发虚；
	 * 1080P/1440P 的显示器截图和手机竖拍照片也都在 1920 以内，原样保留即可。
	 * 真正会被缩小的只有 2K/4K 截图——而它们正是把磁盘占满的那批。
	 */
	private int maxImageWidth = 1920;

	/**
	 * JPEG 重新编码质量，取值 0~1，只对 jpg/jpeg 生效（png/bmp/wbmp 另有格式策略）。
	 *
	 * <p>0.85：实测比 0.9 小一成左右，肉眼几乎看不出差别；再往下（0.6 以下）题目截图上的
	 * 小字会糊，影响老师批改。配置写错（<=0 或 >1）时 FileServiceImpl 会回落到默认值。
	 */
	private float imageQuality = 0.85f;

	@Data
	public class ThumbImage {

		/**
		 * 生成的缩略图的宽度
		 */
		private int width = 640;

		/**
		 * 生成的缩略图的高度
		 */
		private int height = 480;

	}

	@Data
	public class LocalStorage {

		/**
		 * 本次存储目录的根目录
		 */
		private String rootPath;

		/**
		 * 路劲策略： 1. byNo:所有文件存储在 rootPath 下 2. byId:按照项目的short-id分文件夹存储,例如 rootPath/RyP2rR
		 * 3. byDate:按照上传日期存储，例如 rootPath/2022/06/01
		 */
		private String pathStrategy = LocalStoragePathStrategyEnum.BY_ID.getStrategy();

		/**
		 * 日期格式
		 */
		private String dateFormat = "yyyyMM" + File.separator + "dd";

		/**
		 * 文件名策略 1. seqAndOriginalName: 序列号加原文件名 2. originalNameAndSeq: 原文件名+序列号 3. Seq:
		 * 序列号（项目启动时间戳的自增） 4. UUID: 去除短杠'-'的UUID
		 */
		private String nameStrategy = LocalStorageNameStrategyEnum.SEQ_ADN_ORIGINAL_NAME.getStrategy();

	}

}
