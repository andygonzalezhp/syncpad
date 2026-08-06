package com.syncpad.api.documents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

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
}
