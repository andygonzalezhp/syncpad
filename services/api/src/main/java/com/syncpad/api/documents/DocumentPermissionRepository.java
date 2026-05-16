package com.syncpad.api.documents;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {

    @Query("""
           SELECT permission
           FROM DocumentPermission permission
           JOIN FETCH permission.document
           WHERE permission.user = :user
           ORDER BY permission.document.updatedAt DESC
           """)
    List<DocumentPermission> findAllByUserWithDocument(@Param("user") AppUser user);

    @Query("""
           SELECT permission
           FROM DocumentPermission permission
           JOIN FETCH permission.document
           WHERE permission.document.id = :documentId
           AND permission.user = :user
           """)
    Optional<DocumentPermission> findByDocumentIdAndUser(
            @Param("documentId") UUID documentId,
            @Param("user") AppUser user
    );
}