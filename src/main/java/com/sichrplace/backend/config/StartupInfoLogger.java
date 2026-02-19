package com.sichrplace.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Logs essential startup information for debugging and observability.
 *
 * Runs at startup (@Order(0), before DataSeeder and SchemaVersionLogger)
 * and prints:
 * - Active Spring profiles
 * - Database URL (with password masked)
 * - Hibernate dialect and ddl-auto mode
 * - Connection pool name
 *
 * This helps developers and tutors quickly verify which environment
 * is active without digging through configuration files.
 */
@Component
@Order(0)
public class StartupInfoLogger implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupInfoLogger.class);

    private final Environment env;

    public StartupInfoLogger(Environment env) {
        this.env = env;
    }

    @Override
    public void run(String... args) {
        String[] profiles = env.getActiveProfiles();
        String dbUrl = env.getProperty("spring.datasource.url", "not configured");
        String dbUser = env.getProperty("spring.datasource.username", "not configured");
        String ddlAuto = env.getProperty("spring.jpa.hibernate.ddl-auto", "none");
        String poolName = env.getProperty("spring.datasource.hikari.pool-name", "HikariPool-default");
        String dialect = env.getProperty("spring.jpa.properties.hibernate.dialect", "auto-detected");

        log.info("═══════════════════════════════════════════════════════");
        log.info("  SichrPlace Backend — Startup Info");
        log.info("───────────────────────────────────────────────────────");
        log.info("  Profiles:    {}", profiles.length > 0 ? Arrays.toString(profiles) : "[default]");
        log.info("  Database:    {}", maskPassword(dbUrl));
        log.info("  DB User:     {}", dbUser);
        log.info("  DDL-Auto:    {}", ddlAuto);
        log.info("  Dialect:     {}", dialect);
        log.info("  Pool:        {}", poolName);
        log.info("═══════════════════════════════════════════════════════");

        if (Arrays.asList(profiles).contains("local-mssql") ||
            Arrays.asList(profiles).contains("beta-mssql")) {
            log.info("  MSSQL profile active — DataSeeder will run if database is empty.");
        }
    }

    /**
     * Masks any password= parameter in a JDBC URL.
     * E.g., "jdbc:sqlserver://...;password=secret" → "jdbc:sqlserver://...;password=***"
     */
    private String maskPassword(String url) {
        if (url == null) return "null";
        return url.replaceAll("(?i)(password=)[^;]*", "$1***");
    }
}
