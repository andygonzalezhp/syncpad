package com.syncpad.api.documents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentPermissionRepository
    extends JpaRepository<DocumentPermission, UUID> {

  @Query("""
      SELECT permission
      FROM DocumentPermission permission
      JOIN FETCH permission.document document
      WHERE permission.user = :user
      ORDER BY document.updatedAt DESC
      """)
  List<DocumentPermission> findAllByUserWithDocument(
      @Param("user") AppUser user
  );

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
      ORDER BY permission.createdAt ASC
      """)
  List<DocumentPermission> findAllByDocumentIdWithUser(
      @Param("documentId") UUID documentId
  );

  @Query("""
      SELECT permission
      FROM DocumentPermission permission
      WHERE permission.document.id = :documentId
      ORDER BY permission.createdAt ASC
      """)
  List<DocumentPermission> findAllByDocumentId(
      @Param("documentId") UUID documentId
  );

  @Query("""
      SELECT permission
      FROM DocumentPermission permission
      WHERE permission.document.id = :documentId
        AND LOWER(permission.user.email) = LOWER(:email)
      """)
  Optional<DocumentPermission> findByDocumentIdAndUserEmail(
      @Param("documentId") UUID documentId,
      @Param("email") String email
  );

  @Query("""
      SELECT permission.role
      FROM DocumentPermission permission
      WHERE permission.document.id = :documentId
        AND LOWER(permission.user.email) = LOWER(:email)
      """)
  Optional<DocumentRole> findRoleByDocumentIdAndUserEmail(
      @Param("documentId") UUID documentId,
      @Param("email") String email
  );
}