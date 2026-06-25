package com.unishare;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableMongoAuditing
@EnableScheduling
@EnableAsync
public class BackendApplication {

    public static void main(String[] args) {
        try {
            SpringApplication.run(BackendApplication.class, args);
        } catch (Exception e) {
            System.err.println("\n[ERROR] Application failed to start.");
            Throwable rootCause = e;
            while (rootCause.getCause() != null && rootCause.getCause() != rootCause) {
                rootCause = rootCause.getCause();
            }
            System.err.println("Cause: " + rootCause.getClass().getSimpleName() + " - " + rootCause.getMessage());
            System.err.println("Tip: If this is an SSLException, please make sure your IP address is whitelisted in MongoDB Atlas.\n");
        }
    }

    @Bean
    public CommandLineRunner startupMessage() {
        return args -> {
            System.out.println("\n========================================");
            System.out.println("  MongoDB is connected.");
            System.out.println("  Backend is running.");
            System.out.println("========================================\n");
        };
    }
}
