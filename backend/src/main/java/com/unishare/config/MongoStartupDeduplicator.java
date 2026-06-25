package com.unishare.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Arrays;

/**
 * Runs BEFORE MongoTemplate is instantiated to remove any duplicate documents
 * in the {@code staff} and {@code student} collections that would cause the
 * {@code @Indexed(unique=true)} index creation to fail with a DuplicateKeyException.
 */
@Slf4j
@Component("mongoStartupDeduplicator")
@RequiredArgsConstructor
public class MongoStartupDeduplicator {

    private final MongoClient mongoClient;
    private final Environment environment;

    @PostConstruct
    public void deduplicateOnStartup() {
        log.info("MongoStartupDeduplicator: checking for duplicate keys before MongoTemplate initializes...");
        
        // Extract database name from URI, fallback to 'test' or 'unishare'
        String uri = environment.getProperty("spring.data.mongodb.uri", "mongodb://localhost:27017/unishare");
        String dbName = "unishare";
        if (uri.contains("/")) {
            String[] parts = uri.split("/");
            dbName = parts[parts.length - 1];
            if (dbName.contains("?")) {
                dbName = dbName.split("\\?")[0];
            }
        }
        
        MongoDatabase db = mongoClient.getDatabase(dbName);

        deduplicateStaffCollection(db);
        deduplicateStudentCollection(db);
        
        log.info("MongoStartupDeduplicator: deduplication complete.");
    }

    private void deduplicateStaffCollection(MongoDatabase db) {
        MongoCollection<Document> collection = db.getCollection("staff");
        deduplicateByField(collection, "staffId");
        deduplicateByField(collection, "email");
    }

    private void deduplicateStudentCollection(MongoDatabase db) {
        MongoCollection<Document> collection = db.getCollection("students");
        deduplicateByField(collection, "prn");
        deduplicateByField(collection, "email");
    }

    private void deduplicateByField(MongoCollection<Document> collection, String field) {
        Map<Object, List<Object>> idsByValue = new HashMap<>();

        try (var cursor = collection.find().iterator()) {
            while (cursor.hasNext()) {
                Document doc = cursor.next();
                Object value = doc.get(field);
                if (value == null) continue;
                idsByValue.computeIfAbsent(value, k -> new ArrayList<>()).add(doc.get("_id"));
            }
        }

        int removed = 0;
        for (Map.Entry<Object, List<Object>> entry : idsByValue.entrySet()) {
            List<Object> ids = entry.getValue();
            if (ids.size() <= 1) continue;

            List<Object> duplicateIds = ids.subList(1, ids.size());
            collection.deleteMany(Filters.in("_id", duplicateIds));
            removed += duplicateIds.size();
            log.warn("MongoStartupDeduplicator: removed {} duplicate(s) in collection '{}' for {}='{}'",
                    duplicateIds.size(), collection.getNamespace().getCollectionName(),
                    field, entry.getKey());
        }

        if (removed == 0) {
            log.debug("MongoStartupDeduplicator: no duplicates found in '{}' for field '{}'",
                    collection.getNamespace().getCollectionName(), field);
        }
    }

    /**
     * Forces Spring to initialize this bean BEFORE MongoTemplate, so the cleanup
     * happens before MongoTemplate attempts to create unique indexes in its constructor.
     */
    @Component
    public static class MongoTemplateDependencyPostProcessor implements BeanFactoryPostProcessor {
        @Override
        public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
            String[] mongoTemplateBeans = beanFactory.getBeanNamesForType(org.springframework.data.mongodb.core.MongoTemplate.class, true, false);
            for (String beanName : mongoTemplateBeans) {
                BeanDefinition bd = beanFactory.getBeanDefinition(beanName);
                String[] dependsOn = bd.getDependsOn();
                if (dependsOn == null) {
                    bd.setDependsOn("mongoStartupDeduplicator");
                } else {
                    String[] newDependsOn = Arrays.copyOf(dependsOn, dependsOn.length + 1);
                    newDependsOn[dependsOn.length] = "mongoStartupDeduplicator";
                    bd.setDependsOn(newDependsOn);
                }
            }
        }
    }
}
