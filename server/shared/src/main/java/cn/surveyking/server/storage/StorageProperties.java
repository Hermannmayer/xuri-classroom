package cn.surveyking.server.storage;

import cn.surveyking.server.core.constant.LocalStorageNameStrategyEnum;
import cn.surveyking.server.core.constant.LocalStoragePathStrategyEnum;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.io.File;





@ConfigurationProperties("file-storage")
@Data
public class StorageProperties {




	@NestedConfigurationProperty
	private final LocalStorage local = new LocalStorage();

	public final ThumbImage thumbImage = new ThumbImage();








	private long maxPublicFileSizeMb = 10;


	private int maxPublicUploadsPerMinute = 10;


	private int maxPublicUploadsPerProjectPerMinute = 60;


	private long maxProjectStorageMb = 1024;


	private long maxTotalPublicStorageMb = 5120;


	private long maxImagePixels = 16000000L;








	private int maxImageWidth = 1920;







	private float imageQuality = 0.85f;

	@Data
	public class ThumbImage {




		private int width = 640;




		private int height = 480;

	}

	@Data
	public class LocalStorage {




		private String rootPath;





		private String pathStrategy = LocalStoragePathStrategyEnum.BY_ID.getStrategy();




		private String dateFormat = "yyyyMM" + File.separator + "dd";





		private String nameStrategy = LocalStorageNameStrategyEnum.SEQ_ADN_ORIGINAL_NAME.getStrategy();

	}

}
