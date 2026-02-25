package com.sichrplace.backend.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Abstraction for file storage operations.
 * Default implementation stores files on local disk.
 * Can be replaced with S3/MinIO/Azure Blob by swapping the bean.
 */
public interface FileStorageService {

    /**
     * Store a file and return the internal storage path (never exposed to clients).
     *
     * @param file      the uploaded file
     * @param directory sub-directory within the storage root (e.g. "videos")
     * @return the relative storage path for later retrieval
     */
    String store(MultipartFile file, String directory);

    /**
     * Load a file as a Spring Resource for streaming.
     *
     * @param storagePath the path returned by {@link #store}
     * @return a Resource that can be streamed
     * @throws IllegalArgumentException if the file does not exist
     */
    Resource load(String storagePath);

    /**
     * Delete a file from storage.
     *
     * @param storagePath the path returned by {@link #store}
     */
    void delete(String storagePath);

    /**
     * Check if a file exists in storage.
     *
     * @param storagePath the path returned by {@link #store}
     * @return true if the file exists
     */
    boolean exists(String storagePath);
}
