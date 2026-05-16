package com.syncpad.api.documents;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final JdbcTemplate jdbcTemplate;

    public DocumentService(
            DocumentRepository documentRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.documentRepository = documentRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public DocumentResponse createDocument(CreateDocumentRequest request) {
        Document document = new Document(request.title().trim());
        Document savedDocument = documentRepository.save(document);

        return DocumentResponse.from(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments() {
        return documentRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(DocumentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID id) {
        Document document = findDocumentOrThrow(id);
        return DocumentResponse.from(document);
    }

    @Transactional
    public DocumentResponse renameDocument(UUID id, RenameDocumentRequest request) {
        Document document = findDocumentOrThrow(id);

        document.rename(request.title().trim());

        return DocumentResponse.from(document);
    }

    @Transactional
    public void deleteDocument(UUID id) {
        Document document = findDocumentOrThrow(id);

        jdbcTemplate.update(
                "DELETE FROM document_states WHERE document_name = ?",
                id.toString()
        );

        documentRepository.delete(document);
    }

    private Document findDocumentOrThrow(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
    }
}