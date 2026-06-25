package com.unishare.service.impl;

import com.unishare.model.Resource;
import com.unishare.model.enums.Department;
import com.unishare.model.enums.ResourceType;
import com.unishare.repository.ResourceRepository;
import com.unishare.service.ExternalAcademicContentService;
import com.unishare.service.FileStorageService;
import com.unishare.service.NotificationService;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalAcademicContentServiceImpl implements ExternalAcademicContentService {

    private static final String SYSTEM_UPLOADER_ID = "SYSTEM_SPPU";
    private static final String SYSTEM_UPLOADER_NAME = "SPPU Academic Feed";
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    // ──────────────────────────────────────────────
    // SPPU Portal base URLs
    // ──────────────────────────────────────────────
    private static final String EXAM_DOCS_BASE_URL = "http://collegecirculars.unipune.ac.in";

    /** Mobile-list view for the exam-docs SharePoint site (question papers). */
    private static final String EXAM_MOBILE_LIST_URL =
            EXAM_DOCS_BASE_URL + "/sites/examdocs/_layouts/mobile/mbllists.aspx";

    /** Mobile-list view for the documents SharePoint site (syllabi, circulars). */
    private static final String DOCS_MOBILE_LIST_URL =
            EXAM_DOCS_BASE_URL + "/sites/documents/_layouts/mobile/mbllists.aspx";

    /** News & Announcements SharePoint list for SPPU circulars. */
    private static final String NEWS_ANNOUNCEMENTS_URL =
            "http://sppudocs.unipune.ac.in/sites/news_events/Lists/News%20and%20Announcements/AllItems.aspx";

    // ──────────────────────────────────────────────
    // Regex helpers
    // ──────────────────────────────────────────────
    private static final Pattern LAST_PAGE_PATTERN  = Pattern.compile("__V_ctl00_LastPage\\\" value=\\\"(\\d+)\\\"");
    private static final Pattern SEMESTER_PATTERN   = Pattern.compile("SEMESTER\\s*[-:]?\\s*(I{1,3}|IV|V|VI|[1-6])", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUBJECT_PATTERN    = Pattern.compile(":[\\s]*([^\\r\\n]+?)\\s*\\(([A-Z]{2,}[\\s\\-]*\\d+[A-Z\\s]*)\\)", Pattern.CASE_INSENSITIVE);
    private static final Pattern SYLLABUS_LIB_PATTERN = Pattern.compile("Syllabus", Pattern.CASE_INSENSITIVE);
    private static final Pattern TIMETABLE_PATTERN  = Pattern.compile("(timetable|time\\s*table|schedule)", Pattern.CASE_INSENSITIVE);

    private final ResourceRepository resourceRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final MongoTemplate mongoTemplate;
    private final AtomicBoolean syncInProgress = new AtomicBoolean(false);

    @Value("${app.bootstrap.external-resources.enabled:true}")
    private boolean externalResourcesEnabled;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    // ══════════════════════════════════════════════
    // Public entry point
    // ══════════════════════════════════════════════

    @Override
    public void syncConfiguredResources() {
        if (!externalResourcesEnabled) {
            log.info("External academic resource sync is disabled");
            return;
        }
        if (!syncInProgress.compareAndSet(false, true)) {
            log.info("External academic resource sync skipped – another sync is already in progress");
            return;
        }

        try {
            Map<String, FileStorageService.StoredFile> downloadedFiles = new HashMap<>();
            syncDynamicSyllabi(downloadedFiles);
            syncDynamicQuestionPapers(downloadedFiles);
            syncUniversityAnnouncements();
        } finally {
            syncInProgress.set(false);
        }
    }

    // ══════════════════════════════════════════════
    // 1. DYNAMIC SYLLABUS SYNC
    //    Crawls /sites/documents/ to find libraries
    //    whose name contains "Syllabus" and indexes
    //    MCA/MBA PDF files from all of them.
    // ══════════════════════════════════════════════

    private void syncDynamicSyllabi(Map<String, FileStorageService.StoredFile> downloadedFiles) {
        log.info("Starting dynamic syllabus sync from SPPU documents portal...");
        int syncedCount = 0;

        try {
            List<LibraryFeed> syllabusLibraries = discoverSyllabusLibraries();
            log.info("Discovered {} syllabus libraries on SPPU portal", syllabusLibraries.size());

            for (LibraryFeed library : syllabusLibraries) {
                for (SyllabusListing listing : discoverSyllabi(library)) {
                    try {
                        ExternalResourceDefinition definition = buildSyllabusDefinition(listing, downloadedFiles);
                        syncSingleResource(definition, downloadedFiles);
                        syncedCount++;
                    } catch (RuntimeException ex) {
                        log.warn("Failed to sync syllabus {} : {}", listing.title(), ex.getMessage());
                    }
                }
            }
        } catch (RuntimeException ex) {
            log.warn("Dynamic syllabus sync encountered an error: {}", ex.getMessage());
        }

        log.info("Dynamic syllabus sync completed with {} resources processed", syncedCount);
    }

    /**
     * Discovers all document libraries on the SPPU /sites/documents/ portal
     * whose name contains "Syllabus".
     */
    private List<LibraryFeed> discoverSyllabusLibraries() {
        Document firstPage = fetchHtml(DOCS_MOBILE_LIST_URL);
        int lastPage = extractLastPage(firstPage.html());
        Map<String, LibraryFeed> libraries = new LinkedHashMap<>();

        for (int currentPage = 1; currentPage <= lastPage; currentPage++) {
            String pageUrl = currentPage == 1
                    ? DOCS_MOBILE_LIST_URL
                    : DOCS_MOBILE_LIST_URL + "?CurrentPage=" + currentPage;
            Document pageDocument = currentPage == 1 ? firstPage : fetchHtml(pageUrl);

            for (Element anchor : pageDocument.select("a[href*='/Forms/AllItems.aspx']")) {
                String libraryName = anchor.text().trim();
                if (libraryName.isBlank()) continue;

                // Only index libraries whose name contains "Syllabus"
                if (!SYLLABUS_LIB_PATTERN.matcher(libraryName).find()) continue;

                String allItemsUrl = absolutizeUrl(anchor.absUrl("href"), EXAM_DOCS_BASE_URL);
                libraries.putIfAbsent(allItemsUrl, resolveLibraryFeed(libraryName, allItemsUrl));
            }
        }

        return new ArrayList<>(libraries.values());
    }

    /**
     * Lists all MCA/MBA PDF files from a syllabus library.
     */
    private List<SyllabusListing> discoverSyllabi(LibraryFeed library) {
        List<SyllabusListing> listings = new ArrayList<>();

        for (int currentPage = 1; currentPage <= library.lastPage(); currentPage++) {
            String pageUrl = buildLibraryPageUrl(library.baseViewUrl(), currentPage);
            Document document = currentPage == 1 ? library.firstPageDocument() : fetchHtml(pageUrl);

            for (Element anchor : document.select("a[href$='.pdf'], a[href*='.pdf?']")) {
                String title = anchor.text().trim();
                Department dept = detectDepartment(title);
                if (dept == null) continue; // Only MCA/MBA

                String sourceUrl = absolutizeUrl(anchor.absUrl("href"), EXAM_DOCS_BASE_URL);
                listings.add(new SyllabusListing(library.libraryName(), title, sourceUrl, dept));
            }
        }

        return listings;
    }

    /**
     * Builds an {@link ExternalResourceDefinition} for a discovered syllabus PDF.
     * Extracts pattern year from the library name (e.g. "Syllabus2024" → "2024").
     */
    private ExternalResourceDefinition buildSyllabusDefinition(
            SyllabusListing listing,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        String resourceKey = "sppu-syllabus-" + slugify(listing.libraryName()) + "-" + slugify(listing.title());

        // Try to infer pattern year from the library name (e.g. "Syllabus2024" or "Syllabus 2024")
        String patternYear = "";
        Matcher yearMatcher = Pattern.compile("\\b(20\\d{2})\\b").matcher(listing.libraryName());
        if (yearMatcher.find()) {
            patternYear = yearMatcher.group(1);
        }
        String patternLabel = patternYear.isBlank() ? "" : " (" + patternYear + " Pattern)";

        String title       = listing.department().name() + " Syllabus" + patternLabel + " – " + cleanText(listing.title());
        String description = "Official SPPU " + listing.department().name() + " syllabus" + patternLabel
                + " auto-synced from the " + cleanText(listing.libraryName()) + " document library.";
        String fileName    = slugify(listing.department().name() + " " + listing.title()) + ".pdf";

        return new ExternalResourceDefinition(
                resourceKey,
                title,
                description,
                ResourceType.SYLLABUS,
                "Syllabus" + patternLabel,
                listing.department(),
                1,  // year 1 – semester is extracted from PDF on first sync
                1,  // semester default
                listing.sourceUrl(),
                fileName
        );
    }

    // ══════════════════════════════════════════════
    // 2. DYNAMIC QUESTION PAPER / TIMETABLE SYNC
    //    Crawls /sites/examdocs/ for ALL pattern
    //    PDFs for MCA and MBA (not restricted to
    //    2024 pattern anymore).
    // ══════════════════════════════════════════════

    private void syncDynamicQuestionPapers(Map<String, FileStorageService.StoredFile> downloadedFiles) {
        log.info("Starting dynamic question-paper & timetable sync from SPPU exam-docs portal...");
        List<LibraryFeed> libraries = discoverExamLibraries();
        int syncedCount = 0;

        for (LibraryFeed library : libraries) {
            for (QuestionPaperListing listing : discoverQuestionPapers(library)) {
                try {
                    ExternalResourceDefinition definition = buildQuestionPaperDefinition(listing, downloadedFiles);
                    syncSingleResource(definition, downloadedFiles);
                    syncedCount++;
                } catch (RuntimeException exception) {
                    log.warn("Failed to sync exam document {}: {}", listing.title(), exception.getMessage());
                }
            }
        }

        log.info("Dynamic question-paper sync completed with {} resources processed", syncedCount);
    }

    private List<LibraryFeed> discoverExamLibraries() {
        Document firstPage = fetchHtml(EXAM_MOBILE_LIST_URL);
        int lastPage = extractLastPage(firstPage.html());
        Map<String, LibraryFeed> libraries = new LinkedHashMap<>();

        for (int currentPage = 1; currentPage <= lastPage; currentPage++) {
            String pageUrl = currentPage == 1
                    ? EXAM_MOBILE_LIST_URL
                    : EXAM_MOBILE_LIST_URL + "?CurrentPage=" + currentPage;
            Document pageDocument = currentPage == 1 ? firstPage : fetchHtml(pageUrl);

            for (Element anchor : pageDocument.select("a[href*='/Forms/AllItems.aspx']")) {
                String libraryName = anchor.text().trim();
                if (libraryName.isBlank()) continue;

                String allItemsUrl = absolutizeUrl(anchor.absUrl("href"), EXAM_DOCS_BASE_URL);
                libraries.putIfAbsent(allItemsUrl, resolveLibraryFeed(libraryName, allItemsUrl));
            }
        }

        return new ArrayList<>(libraries.values());
    }

    /**
     * Discovers question papers and timetables from a library.
     * No longer restricted to "2024 PATTERN" – all MCA/MBA PDFs are indexed.
     */
    private List<QuestionPaperListing> discoverQuestionPapers(LibraryFeed library) {
        List<QuestionPaperListing> listings = new ArrayList<>();

        for (int currentPage = 1; currentPage <= library.lastPage(); currentPage++) {
            String pageUrl = buildLibraryPageUrl(library.baseViewUrl(), currentPage);
            Document document = currentPage == 1 ? library.firstPageDocument() : fetchHtml(pageUrl);

            for (Element anchor : document.select("a[href$='.pdf'], a[href*='.pdf?']")) {
                String title = anchor.text().trim();
                Department dept = detectDepartment(title);
                if (dept == null) continue; // Only MCA/MBA docs

                String sourceUrl = absolutizeUrl(anchor.absUrl("href"), EXAM_DOCS_BASE_URL);
                listings.add(new QuestionPaperListing(library.libraryName(), title, sourceUrl, dept));
            }
        }

        return listings;
    }

    private ExternalResourceDefinition buildQuestionPaperDefinition(
            QuestionPaperListing listing,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        String resourceKey = buildQuestionPaperKey(listing);
        Resource existing  = resourceRepository.findByResourceKey(resourceKey).orElse(null);
        DownloadedDocument downloadedDocument = resolveDownloadedDocument(listing.sourceUrl(), existing, downloadedFiles);
        PdfInsight pdfInsight = extractPdfInsight(downloadedDocument.content());

        Integer semester   = pdfInsight.semester().orElse(1);
        Integer year       = deriveAcademicYear(semester);
        String displayMonth = normalizeExamSeries(listing.libraryName());

        // Detect timetable/schedule documents and classify differently
        boolean isTimetable = isTimetableTitle(listing.title());

        if (isTimetable) {
            String subject     = "Examination Schedule";
            String title       = listing.department().name() + " Exam Timetable – " + displayMonth;
            String description = "Official SPPU " + listing.department().name()
                    + " examination timetable / schedule from the " + displayMonth + " feed.";
            String fileName    = buildQuestionPaperFileName(listing.department().name(), subject, displayMonth);

            return new ExternalResourceDefinition(
                    resourceKey,
                    title,
                    description,
                    ResourceType.ANNOUNCEMENT,
                    subject,
                    listing.department(),
                    year,
                    semester,
                    listing.sourceUrl(),
                    fileName
            );
        }

        String subject     = pdfInsight.subject().orElseGet(() -> displayMonth + " Question Paper");
        String title       = listing.department().name() + " " + subject + " – " + displayMonth;
        String description = "Official SPPU " + listing.department().name()
                + " question paper synced from the " + displayMonth + " examination feed.";
        String fileName    = buildQuestionPaperFileName(listing.department().name(), subject, displayMonth);

        return new ExternalResourceDefinition(
                resourceKey,
                title,
                description,
                ResourceType.QUESTION_PAPER,
                subject,
                listing.department(),
                year,
                semester,
                listing.sourceUrl(),
                fileName
        );
    }

    // ══════════════════════════════════════════════
    // 3. UNIVERSITY ANNOUNCEMENTS SYNC
    // ══════════════════════════════════════════════

    private void syncUniversityAnnouncements() {
        try {
            Document document   = fetchHtml(NEWS_ANNOUNCEMENTS_URL);
            int syncedCount     = 0;

            for (Element row : document.select("tr.ms-itmhover")) {
                Element linkElement = row.selectFirst("td.ms-vb-title a");
                if (linkElement == null) continue;

                String title     = linkElement.text().trim();
                String sourceUrl = absolutizeUrl(linkElement.absUrl("href"), "http://sppudocs.unipune.ac.in");

                // Only sync MBA/MCA or NEP-related announcements
                Department dept = detectDepartment(title);
                if (dept == null
                        && !title.toUpperCase().contains("NEP")
                        && !title.toUpperCase().contains("2024 PATTERN")) {
                    continue;
                }

                String resourceKey = "sppu-announcement-" + slugify(title);
                if (resourceRepository.existsByResourceKey(resourceKey)) continue;

                Resource resource = new Resource();
                resource.setResourceKey(resourceKey);
                resource.setTitle(title);
                resource.setDescription("Official SPPU announcement: " + title);
                resource.setType(ResourceType.ANNOUNCEMENT);
                resource.setSubject("University News");
                resource.setUploadedBy(SYSTEM_UPLOADER_ID);
                resource.setUploaderName(SYSTEM_UPLOADER_NAME);
                resource.setSourceUrl(sourceUrl);
                resource.setFileUrl(sourceUrl);
                resource.setDepartment(dept != null ? dept : Department.MCA);
                resource.setYear(1);
                resource.setSemester(1);

                Resource saved = resourceRepository.save(resource);
                notificationService.createResourceNotification(
                        saved.getId(),
                        saved.getTitle(),
                        saved.getDepartment(),
                        true
                );
                syncedCount++;
            }
            log.info("University announcement sync completed with {} new items", syncedCount);
        } catch (RuntimeException exception) {
            log.warn("Failed to sync university announcements: {}", exception.getMessage());
        }
    }

    // ══════════════════════════════════════════════
    // 4. CORE SYNC HELPER
    // ══════════════════════════════════════════════

    private void syncSingleResource(
            ExternalResourceDefinition definition,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        try {
            List<Resource> existingResources = mongoTemplate.find(
                    new org.springframework.data.mongodb.core.query.Query(
                            org.springframework.data.mongodb.core.query.Criteria.where("resourceKey").is(definition.resourceKey())
                    ).with(org.springframework.data.domain.Sort.by(
                            org.springframework.data.domain.Sort.Direction.DESC, "createdAt")),
                    Resource.class
            );

            boolean isNew = existingResources.isEmpty();
            Resource resource;

            if (!isNew) {
                resource = existingResources.get(0);
                // Clean up any duplicates
                if (existingResources.size() > 1) {
                    log.info("Found {} duplicates for resource key {}, cleaning up...", existingResources.size(), definition.resourceKey());
                    for (int i = 1; i < existingResources.size(); i++) {
                        resourceRepository.deleteById(existingResources.get(i).getId());
                    }
                }
            } else {
                resource = new Resource();
            }

            resource.setResourceKey(definition.resourceKey());
            resource.setTitle(definition.title());
            resource.setDescription(definition.description());
            resource.setType(definition.type());
            resource.setSubject(definition.subject());
            resource.setUploadedBy(SYSTEM_UPLOADER_ID);
            resource.setUploaderName(SYSTEM_UPLOADER_NAME);
            resource.setSourceUrl(definition.sourceUrl());
            resource.setFileName(definition.preferredFileName());
            resource.setContentType(PDF_CONTENT_TYPE);
            resource.setStorageFileName(null); // Do NOT store SPPU files on cloud
            resource.setDepartment(definition.department());
            resource.setYear(definition.year());
            resource.setSemester(definition.semester());

            Resource saved = resourceRepository.save(resource);
            saved.setFileUrl(definition.sourceUrl()); // Direct link to SPPU
            resourceRepository.save(saved);

            // Only fire notification for brand-new resources — not for re-syncs
            if (isNew) {
                notificationService.createResourceNotification(
                        saved.getId(),
                        saved.getTitle(),
                        saved.getDepartment(),
                        true
                );
                log.info("Synced NEW external academic resource: {}", definition.resourceKey());
            } else {
                log.debug("Updated existing external academic resource: {}", definition.resourceKey());
            }

        } catch (RuntimeException exception) {
            log.warn("Failed to sync external academic resource {}: {}", definition.resourceKey(), exception.getMessage());
        }
    }

    // ══════════════════════════════════════════════
    // 5. HTTP + DOCUMENT UTILITIES
    // ══════════════════════════════════════════════

    private LibraryFeed resolveLibraryFeed(String libraryName, String allItemsUrl) {
        int maxRetries = 3;
        int attempt    = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                HttpRequest request = baseRequest(allItemsUrl).build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() >= 400) {
                    throw new IllegalStateException("Received HTTP " + response.statusCode());
                }

                String resolvedUrl = response.uri().toString();
                Document document  = Jsoup.parse(response.body(), resolvedUrl);
                int lastPage       = extractLastPage(response.body());
                return new LibraryFeed(libraryName, resolvedUrl, document, lastPage);

            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while discovering SPPU library " + libraryName, exception);
            } catch (IOException exception) {
                attempt++;
                lastException = exception;
                log.warn("Attempt {} failed to resolve SPPU library {}: {}. Retrying...", attempt, libraryName, exception.getMessage());
                try {
                    Thread.sleep(3000L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Retry sleep interrupted", ie);
                }
            }
        }
        throw new IllegalStateException("Unable to discover SPPU library " + libraryName + " after " + maxRetries + " attempts", lastException);
    }

    private DownloadedDocument resolveDownloadedDocument(
            String sourceUrl,
            Resource existing,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        byte[] content   = fetchBinary(sourceUrl);
        String fileName  = resolveFileName(sourceUrl);
        return new DownloadedDocument(
                new FileStorageService.StoredFile(null, fileName, PDF_CONTENT_TYPE),
                content
        );
    }

    private FileStorageService.StoredFile resolveStoredFile(
            ExternalResourceDefinition definition,
            Resource resource,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        String fileName = definition.preferredFileName() == null || definition.preferredFileName().isBlank()
                ? resolveFileName(definition.sourceUrl())
                : definition.preferredFileName();
        return new FileStorageService.StoredFile(null, fileName, PDF_CONTENT_TYPE);
    }

    // ══════════════════════════════════════════════
    // 6. PDF METADATA EXTRACTION
    // ══════════════════════════════════════════════

    private PdfInsight extractPdfInsight(byte[] content) {
        if (content == null || content.length < 100) {
            log.warn("PDF content is too small or empty, skipping metadata extraction");
            return new PdfInsight(Optional.empty(), Optional.empty());
        }

        try (PDDocument document = Loader.loadPDF(content)) {
            if (document.isEncrypted()) {
                log.warn("PDF is encrypted, skipping metadata extraction");
                return new PdfInsight(Optional.empty(), Optional.empty());
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(2, document.getNumberOfPages()));
            String text = stripper.getText(document);
            return new PdfInsight(extractSubject(text), extractSemester(text));
        } catch (Exception exception) {
            log.warn("Unable to parse SPPU PDF metadata: {}. Continuing without metadata.", exception.getMessage());
            return new PdfInsight(Optional.empty(), Optional.empty());
        }
    }

    private Optional<String> extractSubject(String text) {
        Matcher matcher = SUBJECT_PATTERN.matcher(text);
        if (matcher.find()) {
            return Optional.of(cleanText(matcher.group(1)));
        }
        return Optional.empty();
    }

    private Optional<Integer> extractSemester(String text) {
        Matcher matcher = SEMESTER_PATTERN.matcher(text);
        if (!matcher.find()) return Optional.empty();

        String token = matcher.group(1).trim().toUpperCase(Locale.ROOT);
        return switch (token) {
            case "I",   "1" -> Optional.of(1);
            case "II",  "2" -> Optional.of(2);
            case "III", "3" -> Optional.of(3);
            case "IV",  "4" -> Optional.of(4);
            case "V",   "5" -> Optional.of(5);
            case "VI",  "6" -> Optional.of(6);
            default          -> Optional.empty();
        };
    }

    // ══════════════════════════════════════════════
    // 7. HTTP FETCH HELPERS
    // ══════════════════════════════════════════════

    private Document fetchHtml(String url) {
        int maxRetries = 3;
        int attempt    = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                HttpRequest request = baseRequest(url).build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() >= 400) {
                    throw new IllegalStateException("Received HTTP " + response.statusCode() + " for " + url);
                }
                return Jsoup.parse(response.body(), response.uri().toString());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("HTML fetch interrupted for " + url, exception);
            } catch (IOException exception) {
                attempt++;
                lastException = exception;
                log.warn("Attempt {} failed to fetch HTML from {}: {}. Retrying...", attempt, url, exception.getMessage());
                try {
                    Thread.sleep(3000L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Retry sleep interrupted", ie);
                }
            }
        }
        throw new IllegalStateException("Unable to fetch HTML from " + url + " after " + maxRetries + " attempts", lastException);
    }

    private byte[] fetchBinary(String sourceUrl) {
        int maxRetries = 3;
        int attempt    = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                HttpRequest request = baseRequest(sourceUrl).build();
                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() >= 400) {
                    throw new IllegalStateException("Received HTTP " + response.statusCode() + " for " + sourceUrl);
                }
                return response.body();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("External academic document download was interrupted", exception);
            } catch (IOException exception) {
                attempt++;
                lastException = exception;
                log.warn("Attempt {} failed to download binary from {}: {}. Retrying...", attempt, sourceUrl, exception.getMessage());
                try {
                    Thread.sleep(3000L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Retry sleep interrupted", ie);
                }
            }
        }
        throw new IllegalStateException("Unable to download external academic document from " + sourceUrl + " after " + maxRetries + " attempts", lastException);
    }

    private HttpRequest.Builder baseRequest(String url) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .GET();
    }

    // ══════════════════════════════════════════════
    // 8. STRING / URL UTILITIES
    // ══════════════════════════════════════════════

    private int extractLastPage(String html) {
        Matcher matcher = LAST_PAGE_PATTERN.matcher(html);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 1;
    }

    private String buildLibraryPageUrl(String baseViewUrl, int page) {
        return page <= 1
                ? baseViewUrl
                : baseViewUrl + (baseViewUrl.contains("?") ? "&" : "?") + "CurrentPage=" + page;
    }

    private boolean isTimetableTitle(String title) {
        return TIMETABLE_PATTERN.matcher(title).find();
    }

    private Department detectDepartment(String title) {
        String normalized = cleanText(title).toUpperCase(Locale.ROOT);
        if (normalized.contains("M.C.A") || normalized.contains("MCA")) return Department.MCA;
        if (normalized.contains("M.B.A") || normalized.contains("MBA")) return Department.MBA;
        return null;
    }

    private String buildQuestionPaperKey(QuestionPaperListing listing) {
        return "sppu-" + slugify(listing.libraryName()) + "-" + slugify(resolveFileName(listing.sourceUrl()));
    }

    private String buildQuestionPaperFileName(String dept, String subject, String examSeries) {
        return slugify(dept + " " + subject + " " + examSeries) + ".pdf";
    }

    private Integer deriveAcademicYear(Integer semester) {
        if (semester == null || semester <= 0) return 1;
        return ((semester - 1) / 2) + 1;
    }

    private String normalizeExamSeries(String libraryName) {
        return cleanText(libraryName)
                .replace(" - ", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String resolveFileName(String sourceUrl) {
        String sanitizedUrl = sourceUrl.contains("?") ? sourceUrl.substring(0, sourceUrl.indexOf('?')) : sourceUrl;
        int lastSlashIndex  = sanitizedUrl.lastIndexOf('/');
        if (lastSlashIndex >= 0 && lastSlashIndex < sanitizedUrl.length() - 1) {
            String rawFileName = sanitizedUrl.substring(lastSlashIndex + 1);
            return URLDecoder.decode(rawFileName, StandardCharsets.UTF_8).replace(' ', '-');
        }
        return "academic-resource.pdf";
    }

    private String absolutizeUrl(String url, String base) {
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        return base + (url.startsWith("/") ? "" : "/") + url;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "")
                .toLowerCase(Locale.ROOT);
    }

    private String cleanText(String value) {
        return value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
    }

    // ══════════════════════════════════════════════
    // 9. RECORD TYPES (INTERNAL DATA STRUCTURES)
    // ══════════════════════════════════════════════

    private record ExternalResourceDefinition(
            String resourceKey,
            String title,
            String description,
            ResourceType type,
            String subject,
            Department department,
            Integer year,
            Integer semester,
            String sourceUrl,
            String preferredFileName
    ) {}

    private record LibraryFeed(String libraryName, String baseViewUrl, Document firstPageDocument, int lastPage) {}

    private record QuestionPaperListing(String libraryName, String title, String sourceUrl, Department department) {}

    private record SyllabusListing(String libraryName, String title, String sourceUrl, Department department) {}

    private record DownloadedDocument(FileStorageService.StoredFile storedFile, byte[] content) {}

    private record PdfInsight(Optional<String> subject, Optional<Integer> semester) {}
}
