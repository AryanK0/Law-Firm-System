package com.psl.lawfirm.config;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import java.util.Optional;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Unit 3: Application Configuration Files (.properties usage)
 * Singleton utility to load and access properties.
 */
public class AppProperties {
    private static final Logger LOGGER = Logger.getLogger(AppProperties.class.getName());
    private static final Properties properties = new Properties();

    static {
        loadProperties();
    }

    private static void loadProperties() {
        try (InputStream input = AppProperties.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (input != null) {
                properties.load(input);
                LOGGER.info("Successfully loaded application.properties from classpath.");
            } else {
                // Fallback to local file path
                try (FileInputStream fileInput = new FileInputStream("src/main/resources/application.properties")) {
                    properties.load(fileInput);
                    LOGGER.info("Loaded application.properties from relative path.");
                } catch (IOException e) {
                    LOGGER.log(Level.WARNING, "application.properties not found on relative path; using system defaults.");
                }
            }
        } catch (IOException ex) {
            LOGGER.log(Level.SEVERE, "Failed to load application.properties: " + ex.getMessage(), ex);
        }
    }

    public static String get(String key) {
        return properties.getProperty(key);
    }

    public static String getProperty(String key) {
        return properties.getProperty(key);
    }

    public static String getProperty(String key, String defaultValue) {
        return properties.getProperty(key, defaultValue);
    }

    public static String getOrDefault(String key, String defaultValue) {
        return properties.getProperty(key, defaultValue);
    }

    public static int getInt(String key, int defaultValue) {
        String val = properties.getProperty(key);
        if (val == null || val.trim().isEmpty()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(val.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public static Optional<String> getOptional(String key) {
        return Optional.ofNullable(properties.getProperty(key));
    }
}
