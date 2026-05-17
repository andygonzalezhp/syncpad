package com.syncpad.api.documents;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse createDocument(
            @Valid @RequestBody CreateDocumentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.createDocument(request, currentUserEmail(jwt));
    }

    @GetMapping
    public List<DocumentResponse> listDocuments(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.listDocuments(currentUserEmail(jwt));
    }

    @GetMapping("/{id}")
    public DocumentResponse getDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.getDocument(id, currentUserEmail(jwt));
    }

    @PatchMapping("/{id}")
    public DocumentResponse renameDocument(
            @PathVariable UUID id,
            @Valid @RequestBody RenameDocumentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.renameDocument(id, request, currentUserEmail(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        documentService.deleteDocument(id, currentUserEmail(jwt));
    }

    @GetMapping("/{id}/permissions")
    public List<DocumentPermissionResponse> listPermissions(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.listPermissions(id, currentUserEmail(jwt));
    }

    @PostMapping("/{id}/permissions")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentPermissionResponse shareDocument(
            @PathVariable UUID id,
            @Valid @RequestBody ShareDocumentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return documentService.shareDocument(id, request, currentUserEmail(jwt));
    }

    @DeleteMapping("/{id}/permissions/{permissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePermission(
            @PathVariable UUID id,
            @PathVariable UUID permissionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        documentService.removePermission(id, permissionId, currentUserEmail(jwt));
    }

    private String currentUserEmail(Jwt jwt) {
        if (jwt == null) {
            throw new DocumentValidationException("Missing authenticated user.");
        }

        String email = jwt.getClaimAsString("email");

        if (email == null || email.isBlank()) {
            throw new DocumentValidationException(
                    "Authenticated Clerk token is missing email claim. Check the syncpad JWT template."
            );
        }

        return email.trim().toLowerCase();
    }
}