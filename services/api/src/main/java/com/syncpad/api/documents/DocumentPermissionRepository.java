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

    @Query("""
           SELECT permission
           FROM DocumentPermission permission
           JOIN FETCH permission.user
           WHERE permission.document.id = :documentId
           ORDER BY
             CASE permission.role
               WHEN com.syncpad.api.documents.DocumentRole.OWNER THEN 0
               WHEN com.syncpad.api.documents.DocumentRole.EDITOR THEN 1
               ELSE 2
             END,
             permission.createdAt ASC
           """)
    List<DocumentPermission> findAllByDocumentIdWithUser(
            @Param("documentId") UUID documentId
    );
}