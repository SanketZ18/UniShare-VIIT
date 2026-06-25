package com.unishare.config;

import com.unishare.service.ExternalAcademicContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ExternalAcademicContentInitializer implements CommandLineRunner {

    private final ExternalAcademicContentService externalAcademicContentService;

    @Override
    public void run(String... args) {
        // Startup sync thread removed to optimize login speed and startup performance.
        // The scheduled task will run the sync after the configured initial delay (5 minutes).
    }

    @Scheduled(
            fixedDelayString = "${app.external-content.sync-interval-ms:1800000}",
            initialDelayString = "${app.external-content.sync-initial-delay-ms:300000}"
    )
    public void syncOnSchedule() {
        externalAcademicContentService.syncConfiguredResources();
    }
}
