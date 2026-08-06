package com.syncpad.api.documents;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentCommentService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository documentPermissionRepository;
    private final CommentThreadRepository commentThreadRepository;
    private final AppUserService appUserService;

    public DocumentCommentService(
            DocumentRepository documentRepository,
            DocumentPermissionRepository documentPermissionRepository,
            CommentThreadRepository commentThreadRepository,
            AppUserService appUserService
    ) {
        this.documentRepository = documentRepository;
        this.documentPermissionRepository = documentPermissionRepository;
        this.commentThreadRepository = commentThreadRepository;
        this.appUserService = appUserService;
    }

    @Transactional(readOnly = true)
    public List<CommentThreadResponse> listComments(
            UUID documentId,
            String userEmail
    ) {
        requireDocumentAccess(documentId, userEmail);

        return commentThreadRepository
                .findAllWithMessagesByDocumentId(documentId)
                .stream()
                .map(CommentThreadResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public CommentThreadResponse getComment(
            UUID documentId,
            UUID threadId,
            String userEmail
    ) {
        requireDocumentAccess(documentId, userEmail);

        return CommentThreadResponse.from(
                findThreadOrThrow(documentId, threadId)
        );
    }

    @Transactional
    public CommentThreadResponse createComment(
            UUID documentId,
            CreateCommentRequest request,
            String userEmail
    ) {
        DocumentRole role = requireDocumentAccess(documentId, userEmail);
        requireCommentPermission(role, documentId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        AppUser author = appUserService.findOrCreateByEmail(
                normalizeEmail(userEmail)
        );

        CommentThread thread = new CommentThread(
                document,
                author,
                request.selectedText()
        );

        thread.addMessage(author, request.message());

        CommentThread savedThread = commentThreadRepository.saveAndFlush(thread);

        return CommentThreadResponse.from(savedThread);
    }

    @Transactional
    public CommentThreadResponse addReply(
            UUID documentId,
            UUID threadId,
            AddCommentReplyRequest request,
            String userEmail
    ) {
        DocumentRole role = requireDocumentAccess(documentId, userEmail);
        requireCommentPermission(role, documentId);

        AppUser author = appUserService.findOrCreateByEmail(
                normalizeEmail(userEmail)
        );

        CommentThread thread = findThreadOrThrow(documentId, threadId);

        thread.addMessage(author, request.message());

        CommentThread savedThread = commentThreadRepository.saveAndFlush(thread);

        return CommentThreadResponse.from(savedThread);
    }

    @Transactional
    public CommentThreadResponse resolveComment(
            UUID documentId,
            UUID threadId,
            String userEmail
    ) {
        DocumentRole role = requireDocumentAccess(documentId, userEmail);
        requireCommentPermission(role, documentId);

        AppUser currentUser = appUserService.findOrCreateByEmail(
                normalizeEmail(userEmail)
        );

        CommentThread thread = findThreadOrThrow(documentId, threadId);

        thread.resolve(currentUser);

        CommentThread savedThread = commentThreadRepository.saveAndFlush(thread);

        return CommentThreadResponse.from(savedThread);
    }

    @Transactional
    public CommentThreadResponse reopenComment(
            UUID documentId,
            UUID threadId,
            String userEmail
    ) {
        DocumentRole role = requireDocumentAccess(documentId, userEmail);
        requireCommentPermission(role, documentId);

        CommentThread thread = findThreadOrThrow(documentId, threadId);

        thread.reopen();

        CommentThread savedThread = commentThreadRepository.saveAndFlush(thread);

        return CommentThreadResponse.from(savedThread);
    }

    private CommentThread findThreadOrThrow(
            UUID documentId,
            UUID threadId
    ) {
        return commentThreadRepository
                .findWithMessagesByIdAndDocumentId(threadId, documentId)
                .orElseThrow(
                        () -> new CommentNotFoundException(
                                documentId,
                                threadId
                        )
                );
    }

    private DocumentRole requireDocumentAccess(
            UUID documentId,
            String userEmail
    ) {
        String normalizedEmail = normalizeEmail(userEmail);

        return documentPermissionRepository
                .findRoleByDocumentIdAndUserEmail(
                        documentId,
                        normalizedEmail
                )
                .orElseThrow(
                        () -> new DocumentNotFoundException(documentId)
                );
    }

    private void requireCommentPermission(
            DocumentRole role,
            UUID documentId
    ) {
        if (
                role != DocumentRole.OWNER
                && role != DocumentRole.EDITOR
        ) {
            throw new DocumentAccessDeniedException(documentId);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new DocumentValidationException(
                    "Authenticated user email is required."
            );
        }

        return email.trim().toLowerCase();
    }
}
