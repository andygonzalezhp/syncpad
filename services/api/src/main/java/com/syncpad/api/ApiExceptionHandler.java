package com.syncpad.api;

import com.syncpad.api.documents.CommentNotFoundException;
import com.syncpad.api.documents.DocumentAccessDeniedException;
import com.syncpad.api.documents.DocumentNotFoundException;
import com.syncpad.api.documents.DocumentValidationException;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DocumentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleDocumentNotFound(
            DocumentNotFoundException ex
    ) {
        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 404,
                "error", "Not Found",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(CommentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleCommentNotFound(
            CommentNotFoundException ex
    ) {
        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 404,
                "error", "Not Found",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(DocumentAccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, Object> handleAccessDenied(
            DocumentAccessDeniedException ex
    ) {
        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 403,
                "error", "Forbidden",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(DocumentValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleDocumentValidation(
            DocumentValidationException ex
    ) {
        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 400,
                "error", "Bad Request",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidationError(
            MethodArgumentNotValidException ex
    ) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> {
                    String defaultMessage = error.getDefaultMessage();

                    if (defaultMessage == null || defaultMessage.isBlank()) {
                        return "Invalid value for " + error.getField();
                    }

                    return error.getField() + ": " + defaultMessage;
                })
                .orElse("Invalid request body");

        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 400,
                "error", "Bad Request",
                "message", message
        );
    }
}