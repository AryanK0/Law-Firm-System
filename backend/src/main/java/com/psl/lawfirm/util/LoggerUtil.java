package com.psl.lawfirm.util;

import com.psl.lawfirm.config.AppProperties;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.*;

/**
 * Logging Frameworks (java.util.logging)
 * Centralized logging utility configured with FileHandler and ConsoleHandler.
 */
public class LoggerUtil {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static boolean initialized = false;

    public static synchronized void initialize() {
        if (initialized) return;

        Logger rootLogger = Logger.getLogger("com.psl.lawfirm");
        rootLogger.setUseParentHandlers(false);

        // Clear any existing handlers
        Handler[] handlers = rootLogger.getHandlers();
        for (Handler h : handlers) {
            rootLogger.removeHandler(h);
        }

        // Custom clean Formatter
        Formatter customFormatter = new Formatter() {
            @Override
            public String format(LogRecord record) {
                String timestamp = LocalDateTime.now().format(FORMATTER);
                String level = record.getLevel().getName();
                String source = record.getSourceClassName();
                if (source != null && source.contains(".")) {
                    source = source.substring(source.lastIndexOf('.') + 1);
                }
                return String.format("[%s] [%-5s] [%s] %s%n",
                        timestamp, level, source != null ? source : "App", record.getMessage());
            }
        };

        // 1. Console Handler
        ConsoleHandler consoleHandler = new ConsoleHandler();
        consoleHandler.setLevel(Level.ALL);
        consoleHandler.setFormatter(customFormatter);
        rootLogger.addHandler(consoleHandler);

        // 2. File Handler (Persists application logs into configured directory)
        try {
            String logFilePath = AppProperties.getProperty("app.log.file", "logs/lawfirm_system.log");
            File logFile = new File(logFilePath);
            if (logFile.getParentFile() != null) {
                logFile.getParentFile().mkdirs();
            }

            FileHandler fileHandler = new FileHandler(logFilePath, 5 * 1024 * 1024, 3, true);
            fileHandler.setLevel(Level.ALL);
            fileHandler.setFormatter(customFormatter);
            rootLogger.addHandler(fileHandler);
        } catch (IOException e) {
            System.err.println("Failed to initialize FileHandler for logging: " + e.getMessage());
        }

        String levelStr = AppProperties.getProperty("app.log.level", "INFO");
        try {
            rootLogger.setLevel(Level.parse(levelStr.toUpperCase()));
        } catch (IllegalArgumentException e) {
            rootLogger.setLevel(Level.INFO);
        }

        initialized = true;
        rootLogger.info("Logger initialized successfully. Production Logging Engine Active.");
    }

    public static Logger getLogger(Class<?> clazz) {
        if (!initialized) {
            initialize();
        }
        return Logger.getLogger(clazz.getName());
    }
}
