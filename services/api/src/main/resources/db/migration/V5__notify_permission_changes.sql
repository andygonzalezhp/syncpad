CREATE OR REPLACE FUNCTION notify_syncpad_permission_change()
RETURNS TRIGGER AS $$
DECLARE
    changed_document_id UUID;
    changed_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        changed_document_id := OLD.document_id;
        changed_user_id := OLD.user_id;
    ELSE
        changed_document_id := NEW.document_id;
        changed_user_id := NEW.user_id;
    END IF;

    PERFORM pg_notify(
        'syncpad_permission_changes',
        json_build_object(
            'documentId', changed_document_id,
            'userId', changed_user_id
        )::text
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_permissions_notify_change
AFTER INSERT OR UPDATE OR DELETE ON document_permissions
FOR EACH ROW
EXECUTE FUNCTION notify_syncpad_permission_change();
