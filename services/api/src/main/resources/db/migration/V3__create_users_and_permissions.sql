CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_document_permissions_document_user UNIQUE (document_id, user_id)
);

CREATE INDEX idx_document_permissions_user_id ON document_permissions(user_id);
CREATE INDEX idx_document_permissions_document_id ON document_permissions(document_id);

INSERT INTO app_users (email, display_name)
VALUES ('andy@syncpad.dev', 'Andy')
ON CONFLICT (email) DO NOTHING;

INSERT INTO document_permissions (document_id, user_id, role)
SELECT documents.id, app_users.id, 'OWNER'
FROM documents
CROSS JOIN app_users
WHERE app_users.email = 'andy@syncpad.dev'
ON CONFLICT (document_id, user_id) DO NOTHING;