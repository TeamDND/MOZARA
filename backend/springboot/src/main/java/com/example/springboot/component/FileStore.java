package com.example.springboot.component;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FileStore {

    private final AmazonS3 amazonS3;

    /**
     * 탈모 검사용 이미지 업로드
     * 파일명 형식: yyyyMMdd_HHmmss_{username}_{viewType}_{random}.jpg
     *
     * @param multipartFile 업로드할 파일
     * @param bucket S3 버킷 이름
     * @param folder S3 폴더 경로 (예: "hair-loss-analysis")
     * @param username 사용자 이름
     * @param viewType 뷰 타입 (top 또는 side)
     * @return S3에 저장된 파일의 전체 URL
     */
    public String storeHairLossImage(MultipartFile multipartFile, String bucket, String folder,
                                     String username, String viewType) throws IOException {
        if (multipartFile.isEmpty()) {
            return null;
        }

        String originalFilename = multipartFile.getOriginalFilename();
        String storeFileName = createHairLossFileName(originalFilename, username, viewType);
        String fullPath = folder + "/" + storeFileName;

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(multipartFile.getSize());
        metadata.setContentType(multipartFile.getContentType());

        amazonS3.putObject(bucket, fullPath, multipartFile.getInputStream(), metadata);

        return amazonS3.getUrl(bucket, fullPath).toString();
    }

    /**
     * 모발 검사용 이미지 업로드
     * 파일명 형식: yyyyMMdd_HHmmss_{username}_{random}.jpg
     *
     * @param multipartFile 업로드할 파일
     * @param bucket S3 버킷 이름
     * @param folder S3 폴더 경로 (예: "hair-damage-analysis")
     * @param username 사용자 이름
     * @return S3에 저장된 파일의 전체 URL
     */
    public String storeHairDamageImage(MultipartFile multipartFile, String bucket, String folder,
                                       String username) throws IOException {
        if (multipartFile.isEmpty()) {
            return null;
        }

        String originalFilename = multipartFile.getOriginalFilename();
        String storeFileName = createHairDamageFileName(originalFilename, username);
        String fullPath = folder + "/" + storeFileName;

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(multipartFile.getSize());
        metadata.setContentType(multipartFile.getContentType());

        amazonS3.putObject(bucket, fullPath, multipartFile.getInputStream(), metadata);

        return amazonS3.getUrl(bucket, fullPath).toString();
    }

    /**
     * S3에서 파일 삭제
     *
     * @param fileUrl 삭제할 파일의 전체 URL
     * @param bucket S3 버킷 이름
     */
    public void deleteFile(String fileUrl, String bucket) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }
        try {
            URL url = new URL(fileUrl);
            String key = url.getPath().substring(1); // Remove the leading slash
            amazonS3.deleteObject(bucket, key);
        } catch (Exception e) {
            // Log the exception
            System.err.println("S3 파일 삭제 실패: " + e.getMessage());
        }
    }

    /**
     * 탈모 검사용 파일명 생성
     * 형식: yyyyMMdd_HHmmss_{username}_{viewType}_{random}.ext
     */
    private String createHairLossFileName(String originalFilename, String username, String viewType) {
        String ext = extractExt(originalFilename);
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String randomStr = UUID.randomUUID().toString().substring(0, 6);

        return String.format("%s_%s_%s_%s.%s", timestamp, username, viewType, randomStr, ext);
    }

    /**
     * 모발 검사용 파일명 생성
     * 형식: yyyyMMdd_HHmmss_{username}_{random}.ext
     */
    private String createHairDamageFileName(String originalFilename, String username) {
        String ext = extractExt(originalFilename);
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String randomStr = UUID.randomUUID().toString().substring(0, 6);

        return String.format("%s_%s_%s.%s", timestamp, username, randomStr, ext);
    }

    /**
     * 파일 확장자 추출
     */
    private String extractExt(String originalFilename) {
        int pos = originalFilename.lastIndexOf(".");
        return originalFilename.substring(pos + 1);
    }
}
