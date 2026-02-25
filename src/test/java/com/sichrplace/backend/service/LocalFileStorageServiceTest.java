package com.sichrplace.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("LocalFileStorageService")
class LocalFileStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalFileStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new LocalFileStorageService(tempDir.toString());
    }

    @Nested
    @DisplayName("store")
    class Store {

        @Test
        @DisplayName("stores file and returns relative path")
        void storesFileAndReturnsPath() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "test-video.mp4", "video/mp4", "fake-video-content".getBytes());

            String path = storageService.store(file, "apartment-1");

            assertNotNull(path);
            assertTrue(path.startsWith("apartment-1/"));
            assertTrue(path.endsWith(".mp4"));
            assertTrue(storageService.exists(path));
        }

        @Test
        @DisplayName("generates UUID filename")
        void generatesUuidFilename() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "original.mp4", "video/mp4", "data".getBytes());

            String path = storageService.store(file, "dir");

            // Should NOT contain original filename
            assertFalse(path.contains("original"));
        }

        @Test
        @DisplayName("handles file without extension")
        void handlesNoExtension() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "noext", "application/octet-stream", "data".getBytes());

            String path = storageService.store(file, "dir");

            assertNotNull(path);
            assertFalse(path.endsWith("."));
        }

        @Test
        @DisplayName("throws on null file")
        void throwsOnNullFile() {
            assertThrows(IllegalArgumentException.class,
                    () -> storageService.store(null, "dir"));
        }

        @Test
        @DisplayName("throws on empty file")
        void throwsOnEmptyFile() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "empty.mp4", "video/mp4", new byte[0]);

            assertThrows(IllegalArgumentException.class,
                    () -> storageService.store(file, "dir"));
        }
    }

    @Nested
    @DisplayName("load")
    class Load {

        @Test
        @DisplayName("loads stored file")
        void loadsStoredFile() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "test.mp4", "video/mp4", "video-data".getBytes());
            String path = storageService.store(file, "load-test");

            Resource resource = storageService.load(path);

            assertNotNull(resource);
            assertTrue(resource.exists());
            assertTrue(resource.isReadable());
        }

        @Test
        @DisplayName("throws on non-existent file")
        void throwsOnMissing() {
            assertThrows(IllegalArgumentException.class,
                    () -> storageService.load("nonexistent/file.mp4"));
        }

        @Test
        @DisplayName("throws on path traversal attempt")
        void throwsOnPathTraversal() {
            assertThrows(SecurityException.class,
                    () -> storageService.load("../../etc/passwd"));
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("deletes existing file")
        void deletesExistingFile() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "del.mp4", "video/mp4", "data".getBytes());
            String path = storageService.store(file, "delete-test");
            assertTrue(storageService.exists(path));

            storageService.delete(path);

            assertFalse(storageService.exists(path));
        }

        @Test
        @DisplayName("does not throw on missing file")
        void noThrowOnMissing() {
            assertDoesNotThrow(() -> storageService.delete("missing/file.mp4"));
        }

        @Test
        @DisplayName("rejects path traversal")
        void rejectsPathTraversal() {
            assertThrows(SecurityException.class,
                    () -> storageService.delete("../../etc/important"));
        }
    }

    @Nested
    @DisplayName("exists")
    class Exists {

        @Test
        @DisplayName("returns true for stored file")
        void trueForStored() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "ex.mp4", "video/mp4", "data".getBytes());
            String path = storageService.store(file, "exists-test");

            assertTrue(storageService.exists(path));
        }

        @Test
        @DisplayName("returns false for missing file")
        void falseForMissing() {
            assertFalse(storageService.exists("nope/missing.mp4"));
        }

        @Test
        @DisplayName("returns false for path traversal")
        void falseForTraversal() {
            assertFalse(storageService.exists("../../etc/passwd"));
        }
    }

    @Test
    @DisplayName("constructor creates root directory")
    void constructorCreatesRootDir() {
        Path newRoot = tempDir.resolve("brand-new-dir");
        assertFalse(Files.exists(newRoot));

        new LocalFileStorageService(newRoot.toString());

        assertTrue(Files.exists(newRoot));
    }
}
