package com.syncpad.api.documents;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository documentPermissionRepository;
    private final AppUserService appUserService;
    private final JdbcTemplate jdbcTemplate;

    public DocumentService(
            DocumentRepository documentRepository,
            DocumentPermissionRepository documentPermissionRepository,
            AppUserService appUserService,
            JdbcTemplate jdbcTemplate
    ) {
        this.documentRepository = documentRepository;
        this.documentPermissionRepository = documentPermissionRepository;
        this.appUserService = appUserService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public DocumentResponse createDocument(CreateDocumentRequest request, String userEmail) {
        AppUser user = appUserService.findOrCreateByEmail(normalizeEmail(userEmail));

        Document document = new Document(request.title().trim());
        Document savedDocument = documentRepository.save(document);

        DocumentPermission permission = new DocumentPermission(
                savedDocument,
                user,
                DocumentRole.OWNER
        );

        documentPermissionRepository.save(permission);

        return DocumentResponse.from(savedDocument, DocumentRole.OWNER);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(String userEmail) {
        AppUser user = appUserService.findOrCreateByEmail(normalizeEmail(userEmail));

        return documentPermissionRepository.findAllByUserWithDocument(user)
                .stream()
                .map(permission -> DocumentResponse.from(
                        permission.getDocument(),
                        permission.getRole()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID id, String userEmail) {
        DocumentPermission permission = findPermissionOrThrow(id, userEmail);

        return DocumentResponse.from(
                permission.getDocument(),
                permission.getRole()
        );
    }

    @Transactional
    public DocumentResponse renameDocument(
            UUID id,
            RenameDocumentRequest request,
            String userEmail
    ) {
        DocumentPermission permission = findPermissionOrThrow(id, userEmail);
        requireOwner(permission, id);

        Document document = permission.getDocument();
        document.rename(request.title().trim());

        return DocumentResponse.from(document, permission.getRole());
    }

    @Transactional
    public void deleteDocument(UUID documentId, String userEmail) {
        String normalizedEmail = normalizeEmail(userEmail);

        if (!documentRepository.existsById(documentId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Document not found"
            );
        }

        DocumentRole currentUserRole = documentPermissionRepository
                .findRoleByDocumentIdAndUserEmail(documentId, normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Document not found"
                ));

        if (currentUserRole != DocumentRole.OWNER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the owner can delete this document"
            );
        }

        /*
         * Delete using direct SQL instead of JPA entity deletes.
         *
         * This avoids Hibernate transient-reference flush issues when deleting
         * DocumentPermission rows that point to the same Document being removed.
         */
        jdbcTemplate.update(
                "DELETE FROM document_states WHERE document_name = ?",
                documentId.toString()
        );

        jdbcTemplate.update(
                "DELETE FROM document_permissions WHERE document_id = ?",
                documentId
        );

        jdbcTemplate.update(
                "DELETE FROM documents WHERE id = ?",
                documentId
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentPermissionResponse> listPermissions(UUID documentId, String userEmail) {
        DocumentPermission currentUserPermission = findPermissionOrThrow(documentId, userEmail);
        requireOwner(currentUserPermission, documentId);

        return documentPermissionRepository.findAllByDocumentIdWithUser(documentId)
                .stream()
                .map(DocumentPermissionResponse::from)
                .toList();
    }

    @Transactional
    public DocumentPermissionResponse shareDocument(
            UUID documentId,
            ShareDocumentRequest request,
            String userEmail
    ) {
        DocumentPermission currentUserPermission = findPermissionOrThrow(documentId, userEmail);
        requireOwner(currentUserPermission, documentId);

        if (request.role() == DocumentRole.OWNER) {
            throw new DocumentValidationException("Use EDITOR or VIEWER when sharing a document.");
        }

        AppUser targetUser = appUserService.findOrCreateByEmail(
                normalizeEmail(request.email())
        );

        Document document = currentUserPermission.getDocument();

        DocumentPermission permission = documentPermissionRepository
                .findByDocumentIdAndUser(documentId, targetUser)
                .orElseGet(() -> new DocumentPermission(document, targetUser, request.role()));

        if (permission.isOwner()) {
            throw new DocumentValidationException("Cannot change the document owner role.");
        }

        permission.changeRole(request.role());

        DocumentPermission savedPermission = documentPermissionRepository.save(permission);

        return DocumentPermissionResponse.from(savedPermission);
    }

    @Transactional
    public void removePermission(
            UUID documentId,
            UUID permissionId,
            String userEmail
    ) {
        DocumentPermission currentUserPermission = findPermissionOrThrow(documentId, userEmail);
        requireOwner(currentUserPermission, documentId);

        DocumentPermission permissionToRemove = documentPermissionRepository.findById(permissionId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        if (!permissionToRemove.getDocument().getId().equals(documentId)) {
            throw new DocumentNotFoundException(documentId);
        }

        if (permissionToRemove.isOwner()) {
            throw new DocumentValidationException("Cannot remove the document owner.");
        }

        documentPermissionRepository.delete(permissionToRemove);
    }

    private DocumentPermission findPermissionOrThrow(UUID documentId, String userEmail) {
        AppUser user = appUserService.findOrCreateByEmail(normalizeEmail(userEmail));

        return documentPermissionRepository.findByDocumentIdAndUser(documentId, user)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
    }

    private void requireOwner(DocumentPermission permission, UUID documentId) {
        if (!permission.isOwner()) {
            throw new DocumentAccessDeniedException(documentId);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticated user email is required"
            );
        }

        return email.trim().toLowerCase();
    }
}