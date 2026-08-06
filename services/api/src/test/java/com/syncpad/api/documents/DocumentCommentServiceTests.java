package com.syncpad.api.documents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class DocumentCommentServiceTests {

    @Autowired
    private DocumentCommentService documentCommentService;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private DocumentPermissionRepository documentPermissionRepository;

    @Autowired
    private DocumentService documentService;

    @Test
    void replyResolveAndReopenPersistCompleteThreadState() {
        String email = "comments-test-" + UUID.randomUUID() + "@syncpad.dev";
        Document document = documentRepository.saveAndFlush(
                new Document("Comment mutation test")
        );
        AppUser user = appUserRepository.saveAndFlush(
                new AppUser(email, "Comments Test")
        );

        documentPermissionRepository.saveAndFlush(
                new DocumentPermission(document, user, DocumentRole.OWNER)
        );

        CommentThreadResponse created = documentCommentService.createComment(
                document.getId(),
                new CreateCommentRequest("Selected text", "Original"),
                email
        );
        CommentThreadResponse replied = documentCommentService.addReply(
                document.getId(),
                created.id(),
                new AddCommentReplyRequest("Reply"),
                email
        );

        assertEquals(2, replied.messages().size());
        assertEquals("Reply", replied.messages().get(1).body());

        CommentThreadResponse fetched = documentCommentService.getComment(
                document.getId(),
                created.id(),
                email
        );

        assertEquals(created.id(), fetched.id());
        assertEquals(2, fetched.messages().size());

        CommentThreadResponse resolved =
                documentCommentService.resolveComment(
                        document.getId(),
                        created.id(),
                        email
                );

        assertEquals(CommentStatus.RESOLVED, resolved.status());
        assertNotNull(resolved.resolvedBy());
        assertEquals(user.getId(), resolved.resolvedBy().id());
        assertNotNull(resolved.resolvedAt());

        CommentThreadResponse reopened =
                documentCommentService.reopenComment(
                        document.getId(),
                        created.id(),
                        email
                );

        assertEquals(CommentStatus.OPEN, reopened.status());
        assertNull(reopened.resolvedBy());
        assertNull(reopened.resolvedAt());
        assertEquals(2, reopened.messages().size());
    }

    @Test
    void editorCanMutateCommentsWhileViewerCanOnlyReadThem() {
        String ownerEmail = "comment-owner-" + UUID.randomUUID() + "@syncpad.test";
        String editorEmail = "comment-editor-" + UUID.randomUUID() + "@syncpad.test";
        String viewerEmail = "comment-viewer-" + UUID.randomUUID() + "@syncpad.test";
        DocumentResponse document = documentService.createDocument(
                new CreateDocumentRequest("Role-protected comments"),
                ownerEmail
        );

        documentService.shareDocument(
                document.id(),
                new ShareDocumentRequest(editorEmail, DocumentRole.EDITOR),
                ownerEmail
        );
        documentService.shareDocument(
                document.id(),
                new ShareDocumentRequest(viewerEmail, DocumentRole.VIEWER),
                ownerEmail
        );

        CommentThreadResponse created = documentCommentService.createComment(
                document.id(),
                new CreateCommentRequest("Selected", "Editor comment"),
                editorEmail
        );
        CommentThreadResponse replied = documentCommentService.addReply(
                document.id(),
                created.id(),
                new AddCommentReplyRequest("Editor reply"),
                editorEmail
        );

        assertEquals(2, replied.messages().size());
        assertEquals(1, documentCommentService.listComments(
                document.id(),
                viewerEmail
        ).size());

        assertThrows(
                DocumentAccessDeniedException.class,
                () -> documentCommentService.createComment(
                        document.id(),
                        new CreateCommentRequest("Selected", "Viewer comment"),
                        viewerEmail
                )
        );
        assertThrows(
                DocumentAccessDeniedException.class,
                () -> documentCommentService.addReply(
                        document.id(),
                        created.id(),
                        new AddCommentReplyRequest("Viewer reply"),
                        viewerEmail
                )
        );
        assertThrows(
                DocumentAccessDeniedException.class,
                () -> documentCommentService.resolveComment(
                        document.id(),
                        created.id(),
                        viewerEmail
                )
        );

        CommentThreadResponse resolved = documentCommentService.resolveComment(
                document.id(),
                created.id(),
                editorEmail
        );
        assertEquals(CommentStatus.RESOLVED, resolved.status());

        CommentThreadResponse reopened = documentCommentService.reopenComment(
                document.id(),
                created.id(),
                editorEmail
        );
        assertEquals(CommentStatus.OPEN, reopened.status());
    }
}
