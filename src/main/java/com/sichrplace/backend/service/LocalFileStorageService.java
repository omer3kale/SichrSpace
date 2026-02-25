package com.sichrplace.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Stores files on the local filesystem.
 * Suitable for development and small-scale production.
 * For production at scale, replace with an S3/MinIO implementation.
 */
@Slf4j
@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path rootLocation;

    public LocalFileStorageService(
            @Value("${app.video.storage-path:./data/videos}") String storagePath) {
        this.rootLocation = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootLocation);
            log.info("File storage root: {}", rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not create storage directory: " + rootLocation, e);
        }
    }

    @Override
    public String store(MultipartFile file, String directory) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }

        String storedFilename = UUID.randomUUID() + extension;
        String relativePath = directory + "/" + storedFilename;

        try {
            Path targetDir = rootLocation.resolve(directory);
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(storedFilename).normalize();

            // Security check: prevent path traversal
            if (!targetPath.startsWith(rootLocation)) {
                throw new SecurityException("Cannot store file outside storage root");
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored file: {} ({} bytes)", relativePath, file.getSize());
            return relativePath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + relativePath, e);
        }
    }

    @Override
    public Resource load(String storagePath) {
        try {
            Path filePath = rootLocation.resolve(storagePath).normalize();

            // Security check: prevent path traversal
            if (!filePath.startsWith(rootLocation)) {
                throw new SecurityException("Cannot access file outside storage root");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new IllegalArgumentException("File not found: " + storagePath);
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Invalid file path: " + storagePath, e);
        }
    }

    @Override
    public void delete(String storagePath) {
        try {
            Path filePath = rootLocation.resolve(storagePath).normalize();

            // Security check: prevent path traversal
            if (!filePath.startsWith(rootLocation)) {
                throw new SecurityException("Cannot delete file outside storage root");
            }

            if (Files.deleteIfExists(filePath)) {
                log.info("Deleted file: {}", storagePath);
            } else {
                log.warn("File not found for deletion: {}", storagePath);
            }
        } catch (IOException e) {
            log.error("Failed to delete file: {}", storagePath, e);
        }
    }

    @Override
    public boolean exists(String storagePath) {
        Path filePath = rootLocation.resolve(storagePath).normalize();
        if (!filePath.startsWith(rootLocation)) {
            return false;
        }
        return Files.exists(filePath);
    }
}
