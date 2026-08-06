CREATE TABLE comment_threads (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    created_by_user_id UUID NOT NULL,
    selected_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    resolved_by_user_id UUID,
    resolved_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_comment_threads_document
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_threads_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES app_users(id),

    CONSTRAINT fk_comment_threads_resolved_by
        FOREIGN KEY (resolved_by_user_id)
        REFERENCES app_users(id),

    CONSTRAINT chk_comment_threads_status
        CHECK (status IN ('OPEN', 'RESOLVED')),

    CONSTRAINT chk_comment_threads_selected_text
        CHECK (LENGTH(TRIM(selected_text)) > 0),

    CONSTRAINT chk_comment_threads_resolution
        CHECK (
            (
                status = 'OPEN'
                AND resolved_at IS NULL
                AND resolved_by_user_id IS NULL
            )
            OR
            (
                status = 'RESOLVED'
                AND resolved_at IS NOT NULL
                AND resolved_by_user_id IS NOT NULL
            )
        )
);

CREATE TABLE comment_messages (
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL,
    author_user_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT fk_comment_messages_thread
        FOREIGN KEY (thread_id)
        REFERENCES comment_threads(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_messages_author
        FOREIGN KEY (author_user_id)
        REFERENCES app_users(id),

    CONSTRAINT chk_comment_messages_body
        CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX idx_comment_threads_document_created
    ON comment_threads(document_id, created_at);

CREATE INDEX idx_comment_threads_document_status
    ON comment_threads(document_id, status);

CREATE INDEX idx_comment_messages_thread_created
    ON comment_messages(thread_id, created_at);