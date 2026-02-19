package com.sichrplace.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Comparator;

/**
 * Logs the current schema migration version at application startup.
 *
 * Scans the classpath for migration scripts in db/migrations/ and reports
 * the highest version number found. This gives developers and tutors
 * immediate visibility into which schema version the running application
 * expects.
 *
 * Runs after DataSeeder (@Order(2) vs DataSeeder's @Order(1)).
 */
@Component
@Order(2)
public class SchemaVersionLogger implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaVersionLogger.class);
    private static final String MIGRATION_PATTERN = "classpath*:db/migrations/V*.sql";

    @Override
    public void run(String... args) {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources(MIGRATION_PATTERN);

            if (resources.length == 0) {
                log.info("SchemaVersionLogger: No migration scripts found in db/migrations/");
                return;
            }

            String[] scriptNames = Arrays.stream(resources)
                    .map(Resource::getFilename)
                    .filter(name -> name != null && name.startsWith("V"))
                    .sorted(Comparator.naturalOrder())
                    .toArray(String[]::new);

            if (scriptNames.length == 0) {
                log.info("SchemaVersionLogger: No versioned migration scripts found.");
                return;
            }

            String latestScript = scriptNames[scriptNames.length - 1];
            String version = extractVersion(latestScript);

            log.info("═══════════════════════════════════════════════════════");
            log.info("  Schema migration version: {}", version);
            log.info("  Latest script: {}", latestScript);
            log.info("  Total migration scripts: {}", scriptNames.length);
            log.info("═══════════════════════════════════════════════════════");

            if (log.isDebugEnabled()) {
                log.debug("  All migration scripts:");
                for (String name : scriptNames) {
                    log.debug("    - {}", name);
                }
            }

        } catch (Exception e) {
            log.warn("SchemaVersionLogger: Could not scan migration scripts: {}", e.getMessage());
        }
    }

    /**
     * Extracts the version prefix from a migration filename.
     * E.g., "V001__initial_schema_mssql.sql" → "V001"
     */
    private String extractVersion(String filename) {
        int underscoreIdx = filename.indexOf("__");
        if (underscoreIdx > 0) {
            return filename.substring(0, underscoreIdx);
        }
        // Fallback: return everything before .sql
        int dotIdx = filename.indexOf('.');
        return dotIdx > 0 ? filename.substring(0, dotIdx) : filename;
    }
}
