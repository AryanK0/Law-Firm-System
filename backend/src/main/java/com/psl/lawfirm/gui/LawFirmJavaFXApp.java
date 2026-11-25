package com.psl.lawfirm.gui;

import com.psl.lawfirm.config.DatabaseConfig;
import com.psl.lawfirm.dao.ClientDAOImpl;
import com.psl.lawfirm.model.CaseEntity;
import com.psl.lawfirm.model.Client;
import com.psl.lawfirm.service.CaseService;
import com.psl.lawfirm.util.DataPersistenceManager;
import com.psl.lawfirm.util.LoggerUtil;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.property.SimpleBooleanProperty;
import javafx.beans.property.SimpleLongProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.time.LocalDate;
import java.util.List;
import java.util.logging.Logger;

/**
 * JavaFX Enterprise Application
 * Demonstrates:
 * - Application lifecycle: init(), start(), stop()
 * - Architecture: Stage, Scene, Scene Graph
 * - Layout Management: BorderPane, HBox, VBox, GridPane, StackPane
 * - UI Controls: Label, TextField, Button, TextArea, CheckBox, ComboBox
 * - Tables & Lists: TableView, ListView
 * - Event-Driven Programming: ActionEvent handlers, ChangeListeners
 * - Input validation and user feedback: Alerts, confirmation dialogs
 */
public class LawFirmJavaFXApp extends Application {
    private static final Logger LOGGER = LoggerUtil.getLogger(LawFirmJavaFXApp.class);

    private CaseService caseService;
    private ClientDAOImpl clientDAO;
    private ObservableList<CaseEntity> caseData;
    private TableView<CaseEntity> caseTable;
    private Label statusLabel;

    @Override
    public void init() throws Exception {
        super.init();
        LoggerUtil.initialize();
        LOGGER.info("JavaFX init() lifecycle phase started.");
        this.caseService = new CaseService();
        this.clientDAO = new ClientDAOImpl();
        this.caseData = FXCollections.observableArrayList();
    }

    @Override
    public void start(Stage primaryStage) {
        LOGGER.info("JavaFX start() lifecycle phase invoked.");
        primaryStage.setTitle("PEARSON SPECTER LITT | Enterprise Operations Console");

        BorderPane root = new BorderPane();
        root.setStyle("-fx-background-color: #0b0f19;");

        // 1. TOP HEADER (HBox)
        HBox header = createHeader();
        root.setTop(header);

        // 2. LEFT SIDEBAR NAVIGATION (ListView & VBox)
        VBox sidebar = createSidebar();
        root.setLeft(sidebar);

        // 3. CENTER VIEW (VBox with Search Bar, TableView, and Controls)
        VBox centerView = createCenterView(primaryStage);
        root.setCenter(centerView);

        // 4. BOTTOM STATUS BAR (HBox)
        HBox statusBar = createStatusBar();
        root.setBottom(statusBar);

        // Load Initial Records asynchronously
        loadCasesAsync();

        Scene scene = new Scene(root, 1200, 750);
        primaryStage.setScene(scene);
        primaryStage.show();
    }

    @Override
    public void stop() throws Exception {
        LOGGER.info("JavaFX stop() lifecycle invoked. Cleaning up application resources.");
        super.stop();
    }

    private HBox createHeader() {
        HBox header = new HBox();
        header.setPadding(new Insets(14, 24, 14, 24));
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(16);
        header.setStyle("-fx-background-color: #0f172a; -fx-border-color: #1e293b; -fx-border-width: 0 0 1 0;");

        Label logoLabel = new Label("⚖ PEARSON SPECTER LITT");
        logoLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 18));
        logoLabel.setTextFill(Color.web("#f8fafc"));

        Label subtitleLabel = new Label("Institutional Matter Management & Corporate Governance");
        subtitleLabel.setFont(Font.font("Segoe UI", 12));
        subtitleLabel.setTextFill(Color.web("#94a3b8"));

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        boolean dbOk = DatabaseConfig.testConnection();
        Label dbStatus = new Label(dbOk ? "● MySQL 8.3 Live (Port 3306)" : "○ Database Disconnected");
        dbStatus.setStyle(dbOk 
            ? "-fx-text-fill: #10b981; -fx-font-weight: bold; -fx-font-size: 11px; -fx-background-color: rgba(16, 185, 129, 0.1); -fx-padding: 4 8; -fx-background-radius: 4;"
            : "-fx-text-fill: #ef4444; -fx-font-weight: bold; -fx-font-size: 11px; -fx-background-color: rgba(239, 68, 68, 0.1); -fx-padding: 4 8; -fx-background-radius: 4;");

        header.getChildren().addAll(logoLabel, subtitleLabel, spacer, dbStatus);
        return header;
    }

    private VBox createSidebar() {
        VBox sidebar = new VBox(12);
        sidebar.setPadding(new Insets(20, 16, 20, 16));
        sidebar.setPrefWidth(220);
        sidebar.setStyle("-fx-background-color: #0d1322; -fx-border-color: #1e293b; -fx-border-width: 0 1 0 0;");

        Label navTitle = new Label("NAVIGATOR");
        navTitle.setFont(Font.font("Segoe UI", FontWeight.BOLD, 11));
        navTitle.setTextFill(Color.web("#64748b"));

        // Unit 5: ListView Control
        ListView<String> navList = new ListView<>();
        navList.getItems().addAll("Matters & Cases", "Client Roster", "IOLTA Trust Accounts", "Compliance & Holds", "System Snapshots");
        navList.getSelectionModel().select(0);
        navList.setStyle(
            "-fx-background-color: transparent; " +
            "-fx-control-inner-background: transparent; " +
            "-fx-text-fill: #f1f5f9; " +
            "-fx-font-size: 13px;"
        );
        navList.setPrefHeight(220);

        sidebar.getChildren().addAll(navTitle, navList);
        return sidebar;
    }

    private VBox createCenterView(Stage stage) {
        VBox center = new VBox(16);
        center.setPadding(new Insets(24));
        center.setStyle("-fx-background-color: #0b0f19;");

        // Action & Search Toolbar (HBox)
        HBox toolbar = new HBox(12);
        toolbar.setAlignment(Pos.CENTER_LEFT);

        // Search Field with Event Listener
        TextField searchField = new TextField();
        searchField.setPromptText("Filter matters by code, title, opposing party...");
        searchField.setPrefWidth(320);
        searchField.setStyle("-fx-background-color: #1e293b; -fx-text-fill: #f8fafc; -fx-prompt-text-fill: #64748b; -fx-background-radius: 6; -fx-padding: 8;");
        searchField.textProperty().addListener((obs, oldVal, newVal) -> filterCases(newVal));

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button newCaseBtn = new Button("+ New Legal Matter");
        newCaseBtn.setStyle("-fx-background-color: #2563eb; -fx-text-fill: white; -fx-font-weight: bold; -fx-background-radius: 6; -fx-padding: 8 16;");
        newCaseBtn.setOnAction(e -> showCreateCaseDialog(stage));

        Button exportCsvBtn = new Button("Export CSV (Unit 3)");
        exportCsvBtn.setStyle("-fx-background-color: #1e293b; -fx-text-fill: #cbd5e1; -fx-border-color: #334155; -fx-background-radius: 6; -fx-border-radius: 6; -fx-padding: 7 14;");
        exportCsvBtn.setOnAction(e -> handleExportCsv(stage));

        Button snapshotBtn = new Button("Save Snapshot (Unit 3)");
        snapshotBtn.setStyle("-fx-background-color: #1e293b; -fx-text-fill: #cbd5e1; -fx-border-color: #334155; -fx-background-radius: 6; -fx-border-radius: 6; -fx-padding: 7 14;");
        snapshotBtn.setOnAction(e -> handleSaveSnapshot(stage));

        toolbar.getChildren().addAll(searchField, spacer, exportCsvBtn, snapshotBtn, newCaseBtn);

        // TableView (Unit 5: Tables and Lists)
        caseTable = new TableView<>();
        caseTable.setItems(caseData);
        caseTable.setStyle(
            "-fx-background-color: #0f172a; " +
            "-fx-border-color: #1e293b; " +
            "-fx-border-radius: 6; " +
            "-fx-table-cell-border-color: #1e293b; " +
            "-fx-font-size: 13px;"
        );

        TableColumn<CaseEntity, Long> colId = new TableColumn<>("ID");
        colId.setCellValueFactory(d -> new SimpleLongProperty(d.getValue().getId() != null ? d.getValue().getId() : 0).asObject());
        colId.setPrefWidth(60);

        TableColumn<CaseEntity, String> colCode = new TableColumn<>("Matter Code");
        colCode.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getCaseCode()));
        colCode.setPrefWidth(140);

        TableColumn<CaseEntity, String> colTitle = new TableColumn<>("Matter Title");
        colTitle.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getTitle()));
        colTitle.setPrefWidth(260);

        TableColumn<CaseEntity, String> colType = new TableColumn<>("Practice Area");
        colType.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getCaseType()));
        colType.setPrefWidth(140);

        TableColumn<CaseEntity, String> colClient = new TableColumn<>("Client");
        colClient.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getClientName() != null ? d.getValue().getClientName() : "Client #" + d.getValue().getClientId()));
        colClient.setPrefWidth(180);

        TableColumn<CaseEntity, String> colStatus = new TableColumn<>("Status");
        colStatus.setCellValueFactory(d -> new SimpleStringProperty(d.getValue().getStatus()));
        colStatus.setPrefWidth(110);

        TableColumn<CaseEntity, Boolean> colHold = new TableColumn<>("Legal Hold");
        colHold.setCellValueFactory(d -> new SimpleBooleanProperty(d.getValue().isLegalHold()));
        colHold.setPrefWidth(90);

        caseTable.getColumns().addAll(colId, colCode, colTitle, colType, colClient, colStatus, colHold);
        VBox.setVgrow(caseTable, Priority.ALWAYS);

        center.getChildren().addAll(toolbar, caseTable);
        return center;
    }

    private HBox createStatusBar() {
        HBox bar = new HBox();
        bar.setPadding(new Insets(8, 24, 8, 24));
        bar.setStyle("-fx-background-color: #0f172a; -fx-border-color: #1e293b; -fx-border-width: 1 0 0 0;");

        statusLabel = new Label("Initializing Pearson Specter Litt Enterprise Console...");
        statusLabel.setTextFill(Color.web("#94a3b8"));
        statusLabel.setFont(Font.font("Segoe UI", 12));

        bar.getChildren().add(statusLabel);
        return bar;
    }

    private void loadCasesAsync() {
        new Thread(() -> {
            try {
                List<CaseEntity> list = caseService.getAllCases();
                Platform.runLater(() -> {
                    caseData.setAll(list);
                    statusLabel.setText("Active Matters Loaded: " + list.size() + " records synced from MySQL.");
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    statusLabel.setText("Error loading matters: " + e.getMessage());
                });
            }
        }).start();
    }

    private void filterCases(String query) {
        if (query == null || query.trim().isEmpty()) {
            loadCasesAsync();
            return;
        }
        new Thread(() -> {
            try {
                List<CaseEntity> results = caseService.getAllCases();
                String lower = query.toLowerCase();
                results.removeIf(c -> 
                    (c.getTitle() == null || !c.getTitle().toLowerCase().contains(lower)) &&
                    (c.getCaseCode() == null || !c.getCaseCode().toLowerCase().contains(lower)) &&
                    (c.getOpposingParty() == null || !c.getOpposingParty().toLowerCase().contains(lower))
                );
                Platform.runLater(() -> caseData.setAll(results));
            } catch (Exception ignored) {}
        }).start();
    }

    private void showCreateCaseDialog(Stage owner) {
        Dialog<CaseEntity> dialog = new Dialog<>();
        dialog.initOwner(owner);
        dialog.setTitle("Initiate New Legal Matter");
        dialog.setHeaderText("Create enterprise legal matter record (Unit 5 Input Validation)");

        ButtonType saveButtonType = new ButtonType("Create Matter", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(saveButtonType, ButtonType.CANCEL);

        GridPane grid = new GridPane();
        grid.setHgap(12);
        grid.setVgap(12);
        grid.setPadding(new Insets(20));

        TextField titleField = new TextField();
        titleField.setPromptText("e.g. Wayne Enterprises vs Apex Corp");

        ComboBox<String> typeCombo = new ComboBox<>();
        typeCombo.getItems().addAll("Corporate Litigation", "M&A Regulatory", "Securities & Antitrust", "Intellectual Property", "White Collar Defense");
        typeCombo.setValue("Corporate Litigation");

        TextField clientField = new TextField("1");
        clientField.setPromptText("Client ID");

        CheckBox holdCheck = new CheckBox("Apply Immediate Legal Hold (Preserve Evidence)");

        grid.add(new Label("Matter Title:"), 0, 0);
        grid.add(titleField, 1, 0);
        grid.add(new Label("Practice Area:"), 0, 1);
        grid.add(typeCombo, 1, 1);
        grid.add(new Label("Client ID:"), 0, 2);
        grid.add(clientField, 1, 2);
        grid.add(holdCheck, 1, 3);

        dialog.getDialogPane().setContent(grid);

        dialog.setResultConverter(btn -> {
            if (btn == saveButtonType) {
                try {
                    String title = titleField.getText();
                    Long clientId = Long.parseLong(clientField.getText().trim());
                    CaseEntity newCase = new CaseEntity();
                    newCase.setTitle(title);
                    newCase.setCaseType(typeCombo.getValue());
                    newCase.setClientId(clientId);
                    newCase.setLegalHold(holdCheck.isSelected());
                    return newCase;
                } catch (NumberFormatException e) {
                    Alert alert = new Alert(Alert.AlertType.ERROR, "Client ID must be a valid number.");
                    alert.showAndWait();
                    return null;
                }
            }
            return null;
        });

        dialog.showAndWait().ifPresent(c -> {
            try {
                CaseEntity created = caseService.createCase(c);
                Alert alert = new Alert(Alert.AlertType.INFORMATION, "Matter created successfully with Code: " + created.getCaseCode());
                alert.showAndWait();
                loadCasesAsync();
            } catch (Exception e) {
                Alert errAlert = new Alert(Alert.AlertType.ERROR, "Creation Failed: " + e.getMessage());
                errAlert.showAndWait();
            }
        });
    }

    private void handleExportCsv(Stage owner) {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Export Legal Matters (Character Stream)");
        chooser.setInitialFileName("psl_matters_export.csv");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("CSV Files", "*.csv"));
        File file = chooser.showSaveDialog(owner);
        if (file != null) {
            try {
                DataPersistenceManager.exportCasesToCsv(caseData, file);
                Alert alert = new Alert(Alert.AlertType.INFORMATION, "Matters exported via Character Stream (BufferedWriter) to:\n" + file.getAbsolutePath());
                alert.showAndWait();
            } catch (Exception e) {
                Alert err = new Alert(Alert.AlertType.ERROR, "Export error: " + e.getMessage());
                err.showAndWait();
            }
        }
    }

    private void handleSaveSnapshot(Stage owner) {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Save State Snapshot (Object Serialization)");
        chooser.setInitialFileName("system_snapshot.ser");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Serialized Object Stream", "*.ser"));
        File file = chooser.showSaveDialog(owner);
        if (file != null) {
            try {
                List<Client> clients = clientDAO.findAll();
                DataPersistenceManager.SystemSnapshot snap = new DataPersistenceManager.SystemSnapshot(caseData, clients);
                DataPersistenceManager.saveSnapshot(snap, file);
                Alert alert = new Alert(Alert.AlertType.INFORMATION, "System state serialized via ObjectOutputStream to:\n" + file.getAbsolutePath());
                alert.showAndWait();
            } catch (Exception e) {
                Alert err = new Alert(Alert.AlertType.ERROR, "Serialization error: " + e.getMessage());
                err.showAndWait();
            }
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
