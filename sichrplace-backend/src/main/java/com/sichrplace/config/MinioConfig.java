package com.sichrplace.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class MinioConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket.apartments}")
    private String apartmentsBucket;

    @Value("${minio.bucket.videos}")
    private String videosBucket;

    @Value("${minio.bucket.profiles}")
    private String profilesBucket;

    @Bean
    public MinioClient minioClient() {
        MinioClient client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();

        // Create buckets if they don't exist
        try {
            createBucketIfNotExists(client, apartmentsBucket);
            createBucketIfNotExists(client, videosBucket);
            createBucketIfNotExists(client, profilesBucket);
            log.info("MinIO buckets initialized successfully");
        } catch (Exception e) {
            log.warn("MinIO bucket initialization failed (will retry on first use): {}", e.getMessage());
        }

        return client;
    }

    private void createBucketIfNotExists(MinioClient client, String bucket) throws Exception {
        if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            log.info("Created MinIO bucket: {}", bucket);
        }
    }
}
