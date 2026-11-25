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
import java.util.LinkedHashMap;
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

        // Endpoints (both /api/* and root/* for seamless frontend interoperability)
        server.createContext("/api/health", new HealthHandler());
        server.createContext("/health", new HealthHandler());
        server.createContext("/api/cases", new CasesHandler());
        server.createContext("/cases", new CasesHandler());
        server.createContext("/api/clients", new ClientsHandler());
        server.createContext("/clients", new ClientsHandler());
        server.createContext("/api/trust-accounts", new TrustAccountsHandler());
        server.createContext("/trust-accounts", new TrustAccountsHandler());
        server.createContext("/api/access/dashboard", new AccessDashboardHandler());
        server.createContext("/access/dashboard", new AccessDashboardHandler());
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
            resp.put("engine", "Core Java 21 LTS Enterprise Server");
            resp.put("platform", "Pearson Specter Litt Legal Platform");
            resp.put("version", "2.4.0-PROD");
            resp.put("databaseConnected", DatabaseConfig.testConnection());
            resp.put("timestamp", System.currentTimeMillis());
            resp.put("subsystems", List.of(
                "Domain Modeling & Entity Abstraction",
                "Collections Engine, Business Validation & Guardrails",
                "Multi-Stream Data Persistence & Object Serialization",
                "JDBC DAO Data Access Layer with Transaction Rollback",
                "Enterprise Operations Console Architecture"
            ));
            sendJsonResponse(exchange, 200, resp);
        }
    }

    private class CasesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                    String query = exchange.getRequestURI().getQuery();
                    Long empId = null;
                    if (query != null && query.contains("employee_id=")) {
                        for (String param : query.split("&")) {
                            if (param.startsWith("employee_id=")) {
                                try {
                                    empId = Long.parseLong(param.substring("employee_id=".length()));
                                } catch (NumberFormatException ignored) {}
                            }
                        }
                    }
                    List<CaseEntity> cases = (empId != null)
                        ? caseService.getCasesForEmployee(empId)
                        : caseService.getAllCases();
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

    private static Map<String, Object> createCaseAccessRow(int accessId, int caseId, String code, String title, int empId, String empName, String role, boolean canView, boolean canEdit, boolean canUpload, boolean canAssign) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("case_access_id", accessId);
        map.put("case_id", caseId);
        map.put("case_code", code);
        map.put("title", title);
        map.put("employee_id", empId);
        map.put("employee_name", empName);
        map.put("case_role", role);
        map.put("can_view", canView);
        map.put("can_edit", canEdit);
        map.put("can_upload_docs", canUpload);
        map.put("can_assign_members", canAssign);
        return map;
    }

    private class AccessDashboardHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                List<Map<String, Object>> hierarchy = List.of(
                    Map.of("title", "Managing Partner", "rank_no", 8, "can_assign_case", true, "can_approve_billing", true, "can_override_access", true, "can_run_recovery", true),
                    Map.of("title", "Partner", "rank_no", 7, "can_assign_case", true, "can_approve_billing", true, "can_override_access", true, "can_run_recovery", false),
                    Map.of("title", "Senior Associate", "rank_no", 6, "can_assign_case", true, "can_approve_billing", false, "can_override_access", false, "can_run_recovery", false),
                    Map.of("title", "Associate", "rank_no", 5, "can_assign_case", false, "can_approve_billing", false, "can_override_access", false, "can_run_recovery", false),
                    Map.of("title", "Paralegal", "rank_no", 4, "can_assign_case", false, "can_approve_billing", false, "can_override_access", false, "can_run_recovery", false),
                    Map.of("title", "IT Admin", "rank_no", 3, "can_assign_case", false, "can_approve_billing", false, "can_override_access", true, "can_run_recovery", true),
                    Map.of("title", "Finance Admin", "rank_no", 2, "can_assign_case", false, "can_approve_billing", true, "can_override_access", false, "can_run_recovery", false),
                    Map.of("title", "Intern", "rank_no", 1, "can_assign_case", false, "can_approve_billing", false, "can_override_access", false, "can_run_recovery", false)
                );

                List<Map<String, Object>> matrix = List.of(
                    Map.of("title", "Managing Partner", "permission_name", "VIEW_CASE", "allowed", true),
                    Map.of("title", "Managing Partner", "permission_name", "EDIT_CASE", "allowed", true),
                    Map.of("title", "Managing Partner", "permission_name", "ASSIGN_CASE", "allowed", true),
                    Map.of("title", "Managing Partner", "permission_name", "VIEW_DOCUMENT", "allowed", true),
                    Map.of("title", "Managing Partner", "permission_name", "APPROVE_BILLING", "allowed", true),
                    Map.of("title", "Managing Partner", "permission_name", "OVERRIDE_ACCESS", "allowed", true),
                    Map.of("title", "Partner", "permission_name", "VIEW_CASE", "allowed", true),
                    Map.of("title", "Partner", "permission_name", "EDIT_CASE", "allowed", true),
                    Map.of("title", "Partner", "permission_name", "ASSIGN_CASE", "allowed", true),
                    Map.of("title", "Partner", "permission_name", "APPROVE_BILLING", "allowed", true),
                    Map.of("title", "Senior Associate", "permission_name", "VIEW_CASE", "allowed", true),
                    Map.of("title", "Senior Associate", "permission_name", "EDIT_CASE", "allowed", true),
                    Map.of("title", "Associate", "permission_name", "VIEW_CASE", "allowed", true),
                    Map.of("title", "Associate", "permission_name", "EDIT_CASE", "allowed", true),
                    Map.of("title", "Paralegal", "permission_name", "VIEW_CASE", "allowed", true),
                    Map.of("title", "Paralegal", "permission_name", "EDIT_CASE", "allowed", false)
                );

                List<Map<String, Object>> caseAccess = List.of(
                    createCaseAccessRow(1, 1, "MAT-2026-001", "Liberty Rail antitrust readiness", 2, "Harvey Specter", "Lead Partner", true, true, true, true),
                    createCaseAccessRow(2, 1, "MAT-2026-001", "Liberty Rail antitrust readiness", 5, "Katrina Bennett", "Lead Senior Counsel", true, true, true, true),
                    createCaseAccessRow(3, 1, "MAT-2026-001", "Liberty Rail antitrust readiness", 6, "Mike Ross", "Staff Associate", true, true, true, false),
                    createCaseAccessRow(4, 1, "MAT-2026-001", "Liberty Rail antitrust readiness", 7, "Rachel Zane", "Paralegal Support", true, false, true, false)
                );

                Map<String, Object> data = new LinkedHashMap<>();
                data.put("hierarchy", hierarchy);
                data.put("matrix", matrix);
                data.put("case_access", caseAccess);
                data.put("permissions", List.of());
                data.put("clearances", List.of());
                data.put("violations", List.of());
                data.put("delegations", List.of());
                data.put("requests", List.of());

                sendJsonResponse(exchange, 200, data);
            } catch (Exception e) {
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
