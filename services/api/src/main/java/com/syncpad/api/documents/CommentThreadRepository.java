package com.syncpad.api.documents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentThreadRepository
        extends JpaRepository<CommentThread, UUID> {

    @EntityGraph(attributePaths = {
            "createdBy",
            "resolvedBy",
            "messages",
            "messages.author"
    })
    @Query("""
            SELECT thread
            FROM CommentThread thread
            WHERE thread.document.id = :documentId
            ORDER BY thread.createdAt ASC
            """)
    List<CommentThread> findAllWithMessagesByDocumentId(
            @Param("documentId") UUID documentId
    );

    @EntityGraph(attributePaths = {
            "createdBy",
            "resolvedBy",
            "messages",
            "messages.author"
    })
    @Query("""
            SELECT thread
            FROM CommentThread thread
            WHERE thread.id = :threadId
              AND thread.document.id = :documentId
            """)
    Optional<CommentThread> findWithMessagesByIdAndDocumentId(
            @Param("threadId") UUID threadId,
            @Param("documentId") UUID documentId
    );
}