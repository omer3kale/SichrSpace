package com.sichrplace.service;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    /**
     * Upload a file to MinIO
     */
    public String uploadFile(MultipartFile file, String bucket, String folder) {
        try {
            String fileName = folder + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(fileName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

            log.info("File uploaded: {}/{}", bucket, fileName);
            return minioEndpoint + "/" + bucket + "/" + fileName;
        } catch (Exception e) {
            log.error("File upload failed", e);
            throw new RuntimeException("File upload failed: " + e.getMessage());
        }
    }

    /**
     * Generate a pre-signed URL for secure file access
     */
    public String getPresignedUrl(String bucket, String objectName, int expiryMinutes) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(objectName)
                    .expiry(expiryMinutes, TimeUnit.MINUTES)
                    .build());
        } catch (Exception e) {
            log.error("Failed to generate presigned URL", e);
            throw new RuntimeException("Failed to generate presigned URL: " + e.getMessage());
        }
    }

    /**
     * Download a file from MinIO
     */
    public InputStream downloadFile(String bucket, String objectName) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            log.error("File download failed", e);
            throw new RuntimeException("File download failed: " + e.getMessage());
        }
    }

    /**
     * Delete a file from MinIO
     */
    public void deleteFile(String bucket, String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .build());
            log.info("File deleted: {}/{}", bucket, objectName);
        } catch (Exception e) {
            log.error("File deletion failed", e);
            throw new RuntimeException("File deletion failed: " + e.getMessage());
        }
    }
}
