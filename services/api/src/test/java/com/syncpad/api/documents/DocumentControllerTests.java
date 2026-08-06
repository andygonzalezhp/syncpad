package com.syncpad.api.documents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentController.class)
class DocumentControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentService documentService;

    @Test
    void documentEndpointsRejectUnauthorizedRequests() throws Exception {
        mockMvc.perform(get("/api/documents"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(documentService);
    }

    @Test
    void createDocumentRejectsBlankTitles() throws Exception {
        mockMvc.perform(post("/api/documents")
                        .with(jwt().jwt(jwt -> jwt.claim(
                                "email",
                                "owner@syncpad.test"
                        )))
                        .contentType("application/json")
                        .content("{\"title\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty());

        verifyNoInteractions(documentService);
    }

    @Test
    void sharingRejectsMalformedEmailAddresses() throws Exception {
        mockMvc.perform(post(
                        "/api/documents/{id}/permissions",
                        "20000000-0000-4000-8000-000000000001"
                )
                        .with(jwt().jwt(jwt -> jwt.claim(
                                "email",
                                "owner@syncpad.test"
                        )))
                        .contentType("application/json")
                        .content("{\"email\":\"not-an-email\",\"role\":\"VIEWER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verifyNoInteractions(documentService);
    }
}
