# Pearson Specter Litt | Enterprise Legal Management System (Core Platform)

A mission-critical enterprise legal practice management and governance platform engineered with **Java 21 LTS**, **MySQL 8.3 Enterprise**, **JDBC Data Access Object (DAO) Layer**, and **JavaFX 21 Desktop Console**.

---

## 🏛️ Architecture Overview

The system is architected as a modular, high-throughput legal practice management suite supporting real-time case tracking, conflict checks, IOLTA trust ledger transactions, and automated document vaulting.

```
+-------------------------------------------------------------------------+
|                  Enterprise Presentation Tier                           |
|  - Web Console (React 19 + TypeScript + Vite)                           |
|  - Desktop Console (JavaFX 21 OpenJFX with BorderPane, TableView)       |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|                  Business & Service Layer                               |
|  - CaseService (In-memory Collections, Comparators, HashMaps, Iterators)|
|  - TrustAccountingService (IOLTA Trust Ledger & Compliance Checks)      |
|  - DataPersistenceManager (Character Streams, Byte Streams, SerOps)     |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|                  Data Access Object (DAO) Layer                         |
|  - GenericDAO<T, ID> & CRUD implementations                             |
|  - Atomic Transaction Management with Rollback Isolation                |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|                  Database Tier (MySQL 8.3.0 Engine)                     |
|  - 54 Production Tables, Legal Hold Locks, IOLTA Ledgers                |
+-------------------------------------------------------------------------+
```

---

## ⚡ Key Technical Capabilities

1. **High-Precision Trust Accounting (IOLTA Compliance)**
   - Strict Bar Association compliance guaranteeing trust accounts cannot be overdrawn.
   - Enforces 2-phase atomic fund transfers with transactional rollback via `setAutoCommit(false)` and `conn.rollback()`.
   - Domain exception handling via `InsufficientTrustFundsException`.

2. **Collections & In-Memory Analytical Pipeline**
   - In-memory case organization using `ArrayList`, `HashSet` for distinct practice areas, and `HashMap` for status partitioning.
   - High-performance sorting using custom `Comparator` pipelines.
   - Access history tracked via bounded `LinkedList` queues.

3. **Multi-Stream Persistence Engine**
   - **Character Streams**: High-throughput CSV matter exports and bulk parsing via `BufferedWriter` and `BufferedReader`.
   - **Byte Streams**: Bit-for-bit secure file vaulting via `FileInputStream` and `FileOutputStream`.
   - **Object Serialization**: Complete binary cluster snapshots and state restoration via `ObjectOutputStream` and `ObjectInputStream`.

4. **Institutional Desktop Operations Console (JavaFX 21)**
   - Real-time `TableView` with dynamic matter sorting and search filtering.
   - Matter initiation forms with live validation dialogs and alert notifications.
   - On-demand snapshot serialization and CSV auditing triggers.

---

## 🚀 Execution & Verification

### 1. System Health & Diagnostics Runner
Validates end-to-end database connectivity, transaction rollback isolation, collection pipelines, and streaming persistence:
```cmd
backend-java\run_system.bat
```

### 2. Standalone Java REST API Engine
Spawns the embedded HTTP server on `http://localhost:8085`:
```cmd
backend-java\run_server.bat
```

### 3. JavaFX Desktop Operations Console
Launches the native desktop management application:
```cmd
backend-java\run_gui.bat
```
