package com.syncpad.api.documents;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final String DEFAULT_DEV_USER = "andy@syncpad.dev";

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse createDocument(
            @Valid @RequestBody CreateDocumentRequest request,
            @RequestHeader(value = "X-User-Email", defaultValue = DEFAULT_DEV_USER) String userEmail
    ) {
        return documentService.createDocument(request, userEmail);
    }

    @GetMapping
    public List<DocumentResponse> listDocuments(
            @RequestHeader(value = "X-User-Email", defaultValue = DEFAULT_DEV_USER) String userEmail
    ) {
        return documentService.listDocuments(userEmail);
    }

    @GetMapping("/{id}")
    public DocumentResponse getDocument(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Email", defaultValue = DEFAULT_DEV_USER) String userEmail
    ) {
        return documentService.getDocument(id, userEmail);
    }

    @PatchMapping("/{id}")
    public DocumentResponse renameDocument(
            @PathVariable UUID id,
            @Valid @RequestBody RenameDocumentRequest request,
            @RequestHeader(value = "X-User-Email", defaultValue = DEFAULT_DEV_USER) String userEmail
    ) {
        return documentService.renameDocument(id, request, userEmail);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Email", defaultValue = DEFAULT_DEV_USER) String userEmail
    ) {
        documentService.deleteDocument(id, userEmail);
    }
}