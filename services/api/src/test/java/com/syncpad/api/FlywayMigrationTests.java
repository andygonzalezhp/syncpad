package com.syncpad.api;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class FlywayMigrationTests {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void cleanPostgresDatabaseHasAllValidatedMigrationsAndCoreTables() {
        assertTrue(flyway.validateWithResult().validationSuccessful);

        Set<String> appliedVersions = Arrays.stream(flyway.info().applied())
                .map(MigrationInfo::getVersion)
                .map(Object::toString)
                .collect(Collectors.toSet());

        assertTrue(appliedVersions.containsAll(Set.of("1", "2", "3", "4", "5", "6")));

        Integer coreTableCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN (
                    'documents',
                    'document_states',
                    'app_users',
                    'document_permissions',
                    'comment_threads',
                    'comment_messages'
                )
                """,
                Integer.class
        );

        assertEquals(6, coreTableCount);
    }
}
