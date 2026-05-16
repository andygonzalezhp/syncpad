package com.syncpad.api.documents;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppUserService {

    private final AppUserRepository appUserRepository;

    public AppUserService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Transactional
    public AppUser findOrCreateByEmail(String email) {
        String normalizedEmail = email.trim().toLowerCase();

        return appUserRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> appUserRepository.save(
                        new AppUser(normalizedEmail, displayNameFromEmail(normalizedEmail))
                ));
    }

    private String displayNameFromEmail(String email) {
        String localPart = email.split("@")[0];

        if (localPart.isBlank()) {
            return "User";
        }

        return localPart.substring(0, 1).toUpperCase() + localPart.substring(1);
    }
}