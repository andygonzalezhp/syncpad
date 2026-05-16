package com.syncpad.api.documents;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_permissions")
public class DocumentPermission {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentRole role;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected DocumentPermission() {
    }

    public DocumentPermission(Document document, AppUser user, DocumentRole role) {
        this.document = document;
        this.user = user;
        this.role = role;
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }

        createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Document getDocument() {
        return document;
    }

    public AppUser getUser() {
        return user;
    }

    public DocumentRole getRole() {
        return role;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean isOwner() {
        return role == DocumentRole.OWNER;
    }

    public void changeRole(DocumentRole role) {
        this.role = role;
    }
}