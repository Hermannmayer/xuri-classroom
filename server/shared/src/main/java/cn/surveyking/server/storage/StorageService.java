package cn.surveyking.server.storage;

import java.io.IOException;
import java.io.InputStream;





public interface StorageService {

	default void init() {
	}

	void uploadFile(InputStream file, String path);




	// StorePath uploadImage(UploadFileRequest request);

	InputStream downloadAsStream(String filePath);

	void deleteFile(String filePath);

	String getThumbImageFilePath(String filePath);

	InputStream generateThumbImage(InputStream inputStream) throws IOException;

}
