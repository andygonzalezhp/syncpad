package com.syncpad.api;

import com.syncpad.api.documents.DocumentNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DocumentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleDocumentNotFound(DocumentNotFoundException ex) {
        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 404,
                "error", "Not Found",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidationError(MethodArgumentNotValidException ex) {
        return Map.of(
                "timestamp", OffsetDateTime.now(),
                "status", 400,
                "error", "Bad Request",
                "message", "Invalid request body"
        );
    }
}