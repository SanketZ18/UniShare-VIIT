package com.unishare.service.impl;

import com.unishare.model.Resource;
import com.unishare.model.enums.Department;
import com.unishare.model.enums.ResourceType;
import com.unishare.repository.ResourceRepository;
import com.unishare.service.ExternalAcademicContentService;
import com.unishare.service.FileStorageService;
import com.unishare.service.NotificationService;
import java.io.ByteArrayInputStream;
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
    private static final String RESOURCE_BASE_URL = "http://collegecirculars.unipune.ac.in";
    private static final String MOBILE_LIBRARY_LIST_URL = RESOURCE_BASE_URL + "/sites/examdocs/_layouts/mobile/mbllists.aspx";
    private static final String MCA_SYLLABUS_URL =
            "http://collegecirculars.unipune.ac.in/sites/documents/Syllabus2024/MCA%202024%20NEP%20Syllabus%20with%20CreditPoints%20Sem%20I%20and%20Sem%20II.pdf";
    private static final String MBA_SYLLABUS_URL =
            "http://collegecirculars.unipune.ac.in/sites/documents/Syllabus2024/FINAL%20MBA_Syllabus_2024_Pattern_NEP_2020_21082024.pdf";
    private static final String NEWS_ANNOUNCEMENTS_URL =
            "http://sppudocs.unipune.ac.in/sites/news_events/Lists/News%20and%20Announcements/AllItems.aspx";
    private static final String SYLLABUS_2024_LIST_URL =
            "http://collegecirculars.unipune.ac.in/sites/documents/Syllabus2024/Forms/AllItems.aspx";
    private static final String MBA_QUESTION_PAPERS_2025_URL =
            "http://collegecirculars.unipune.ac.in/sites/examdocs/APRIL%20%202025/M.B.A%20(%202024%20PATTERN%20).pdf";
    private static final String MCA_QUESTION_PAPERS_2025_URL =
            "http://collegecirculars.unipune.ac.in/sites/examdocs/APRIL%20%202025/M.C.A%20(%202024%20_PATTERN%20).pdf";
    private static final Pattern LAST_PAGE_PATTERN = Pattern.compile("__V_ctl00_LastPage\" value=\"(\\d+)\"");
    private static final Pattern SEMESTER_PATTERN = Pattern.compile("SEMESTER\\s*[-:]?\\s*(I{1,3}|IV|V|VI|[1-6])", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUBJECT_PATTERN =
            Pattern.compile(":[\\s]*([^\\r\\n]+?)\\s*\\(([A-Z]{2,}[\\s\\-]*\\d+[A-Z\\s]*)\\)", Pattern.CASE_INSENSITIVE);

    private final ResourceRepository resourceRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final AtomicBoolean syncInProgress = new AtomicBoolean(false);

    @Value("${app.bootstrap.external-resources.enabled:true}")
    private boolean externalResourcesEnabled;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    @Override
    public void syncConfiguredResources() {
        if (!externalResourcesEnabled) {
            log.info("External academic resource sync is disabled");
            return;
        }

        if (!syncInProgress.compareAndSet(false, true)) {
            log.info("External academic resource sync skipped because another sync is already in progress");
            return;
        }

        try {
            Map<String, FileStorageService.StoredFile> downloadedFiles = new HashMap<>();
            syncStaticSyllabus(downloadedFiles);
            syncDynamicQuestionPapers(downloadedFiles);
            syncUniversityAnnouncements();
        } finally {
            syncInProgress.set(false);
        }
    }

    private void syncStaticSyllabus(Map<String, FileStorageService.StoredFile> downloadedFiles) {
        List<ExternalResourceDefinition> definitions = List.of(
                new ExternalResourceDefinition(
                        "sppu-mca-nep-2024-syllabus-sem-1",
                        "MCA 2024 NEP Syllabus - Semester I",
                        "Official Savitribai Phule Pune University MCA 2024 NEP syllabus with credit points for Semester I.",
                        ResourceType.SYLLABUS,
                        "Semester I Curriculum",
                        Department.MCA,
                        1,
                        1,
                        MCA_SYLLABUS_URL,
                        "MCA-2024-NEP-Syllabus-Sem-I-II.pdf"
                ),
                new ExternalResourceDefinition(
                        "sppu-mca-nep-2024-syllabus-sem-2",
                        "MCA 2024 NEP Syllabus - Semester II",
                        "Official Savitribai Phule Pune University MCA 2024 NEP syllabus with credit points for Semester II.",
                        ResourceType.SYLLABUS,
                        "Semester II Curriculum",
                        Department.MCA,
                        1,
                        2,
                        MCA_SYLLABUS_URL,
                        "MCA-2024-NEP-Syllabus-Sem-I-II.pdf"
                ),
                new ExternalResourceDefinition(
                        "sppu-mba-nep-2024-syllabus-sem-1",
                        "MBA 2024 NEP Syllabus - Semester I",
                        "Official Savitribai Phule Pune University MBA 2024 NEP syllabus with credit points for Semester I.",
                        ResourceType.SYLLABUS,
                        "Semester I Curriculum",
                        Department.MBA,
                        1,
                        1,
                        MBA_SYLLABUS_URL,
                        "MBA-2024-NEP-Syllabus-Sem-I-II.pdf"
                ),
                new ExternalResourceDefinition(
                        "sppu-mba-nep-2024-syllabus-sem-2",
                        "MBA 2024 NEP Syllabus - Semester II",
                        "Official Savitribai Phule Pune University MBA 2024 NEP syllabus with credit points for Semester II.",
                        ResourceType.SYLLABUS,
                        "Semester II Curriculum",
                        Department.MBA,
                        1,
                        2,
                        MBA_SYLLABUS_URL,
                        "MBA-2024-NEP-Syllabus-Sem-I-II.pdf"
                ),
                new ExternalResourceDefinition(
                        "sppu-mba-2024-papers-april-2025",
                        "MBA 2024 Pattern Question Papers - April 2025 Compilation",
                        "Compiled official SPPU MBA 2024 pattern question papers for all subjects from the April 2025 examination series.",
                        ResourceType.QUESTION_PAPER,
                        "All Subjects (2024 Pattern)",
                        Department.MBA,
                        1,
                        1,
                        MBA_QUESTION_PAPERS_2025_URL,
                        "MBA-2024-Pattern-Papers-April-2025.pdf"
                ),
                new ExternalResourceDefinition(
                        "sppu-mca-2024-papers-april-2025",
                        "MCA 2024 Pattern Question Papers - April 2025 Compilation",
                        "Compiled official SPPU MCA 2024 pattern question papers for all subjects from the April 2025 examination series.",
                        ResourceType.QUESTION_PAPER,
                        "All Subjects (2024 Pattern)",
                        Department.MCA,
                        1,
                        1,
                        MCA_QUESTION_PAPERS_2025_URL,
                        "MCA-2024-Pattern-Papers-April-2025.pdf"
                )
        );

        for (ExternalResourceDefinition definition : definitions) {
            syncSingleResource(definition, downloadedFiles);
        }
    }

    private void syncDynamicQuestionPapers(Map<String, FileStorageService.StoredFile> downloadedFiles) {
        List<LibraryFeed> libraries = discoverExamLibraries();
        int syncedCount = 0;

        for (LibraryFeed library : libraries) {
            for (QuestionPaperListing listing : discoverQuestionPapers(library)) {
                try {
                    ExternalResourceDefinition definition = buildQuestionPaperDefinition(listing, downloadedFiles);
                    syncSingleResource(definition, downloadedFiles);
                    syncedCount++;
                } catch (RuntimeException exception) {
                    log.warn("Failed to sync question paper {}: {}", listing.title(), exception.getMessage());
                }
            }
        }

        log.info("Dynamic question paper sync completed with {} resources processed", syncedCount);
    }

    private void syncUniversityAnnouncements() {
        try {
            Document document = fetchHtml(NEWS_ANNOUNCEMENTS_URL);
            int syncedCount = 0;

            for (Element row : document.select("tr.ms-itmhover")) {
                Element linkElement = row.selectFirst("td.ms-vb-title a");
                if (linkElement == null) continue;

                String title = linkElement.text().trim();
                String sourceUrl = absolutizeUrlWithBase(linkElement.absUrl("href"), "http://sppudocs.unipune.ac.in");
                
                // Only sync MBA/MCA related announcements
                Department dept = detectDepartment(title);
                if (dept == null && !title.toUpperCase().contains("NEP") && !title.toUpperCase().contains("2024 PATTERN")) {
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
                resource.setFileUrl(sourceUrl); // For announcements, fileUrl is the external link
                resource.setDepartment(dept != null ? dept : Department.MCA); // Default to MCA for general NEP news
                resource.setYear(1);
                resource.setSemester(1);

                resourceRepository.save(resource);
                syncedCount++;
            }
            log.info("University announcement sync completed with {} new items", syncedCount);
        } catch (RuntimeException exception) {
            log.warn("Failed to sync university announcements: {}", exception.getMessage());
        }
    }

    private String absolutizeUrlWithBase(String url, String base) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return base + (url.startsWith("/") ? "" : "/") + url;
    }

    private List<LibraryFeed> discoverExamLibraries() {
        Document firstPage = fetchHtml(MOBILE_LIBRARY_LIST_URL);
        int lastPage = extractLastPage(firstPage.html());
        Map<String, LibraryFeed> libraries = new LinkedHashMap<>();

        for (int currentPage = 1; currentPage <= lastPage; currentPage++) {
            String pageUrl = currentPage == 1 ? MOBILE_LIBRARY_LIST_URL : MOBILE_LIBRARY_LIST_URL + "?CurrentPage=" + currentPage;
            Document pageDocument = currentPage == 1 ? firstPage : fetchHtml(pageUrl);

            for (Element anchor : pageDocument.select("a[href*='/Forms/AllItems.aspx']")) {
                String libraryName = anchor.text().trim();
                if (libraryName.isBlank()) {
                    continue;
                }

                String allItemsUrl = absolutizeUrl(anchor.absUrl("href"));
                libraries.putIfAbsent(allItemsUrl, resolveLibraryFeed(libraryName, allItemsUrl));
            }
        }

        return new ArrayList<>(libraries.values());
    }

    private LibraryFeed resolveLibraryFeed(String libraryName, String allItemsUrl) {
        int maxRetries = 3;
        int attempt = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                HttpRequest request = baseRequest(allItemsUrl).build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() >= 400) {
                    throw new IllegalStateException("Received HTTP " + response.statusCode());
                }

                String resolvedUrl = response.uri().toString();
                Document document = Jsoup.parse(response.body(), resolvedUrl);
                int lastPage = extractLastPage(response.body());
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

    private List<QuestionPaperListing> discoverQuestionPapers(LibraryFeed library) {
        List<QuestionPaperListing> listings = new ArrayList<>();

        for (int currentPage = 1; currentPage <= library.lastPage(); currentPage++) {
            String pageUrl = buildLibraryPageUrl(library.baseViewUrl(), currentPage);
            Document document = currentPage == 1 ? library.firstPageDocument() : fetchHtml(pageUrl);

            for (Element anchor : document.select("a[href$='.pdf'], a[href*='.pdf?']")) {
                String title = anchor.text().trim();
                Department dept = detectDepartment(title);
                if (dept == null || !is2024PatternTitle(title)) {
                    continue;
                }

                String sourceUrl = absolutizeUrl(anchor.absUrl("href"));
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
        Resource existing = resourceRepository.findByResourceKey(resourceKey).orElse(null);
        DownloadedDocument downloadedDocument = resolveDownloadedDocument(listing.sourceUrl(), existing, downloadedFiles);
        PdfInsight pdfInsight = extractPdfInsight(downloadedDocument.content());

        Integer semester = pdfInsight.semester().orElse(1);
        Integer year = deriveAcademicYear(semester);
        String subject = pdfInsight.subject().orElseGet(() -> normalizeExamSeries(listing.libraryName()) + " Question Paper");
        String displayMonth = normalizeExamSeries(listing.libraryName());

        return new ExternalResourceDefinition(
                resourceKey,
                listing.department().name() + " " + subject + " Question Paper - " + displayMonth,
                "Official SPPU " + listing.department().name() + " 2024 pattern question paper synced from the " + displayMonth + " examination feed.",
                ResourceType.QUESTION_PAPER,
                subject,
                listing.department(),
                year,
                semester,
                listing.sourceUrl(),
                buildQuestionPaperFileName(listing.department().name(), subject, displayMonth)
        );
    }

    private void syncSingleResource(
            ExternalResourceDefinition definition,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        try {
            Resource resource = resourceRepository.findByResourceKey(definition.resourceKey())
                    .orElseGet(Resource::new);
            FileStorageService.StoredFile storedFile = resolveStoredFile(definition, resource, downloadedFiles);

            resource.setResourceKey(definition.resourceKey());
            resource.setTitle(definition.title());
            resource.setDescription(definition.description());
            resource.setType(definition.type());
            resource.setSubject(definition.subject());
            resource.setUploadedBy(SYSTEM_UPLOADER_ID);
            resource.setUploaderName(SYSTEM_UPLOADER_NAME);
            resource.setSourceUrl(definition.sourceUrl());
            resource.setFileName(storedFile.originalFileName());
            resource.setContentType(storedFile.contentType());
            resource.setStorageFileName(storedFile.storageFileName());
            resource.setDepartment(definition.department());
            resource.setYear(definition.year());
            resource.setSemester(definition.semester());

            Resource saved = resourceRepository.save(resource);
            saved.setFileUrl("/api/resources/" + saved.getId() + "/download");
            resourceRepository.save(saved);
            
            notificationService.createResourceNotification(
                    saved.getId(), 
                    saved.getTitle(), 
                    saved.getDepartment(), 
                    true
            );
            
            log.info("Synced external academic resource {}", definition.resourceKey());
        } catch (RuntimeException exception) {
            log.warn("Failed to sync external academic resource {}: {}", definition.resourceKey(), exception.getMessage());
        }
    }

    private DownloadedDocument resolveDownloadedDocument(
            String sourceUrl,
            Resource existing,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        if (existing != null && existing.getStorageFileName() != null && !existing.getStorageFileName().isBlank() && fileStorageService.exists(existing.getStorageFileName())) {
            return new DownloadedDocument(
                    new FileStorageService.StoredFile(
                            existing.getStorageFileName(),
                            existing.getFileName(),
                            existing.getContentType()
                    ),
                    fetchBinary(sourceUrl)
            );
        }

        byte[] content = fetchBinary(sourceUrl);
        String fileName = resolveFileName(sourceUrl);
        String contentType = PDF_CONTENT_TYPE;
        FileStorageService.StoredFile storedFile = downloadedFiles.computeIfAbsent(
                sourceUrl,
                ignored -> fileStorageService.store(content, fileName, contentType)
        );
        return new DownloadedDocument(storedFile, content);
    }

    private FileStorageService.StoredFile resolveStoredFile(
            ExternalResourceDefinition definition,
            Resource resource,
            Map<String, FileStorageService.StoredFile> downloadedFiles
    ) {
        if (resource.getStorageFileName() != null && !resource.getStorageFileName().isBlank() && fileStorageService.exists(resource.getStorageFileName())) {
            FileStorageService.StoredFile storedFile = new FileStorageService.StoredFile(
                    resource.getStorageFileName(),
                    resource.getFileName(),
                    resource.getContentType()
            );
            downloadedFiles.putIfAbsent(definition.sourceUrl(), storedFile);
            return storedFile;
        }

        byte[] content = fetchBinary(definition.sourceUrl());
        String fileName = definition.preferredFileName() == null || definition.preferredFileName().isBlank()
                ? resolveFileName(definition.sourceUrl())
                : definition.preferredFileName();
        String contentType = PDF_CONTENT_TYPE;
        return downloadedFiles.computeIfAbsent(
                definition.sourceUrl(),
                ignored -> fileStorageService.store(content, fileName, contentType)
        );
    }

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
            
            PDFTextStripper textStripper = new PDFTextStripper();
            textStripper.setStartPage(1);
            textStripper.setEndPage(Math.min(2, document.getNumberOfPages()));
            String text = textStripper.getText(document);
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
        if (!matcher.find()) {
            return Optional.empty();
        }

        String token = matcher.group(1).trim().toUpperCase(Locale.ROOT);
        return switch (token) {
            case "I", "1" -> Optional.of(1);
            case "II", "2" -> Optional.of(2);
            case "III", "3" -> Optional.of(3);
            case "IV", "4" -> Optional.of(4);
            case "V", "5" -> Optional.of(5);
            case "VI", "6" -> Optional.of(6);
            default -> Optional.empty();
        };
    }

    private Document fetchHtml(String url) {
        int maxRetries = 3;
        int attempt = 0;
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
        int attempt = 0;
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

    private int extractLastPage(String html) {
        Matcher matcher = LAST_PAGE_PATTERN.matcher(html);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 1;
    }

    private String buildLibraryPageUrl(String baseViewUrl, int page) {
        return page <= 1 ? baseViewUrl : baseViewUrl + (baseViewUrl.contains("?") ? "&" : "?") + "CurrentPage=" + page;
    }

    private boolean is2024PatternTitle(String title) {
        String normalized = cleanText(title).toUpperCase(Locale.ROOT);
        return normalized.contains("2024") && normalized.contains("PATTERN");
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
        if (semester == null || semester <= 0) {
            return 1;
        }
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
        int lastSlashIndex = sanitizedUrl.lastIndexOf('/');
        if (lastSlashIndex >= 0 && lastSlashIndex < sanitizedUrl.length() - 1) {
            String rawFileName = sanitizedUrl.substring(lastSlashIndex + 1);
            return URLDecoder.decode(rawFileName, StandardCharsets.UTF_8).replace(' ', '-');
        }
        return "academic-resource.pdf";
    }

    private String absolutizeUrl(String url) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return RESOURCE_BASE_URL + url;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String collapsed = normalized
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        return collapsed.toLowerCase(Locale.ROOT);
    }

    private String cleanText(String value) {
        return value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
    }

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
    ) {
    }

    private record LibraryFeed(String libraryName, String baseViewUrl, Document firstPageDocument, int lastPage) {
    }

    private record QuestionPaperListing(String libraryName, String title, String sourceUrl, Department department) {
    }

    private record DownloadedDocument(FileStorageService.StoredFile storedFile, byte[] content) {
    }

    private record PdfInsight(Optional<String> subject, Optional<Integer> semester) {
    }
}
