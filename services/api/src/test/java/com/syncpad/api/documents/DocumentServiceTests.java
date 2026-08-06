package com.syncpad.api.documents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class DocumentServiceTests {

    private static final String OWNER = "owner-service@syncpad.test";

    @Autowired
    private DocumentService documentService;

    @Test
    void ownerCanCreateListReadRenameAndDeleteDocument() {
        DocumentResponse created = documentService.createDocument(
                new CreateDocumentRequest("  Project plan  "),
                OWNER
        );

        assertEquals("Project plan", created.title());
        assertEquals(DocumentRole.OWNER, created.role());
        assertTrue(documentService.listDocuments(OWNER).stream()
                .anyMatch(document -> document.id().equals(created.id())));
        assertEquals(created.id(), documentService.getDocument(
                created.id(),
                OWNER
        ).id());

        DocumentResponse renamed = documentService.renameDocument(
                created.id(),
                new RenameDocumentRequest("Updated plan"),
                OWNER
        );
        assertEquals("Updated plan", renamed.title());

        documentService.deleteDocument(created.id(), OWNER);

        assertFalse(documentService.listDocuments(OWNER).stream()
                .anyMatch(document -> document.id().equals(created.id())));
        assertThrows(
                DocumentNotFoundException.class,
                () -> documentService.getDocument(created.id(), OWNER)
        );
    }

    @Test
    void ownerCanShareAndRemoveEditorAndViewerAccess() {
        String editor = "editor-service@syncpad.test";
        String viewer = "viewer-service@syncpad.test";
        DocumentResponse document = documentService.createDocument(
                new CreateDocumentRequest("Shared document"),
                OWNER
        );

        DocumentPermissionResponse editorPermission = documentService.shareDocument(
                document.id(),
                new ShareDocumentRequest(editor, DocumentRole.EDITOR),
                OWNER
        );
        DocumentPermissionResponse viewerPermission = documentService.shareDocument(
                document.id(),
                new ShareDocumentRequest(viewer, DocumentRole.VIEWER),
                OWNER
        );

        assertEquals(DocumentRole.EDITOR, documentService.getDocument(
                document.id(),
                editor
        ).role());
        assertEquals(DocumentRole.VIEWER, documentService.getDocument(
                document.id(),
                viewer
        ).role());

        List<DocumentPermissionResponse> permissions =
                documentService.listPermissions(document.id(), OWNER);
        assertEquals(3, permissions.size());

        assertThrows(
                DocumentAccessDeniedException.class,
                () -> documentService.renameDocument(
                        document.id(),
                        new RenameDocumentRequest("Editor rename"),
                        editor
                )
        );
        assertThrows(
                DocumentAccessDeniedException.class,
                () -> documentService.shareDocument(
                        document.id(),
                        new ShareDocumentRequest(
                                "other@syncpad.test",
                                DocumentRole.VIEWER
                        ),
                        viewer
                )
        );
        assertThrows(
                DocumentValidationException.class,
                () -> documentService.shareDocument(
                        document.id(),
                        new ShareDocumentRequest(
                                "invalid-owner@syncpad.test",
                                DocumentRole.OWNER
                        ),
                        OWNER
                )
        );

        documentService.removePermission(
                document.id(),
                editorPermission.id(),
                OWNER
        );
        assertThrows(
                DocumentNotFoundException.class,
                () -> documentService.getDocument(document.id(), editor)
        );

        assertEquals(DocumentRole.VIEWER, viewerPermission.role());
    }
}
