package com.syncpad.api.documents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentCommentController.class)
class DocumentCommentControllerTests {

    private static final String USER_EMAIL = "owner@example.com";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentCommentService documentCommentService;

    @Test
    void getCommentReturnsOneAuthorizedThreadForRealtimeRefresh() throws Exception {
        UUID documentId = UUID.randomUUID();
        UUID threadId = UUID.randomUUID();
        CommentThreadResponse response = threadResponse(
                documentId,
                threadId,
                CommentStatus.OPEN,
                null,
                null,
                List.of(messageResponse("Original"))
        );

        when(documentCommentService.getComment(
                documentId,
                threadId,
                USER_EMAIL
        )).thenReturn(response);

        mockMvc.perform(get(
                        "/api/documents/{documentId}/comments/{threadId}",
                        documentId,
                        threadId
                ).with(jwt().jwt(jwt -> jwt.claim("email", USER_EMAIL))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(threadId.toString()))
                .andExpect(jsonPath("$.status").value("OPEN"));

        verify(documentCommentService).getComment(
                documentId,
                threadId,
                USER_EMAIL
        );
    }

    @Test
    void addReplyAcceptsExpectedRouteAndMessageBody() throws Exception {
        UUID documentId = UUID.randomUUID();
        UUID threadId = UUID.randomUUID();
        CommentThreadResponse response = threadResponse(
                documentId,
                threadId,
                CommentStatus.OPEN,
                null,
                null,
                List.of(messageResponse("Original"), messageResponse("Reply"))
        );

        when(documentCommentService.addReply(
                documentId,
                threadId,
                new AddCommentReplyRequest("Reply"),
                USER_EMAIL
        )).thenReturn(response);

        mockMvc.perform(post(
                        "/api/documents/{documentId}/comments/{threadId}/replies",
                        documentId,
                        threadId
                )
                        .with(jwt().jwt(jwt -> jwt.claim("email", USER_EMAIL)))
                        .contentType("application/json")
                        .content("{\"message\":\"Reply\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(threadId.toString()))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.messages.length()").value(2))
                .andExpect(jsonPath("$.messages[1].body").value("Reply"));

        verify(documentCommentService).addReply(
                documentId,
                threadId,
                new AddCommentReplyRequest("Reply"),
                USER_EMAIL
        );
    }

    @Test
    void resolveReturnsResolvedMetadata() throws Exception {
        UUID documentId = UUID.randomUUID();
        UUID threadId = UUID.randomUUID();
        CommentAuthorResponse resolver = authorResponse();
        OffsetDateTime resolvedAt = OffsetDateTime.now();
        CommentThreadResponse response = threadResponse(
                documentId,
                threadId,
                CommentStatus.RESOLVED,
                resolver,
                resolvedAt,
                List.of(messageResponse("Original"))
        );

        when(documentCommentService.resolveComment(
                documentId,
                threadId,
                USER_EMAIL
        )).thenReturn(response);

        mockMvc.perform(patch(
                        "/api/documents/{documentId}/comments/{threadId}/resolve",
                        documentId,
                        threadId
                ).with(jwt().jwt(jwt -> jwt.claim("email", USER_EMAIL))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolvedBy.id").value(
                        resolver.id().toString()
                ))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

        verify(documentCommentService).resolveComment(
                documentId,
                threadId,
                USER_EMAIL
        );
    }

    @Test
    void reopenReturnsOpenThreadWithoutResolutionMetadata() throws Exception {
        UUID documentId = UUID.randomUUID();
        UUID threadId = UUID.randomUUID();
        CommentThreadResponse response = threadResponse(
                documentId,
                threadId,
                CommentStatus.OPEN,
                null,
                null,
                List.of(messageResponse("Original"))
        );

        when(documentCommentService.reopenComment(
                documentId,
                threadId,
                USER_EMAIL
        )).thenReturn(response);

        mockMvc.perform(patch(
                        "/api/documents/{documentId}/comments/{threadId}/reopen",
                        documentId,
                        threadId
                ).with(jwt().jwt(jwt -> jwt.claim("email", USER_EMAIL))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.resolvedBy").doesNotExist())
                .andExpect(jsonPath("$.resolvedAt").doesNotExist());

        verify(documentCommentService).reopenComment(
                documentId,
                threadId,
                USER_EMAIL
        );
    }

    private static CommentThreadResponse threadResponse(
            UUID documentId,
            UUID threadId,
            CommentStatus status,
            CommentAuthorResponse resolvedBy,
            OffsetDateTime resolvedAt,
            List<CommentMessageResponse> messages
    ) {
        OffsetDateTime now = OffsetDateTime.now();

        return new CommentThreadResponse(
                threadId,
                documentId,
                "Selected text",
                status,
                authorResponse(),
                resolvedBy,
                resolvedAt,
                now,
                now,
                messages
        );
    }

    private static CommentMessageResponse messageResponse(String body) {
        OffsetDateTime now = OffsetDateTime.now();

        return new CommentMessageResponse(
                UUID.randomUUID(),
                authorResponse(),
                body,
                now,
                now
        );
    }

    private static CommentAuthorResponse authorResponse() {
        return new CommentAuthorResponse(
                UUID.randomUUID(),
                USER_EMAIL,
                "Owner"
        );
    }
}
