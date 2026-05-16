package com.syncpad.api.documents;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    public DocumentResponse createDocument(@Valid @RequestBody CreateDocumentRequest request) {
        return documentService.createDocument(request);
    }

    @GetMapping
    public List<DocumentResponse> listDocuments() {
        return documentService.listDocuments();
    }

    @GetMapping("/{id}")
    public DocumentResponse getDocument(@PathVariable UUID id) {
        return documentService.getDocument(id);
    }
}