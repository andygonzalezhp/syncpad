CREATE TABLE document_states (
    document_name TEXT PRIMARY KEY,
    state BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);