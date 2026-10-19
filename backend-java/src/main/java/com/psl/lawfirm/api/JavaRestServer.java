package com.psl.lawfirm.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.psl.lawfirm.config.AppProperties;
import com.psl.lawfirm.config.DatabaseConfig;
import com.psl.lawfirm.dao.ClientDAOImpl;
import com.psl.lawfirm.model.CaseEntity;
import com.psl.lawfirm.model.Client;
import com.psl.lawfirm.model.TrustAccount;
import com.psl.lawfirm.service.CaseService;
import com.psl.lawfirm.service.TrustAccountingService;
import com.psl.lawfirm.util.DataPersistenceManager;
import com.psl.lawfirm.util.LoggerUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Enterprise Legal Platform: Enterprise Web Application Bridge
 * Embedded Lightweight REST API Server exposing Java DAOs, Services, File I/O & Serialization.
 */
public class JavaRestServer {
    private static final Logger LOGGER = LoggerUtil.getLogger(JavaRestServer.class);
    private static final Gson GSON = new GsonBuilder()
            .setPrettyPrinting()
            .registerTypeAdapter(LocalDate.class, (com.google.gson.JsonSerializer<LocalDate>) (src, typeOfSrc, context) -> 
                    new com.google.gson.JsonPrimitive(src.toString()))
            .registerTypeAdapter(LocalDate.class, (com.google.gson.JsonDeserializer<LocalDate>) (json, typeOfT, context) -> 
                    LocalDate.parse(json.getAsString()))
            .create();

    private final CaseService caseService = new CaseService();
    private final TrustAccountingService trustService = new TrustAccountingService();
    private final ClientDAOImpl clientDAO = new ClientDAOImpl();
    private HttpServer server;

    public void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        // Endpoints
        server.createContext("/api/health", new HealthHandler());
        server.createContext("/api/cases", new CasesHandler());
        server.createContext("/api/clients", new ClientsHandler());
        server.createContext("/api/trust-accounts", new TrustAccountsHandler());
        server.createContext("/api/persistence/export-csv", new ExportCsvHandler());
        server.createContext("/api/persistence/snapshot", new SnapshotHandler());

        server.setExecutor(null); // default executor
        server.start();
        LOGGER.info("Java Enterprise REST Server started on http://localhost:" + port);
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            LOGGER.info("Java REST Server stopped.");
        }
    }

    // CORS & JSON Helper
    private static void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        byte[] responseBytes = GSON.toJson(data).getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, responseBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }

    private class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "ONLINE");
            resp.put("engine", "Core Java 21 Enterprise Server");
            resp.put("platform", "Pearson Specter Litt Legal Platform");
            resp.put("version", "2.4.0-PROD");
            resp.put("databaseConnected", DatabaseConfig.testConnection());
            resp.put("timestamp", System.currentTimeMillis());
            resp.put("unitsImplemented", List.of(
                "Unit 1: Java Foundations & OOP",
                "Unit 2: Collections, Generics & Exceptions",
                "Unit 3: File I/O Streams, Serialization & Logging",
                "Unit 4: JDBC & DAO Pattern (MySQL)",
                "Unit 5: JavaFX Institutional UI"
            ));
            sendJsonResponse(exchange, 200, resp);
        }
    }

    private class CasesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                    List<CaseEntity> cases = caseService.getAllCases();
                    sendJsonResponse(exchange, 200, cases);
                } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
                    CaseEntity incoming = GSON.fromJson(isr, CaseEntity.class);
                    CaseEntity created = caseService.createCase(incoming);
                    sendJsonResponse(exchange, 201, created);
                } else {
                    sendJsonResponse(exchange, 405, Map.of("error", "Method Not Allowed"));
                }
            } catch (Exception e) {
                LOGGER.severe("CasesHandler error: " + e.getMessage());
                sendJsonResponse(exchange, 500, Map.of("error", e.getMessage()));
            }
        }
    }

    private class ClientsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                List<Client> clients = clientDAO.findAll();
                sendJsonResponse(exchange, 200, clients);
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, Map.of("error", e.getMessage()));
            }
        }
    }

    private class TrustAccountsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                List<TrustAccount> accounts = trustService.getAllAccounts();
                sendJsonResponse(exchange, 200, accounts);
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, Map.of("error", e.getMessage()));
            }
        }
    }

    private class ExportCsvHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                List<CaseEntity> cases = caseService.getAllCases();
                File exportFile = new File("storage/exports/cases_export_" + System.currentTimeMillis() + ".csv");
                DataPersistenceManager.exportCasesToCsv(cases, exportFile);
                sendJsonResponse(exchange, 200, Map.of(
                    "message", "Cases exported via Character Streams (BufferedWriter) successfully.",
                    "filePath", exportFile.getAbsolutePath(),
                    "totalRecords", cases.size()
                ));
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, Map.of("error", e.getMessage()));
            }
        }
    }

    private class SnapshotHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                List<CaseEntity> cases = caseService.getAllCases();
                List<Client> clients = clientDAO.findAll();
                File snapFile = new File("storage/snapshots/system_snapshot_" + System.currentTimeMillis() + ".ser");
                DataPersistenceManager.SystemSnapshot snapshot = new DataPersistenceManager.SystemSnapshot(cases, clients);
                DataPersistenceManager.saveSnapshot(snapshot, snapFile);

                sendJsonResponse(exchange, 200, Map.of(
                    "message", "System State serialized via ObjectOutputStream successfully.",
                    "filePath", snapFile.getAbsolutePath(),
                    "casesSerialized", cases.size(),
                    "clientsSerialized", clients.size()
                ));
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, Map.of("error", e.getMessage()));
            }
        }
    }

    public static void main(String[] args) {
        LoggerUtil.initialize();
        int port = Integer.parseInt(AppProperties.getProperty("server.port", "8085"));
        try {
            JavaRestServer server = new JavaRestServer();
            server.start(port);
            System.out.println("=================================================================");
            System.out.println("PEARSON SPECTER LITT | Enterprise Java Core Server");
            System.out.println("High-Throughput Legal Practice Core Engine Active");
            System.out.println("Listening on http://localhost:" + port);
            System.out.println("=================================================================");
        } catch (IOException e) {
            System.err.println("Failed to start Java REST server: " + e.getMessage());
        }
    }
}
