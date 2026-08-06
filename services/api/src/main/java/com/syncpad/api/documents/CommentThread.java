package com.syncpad.api.documents;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "comment_threads")
public class CommentThread {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private AppUser createdBy;

    @Column(name = "selected_text", nullable = false, columnDefinition = "text")
    private String selectedText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommentStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_user_id")
    private AppUser resolvedBy;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(
            mappedBy = "thread",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("createdAt ASC")
    private List<CommentMessage> messages = new ArrayList<>();

    protected CommentThread() {
    }

    public CommentThread(
            Document document,
            AppUser createdBy,
            String selectedText
    ) {
        this.document = document;
        this.createdBy = createdBy;
        this.selectedText = selectedText.trim();
        this.status = CommentStatus.OPEN;
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();

        if (id == null) {
            id = UUID.randomUUID();
        }

        if (status == null) {
            status = CommentStatus.OPEN;
        }

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public CommentMessage addMessage(AppUser author, String body) {
        CommentMessage message = new CommentMessage(
                this,
                author,
                body.trim()
        );

        messages.add(message);
        updatedAt = OffsetDateTime.now();

        return message;
    }

    public void resolve(AppUser user) {
        if (status == CommentStatus.RESOLVED) {
            return;
        }

        status = CommentStatus.RESOLVED;
        resolvedBy = user;
        resolvedAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    public void reopen() {
        if (status == CommentStatus.OPEN) {
            return;
        }

        status = CommentStatus.OPEN;
        resolvedBy = null;
        resolvedAt = null;
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Document getDocument() {
        return document;
    }

    public AppUser getCreatedBy() {
        return createdBy;
    }

    public String getSelectedText() {
        return selectedText;
    }

    public CommentStatus getStatus() {
        return status;
    }

    public AppUser getResolvedBy() {
        return resolvedBy;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }

    public long getVersion() {
        return version;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<CommentMessage> getMessages() {
        return Collections.unmodifiableList(messages);
    }

    public boolean isResolved() {
        return status == CommentStatus.RESOLVED;
    }
}