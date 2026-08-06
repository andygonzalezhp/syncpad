ALTER TABLE document_states
ADD COLUMN document_id UUID;

WITH ranked_states AS (
    SELECT
        document_states.document_name,
        documents.id AS document_id,
        ROW_NUMBER() OVER (
            PARTITION BY documents.id
            ORDER BY document_states.updated_at DESC, document_states.document_name
        ) AS state_rank
    FROM document_states
    JOIN documents
        ON documents.id::text = LOWER(document_states.document_name)
    WHERE document_states.document_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
UPDATE document_states
SET document_id = ranked_states.document_id
FROM ranked_states
WHERE document_states.document_name = ranked_states.document_name
AND ranked_states.state_rank = 1;

ALTER TABLE document_states
ADD CONSTRAINT uq_document_states_document_id UNIQUE (document_id);

ALTER TABLE document_states
ADD CONSTRAINT fk_document_states_document
FOREIGN KEY (document_id)
REFERENCES documents(id)
ON DELETE CASCADE;
