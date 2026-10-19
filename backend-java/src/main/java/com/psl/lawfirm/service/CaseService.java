package com.psl.lawfirm.service;

import com.psl.lawfirm.dao.CaseDAO;
import com.psl.lawfirm.dao.CaseDAOImpl;
import com.psl.lawfirm.dao.ClientDAO;
import com.psl.lawfirm.dao.ClientDAOImpl;
import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.exception.ResourceNotFoundException;
import com.psl.lawfirm.exception.ValidationException;
import com.psl.lawfirm.model.CaseEntity;
import com.psl.lawfirm.model.Client;
import com.psl.lawfirm.util.LoggerUtil;

import java.util.*;
import java.util.logging.Logger;

/**
 * Collections Framework & Generics Service Layer
 * Demonstrates:
 * - Collections: ArrayList, LinkedList, HashSet, HashMap
 * - Iterators and custom Comparators
 * - Generics and type safety
 * - Utility classes: Objects, Optional, LocalDate
 */
public class CaseService {
    private static final Logger LOGGER = LoggerUtil.getLogger(CaseService.class);

    private final CaseDAO caseDAO;
    private final ClientDAO clientDAO;

    // Unit 2: LinkedList to track recent access queue
    private final LinkedList<Long> recentAccessQueue = new LinkedList<>();

    public CaseService() {
        this.caseDAO = new CaseDAOImpl();
        this.clientDAO = new ClientDAOImpl();
    }

    public CaseService(CaseDAO caseDAO, ClientDAO clientDAO) {
        this.caseDAO = caseDAO;
        this.clientDAO = clientDAO;
    }

    /**
     * Retrieves all cases as an ArrayList.
     */
    public List<CaseEntity> getAllCases() throws DatabaseOperationException {
        return new ArrayList<>(caseDAO.findAll());
    }

    /**
     * Demonstrates Optional and LinkedList queue tracking.
     */
    public Optional<CaseEntity> getCaseById(Long id) throws DatabaseOperationException {
        Objects.requireNonNull(id, "Case ID must not be null");
        Optional<CaseEntity> optCase = caseDAO.findById(id);
        if (optCase.isPresent()) {
            synchronized (recentAccessQueue) {
                recentAccessQueue.remove(id);
                recentAccessQueue.addFirst(id);
                if (recentAccessQueue.size() > 50) {
                    recentAccessQueue.removeLast();
                }
            }
        }
        return optCase;
    }

    /**
     * Demonstrates Unit 2: Custom Comparators for Sorting.
     */
    public List<CaseEntity> getCasesSorted(Comparator<CaseEntity> comparator) throws DatabaseOperationException {
        List<CaseEntity> cases = getAllCases();
        cases.sort(comparator);
        return cases;
    }

    public List<CaseEntity> getCasesSortedByTitle() throws DatabaseOperationException {
        return getCasesSorted(Comparator.comparing(CaseEntity::getTitle, String.CASE_INSENSITIVE_ORDER));
    }

    public List<CaseEntity> getCasesSortedByDate(boolean ascending) throws DatabaseOperationException {
        Comparator<CaseEntity> comp = Comparator.comparing(
            CaseEntity::getStartDate,
            Comparator.nullsLast(Comparator.naturalOrder())
        );
        return getCasesSorted(ascending ? comp : comp.reversed());
    }

    /**
     * Demonstrates Unit 2: HashMap for Grouping and Data Aggregation.
     */
    public Map<String, List<CaseEntity>> groupCasesByStatus() throws DatabaseOperationException {
        List<CaseEntity> all = getAllCases();
        Map<String, List<CaseEntity>> grouped = new HashMap<>();

        for (CaseEntity c : all) {
            String status = c.getStatus() != null ? c.getStatus() : "Unassigned";
            grouped.computeIfAbsent(status, k -> new ArrayList<>()).add(c);
        }
        return grouped;
    }

    /**
     * Demonstrates Unit 2: HashSet for Extracting Unique Sets of Elements.
     */
    public Set<String> getUniqueCaseTypes() throws DatabaseOperationException {
        List<CaseEntity> all = getAllCases();
        Set<String> uniqueTypes = new HashSet<>();
        for (CaseEntity c : all) {
            if (c.getCaseType() != null && !c.getCaseType().trim().isEmpty()) {
                uniqueTypes.add(c.getCaseType().trim());
            }
        }
        return uniqueTypes;
    }

    /**
     * Demonstrates Unit 2: Safe Iterator Usage for In-Memory Filtering.
     */
    public List<CaseEntity> filterActiveCases() throws DatabaseOperationException {
        List<CaseEntity> list = getAllCases();
        Iterator<CaseEntity> it = list.iterator();
        while (it.hasNext()) {
            CaseEntity c = it.next();
            if ("Closed".equalsIgnoreCase(c.getStatus()) || "Archived".equalsIgnoreCase(c.getStatus())) {
                it.remove();
            }
        }
        return list;
    }

    /**
     * Demonstrates ValidationException and business rules.
     */
    public CaseEntity createCase(CaseEntity caseEntity) throws ValidationException, DatabaseOperationException {
        Objects.requireNonNull(caseEntity, "Case entity must not be null");

        if (caseEntity.getTitle() == null || caseEntity.getTitle().trim().isEmpty()) {
            throw new ValidationException("title", "Case title cannot be empty");
        }
        if (caseEntity.getClientId() == null || caseEntity.getClientId() <= 0) {
            throw new ValidationException("clientId", "Valid client association is mandatory");
        }
        if (caseEntity.getCaseCode() == null || caseEntity.getCaseCode().trim().isEmpty()) {
            // Auto-generate standard institutional matter code: PSL-YYYY-XXXX
            int randomSuffix = 1000 + (int)(Math.random() * 9000);
            caseEntity.setCaseCode("PSL-" + java.time.Year.now().getValue() + "-" + randomSuffix);
        }

        return caseDAO.save(caseEntity);
    }

    public boolean updateCase(CaseEntity caseEntity) throws ValidationException, DatabaseOperationException {
        Objects.requireNonNull(caseEntity, "Case entity must not be null");
        if (caseEntity.getId() == null) {
            throw new ValidationException("id", "Case ID required for update");
        }
        return caseDAO.update(caseEntity);
    }

    public boolean deleteCase(Long id) throws DatabaseOperationException {
        Objects.requireNonNull(id, "Case ID must not be null");
        return caseDAO.deleteById(id);
    }
}
