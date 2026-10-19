package com.psl.lawfirm.util;

import com.psl.lawfirm.config.AppProperties;
import com.psl.lawfirm.model.CaseEntity;
import com.psl.lawfirm.model.Client;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * File Handling, Data Persistence & Serialization
 * Demonstrates:
 * - Character Streams: BufferedReader and BufferedWriter
 * - Byte Streams: FileInputStream and FileOutputStream
 * - Object Serialization: ObjectOutputStream and ObjectInputStream
 * - Logging integration via java.util.logging
 */
public class DataPersistenceManager {
    private static final Logger LOGGER = LoggerUtil.getLogger(DataPersistenceManager.class);

    /**
     * Snapshot container class for Object Serialization
     */
    public static class SystemSnapshot implements Serializable {
        private static final long serialVersionUID = 1L;
        private final long timestamp;
        private final List<CaseEntity> cases;
        private final List<Client> clients;

        public SystemSnapshot(List<CaseEntity> cases, List<Client> clients) {
            this.timestamp = System.currentTimeMillis();
            this.cases = new ArrayList<>(cases);
            this.clients = new ArrayList<>(clients);
        }

        public long getTimestamp() { return timestamp; }
        public List<CaseEntity> getCases() { return cases; }
        public List<Client> getClients() { return clients; }
    }

    // =========================================================================
    // 1. CHARACTER STREAMS (BufferedReader & BufferedWriter)
    // =========================================================================

    /**
     * Exports a list of cases to a CSV file using Character Streams.
     */
    public static void exportCasesToCsv(List<CaseEntity> cases, File outputFile) throws IOException {
        if (outputFile.getParentFile() != null) {
            outputFile.getParentFile().mkdirs();
        }

        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(
                new FileOutputStream(outputFile), StandardCharsets.UTF_8))) {
            // Write CSV Header
            writer.write("CaseID,CaseCode,Title,CaseType,ClientID,Status,Confidentiality,StartDate,LegalHold,OpposingParty");
            writer.newLine();

            for (CaseEntity c : cases) {
                String line = String.format("%d,\"%s\",\"%s\",\"%s\",%d,\"%s\",\"%s\",%s,%b,\"%s\"",
                        c.getId() != null ? c.getId() : 0,
                        escapeCsv(c.getCaseCode()),
                        escapeCsv(c.getTitle()),
                        escapeCsv(c.getCaseType()),
                        c.getClientId() != null ? c.getClientId() : 0,
                        escapeCsv(c.getStatus()),
                        escapeCsv(c.getConfidentialityLevel()),
                        c.getStartDate() != null ? c.getStartDate().toString() : "",
                        c.isLegalHold(),
                        escapeCsv(c.getOpposingParty())
                );
                writer.write(line);
                writer.newLine();
            }
            writer.flush();
            LOGGER.info("Exported " + cases.size() + " cases to CSV: " + outputFile.getAbsolutePath());
        }
    }

    /**
     * Reads cases from a CSV file using Character Streams (BufferedReader).
     */
    public static List<CaseEntity> importCasesFromCsv(File inputFile) throws IOException {
        List<CaseEntity> imported = new ArrayList<>();
        if (!inputFile.exists()) {
            throw new FileNotFoundException("File not found: " + inputFile.getAbsolutePath());
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new FileInputStream(inputFile), StandardCharsets.UTF_8))) {
            String line = reader.readLine(); // Skip header
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] tokens = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (tokens.length >= 6) {
                    CaseEntity c = new CaseEntity();
                    c.setCaseCode(cleanToken(tokens[1]));
                    c.setTitle(cleanToken(tokens[2]));
                    c.setCaseType(cleanToken(tokens[3]));
                    try {
                        c.setClientId(Long.parseLong(cleanToken(tokens[4])));
                    } catch (NumberFormatException e) {
                        c.setClientId(1L);
                    }
                    c.setStatus(cleanToken(tokens[5]));
                    if (tokens.length > 7 && !cleanToken(tokens[7]).isEmpty()) {
                        try {
                            c.setStartDate(LocalDate.parse(cleanToken(tokens[7])));
                        } catch (Exception ignored) {}
                    }
                    imported.add(c);
                }
            }
        }
        LOGGER.info("Imported " + imported.size() + " cases from CSV: " + inputFile.getName());
        return imported;
    }

    // =========================================================================
    // 2. BYTE STREAMS (FileInputStream & FileOutputStream)
    // =========================================================================

    /**
     * Vaults a binary document using raw Byte Streams with buffered transfer.
     */
    public static File vaultBinaryDocument(File sourceFile, String targetFileName) throws IOException {
        String vaultDir = AppProperties.getProperty("app.storage.dir", "storage/s3_vault");
        File targetDir = new File(vaultDir);
        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }

        File targetFile = new File(targetDir, targetFileName);
        try (FileInputStream inStream = new FileInputStream(sourceFile);
             FileOutputStream outStream = new FileOutputStream(targetFile)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            long totalBytes = 0;
            while ((bytesRead = inStream.read(buffer)) != -1) {
                outStream.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }
            outStream.flush();
            LOGGER.info(String.format("Vaulted %d bytes to %s via Byte Streams", totalBytes, targetFile.getAbsolutePath()));
        }
        return targetFile;
    }

    // =========================================================================
    // 3. OBJECT SERIALIZATION & DESERIALIZATION
    // =========================================================================

    /**
     * Serializes complete application state graph into binary snapshot (.ser).
     */
    public static void saveSnapshot(SystemSnapshot snapshot, File targetFile) throws IOException {
        if (targetFile.getParentFile() != null) {
            targetFile.getParentFile().mkdirs();
        }

        try (ObjectOutputStream oos = new ObjectOutputStream(
                new BufferedOutputStream(new FileOutputStream(targetFile)))) {
            oos.writeObject(snapshot);
            oos.flush();
            LOGGER.info("System snapshot serialized successfully to: " + targetFile.getAbsolutePath());
        }
    }

    /**
     * Deserializes binary snapshot back into memory.
     */
    public static SystemSnapshot loadSnapshot(File sourceFile) throws IOException, ClassNotFoundException {
        if (!sourceFile.exists()) {
            throw new FileNotFoundException("Snapshot not found: " + sourceFile.getAbsolutePath());
        }

        try (ObjectInputStream ois = new ObjectInputStream(
                new BufferedInputStream(new FileInputStream(sourceFile)))) {
            SystemSnapshot snapshot = (SystemSnapshot) ois.readObject();
            LOGGER.info("System snapshot deserialized successfully. Total cases: " + snapshot.getCases().size());
            return snapshot;
        }
    }

    private static String escapeCsv(String str) {
        if (str == null) return "";
        return str.replace("\"", "\"\"");
    }

    private static String cleanToken(String token) {
        if (token == null) return "";
        token = token.trim();
        if (token.startsWith("\"") && token.endsWith("\"") && token.length() >= 2) {
            return token.substring(1, token.length() - 1).replace("\"\"", "\"");
        }
        return token;
    }
}
