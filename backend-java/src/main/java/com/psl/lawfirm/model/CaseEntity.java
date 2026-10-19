package com.psl.lawfirm.model;

import java.time.LocalDate;
import java.util.Objects;

/**
 * , Unit 2, Unit 4
 * Case Domain Entity mapped to MySQL `cases` table.
 * Demonstrates:
 * - OOP: Inheritance (extends BaseEntity) & Interface implementation (implements Comparable)
 * - Utility classes: LocalDate, Objects
 * - Collections: Comparable natural ordering by caseCode and open date
 */
public class CaseEntity extends BaseEntity implements Comparable<CaseEntity> {
    private static final long serialVersionUID = 1L;

    private String caseCode;
    private String title;
    private String description;
    private String caseType;
    private Long clientId;
    private String clientName; // Populated via SQL JOIN
    private Long leadPartnerId;
    private String status; // 'Open', 'In Progress', 'Pending Review', 'Closed'
    private String confidentialityLevel; // 'Internal', 'Confidential', 'Restricted'
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean legalHold;
    private String opposingParty;
    private String opposingCounsel;

    public CaseEntity() {
        super();
        this.status = "Open";
        this.confidentialityLevel = "Internal";
        this.legalHold = false;
        this.startDate = LocalDate.now();
    }

    public CaseEntity(Long id, String caseCode, String title, String caseType, Long clientId, String status) {
        super(id);
        this.caseCode = caseCode;
        this.title = title;
        this.caseType = caseType;
        this.clientId = clientId;
        this.status = status != null ? status : "Open";
        this.confidentialityLevel = "Internal";
        this.legalHold = false;
        this.startDate = LocalDate.now();
    }

    // Natural Ordering: Sort primarily by StartDate descending, secondary by CaseCode
    @Override
    public int compareTo(CaseEntity other) {
        if (other == null) return 1;
        if (this.startDate != null && other.startDate != null) {
            int dateCompare = other.startDate.compareTo(this.startDate);
            if (dateCompare != 0) return dateCompare;
        }
        if (this.caseCode != null && other.caseCode != null) {
            return this.caseCode.compareTo(other.caseCode);
        }
        return Objects.compare(this.id, other.id, (a, b) -> {
            if (a == null) return b == null ? 0 : -1;
            if (b == null) return 1;
            return a.compareTo(b);
        });
    }

    public String getCaseCode() {
        return caseCode;
    }

    public void setCaseCode(String caseCode) {
        this.caseCode = caseCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCaseType() {
        return caseType;
    }

    public void setCaseType(String caseType) {
        this.caseType = caseType;
    }

    public Long getClientId() {
        return clientId;
    }

    public void setClientId(Long clientId) {
        this.clientId = clientId;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public Long getLeadPartnerId() {
        return leadPartnerId;
    }

    public void setLeadPartnerId(Long leadPartnerId) {
        this.leadPartnerId = leadPartnerId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getConfidentialityLevel() {
        return confidentialityLevel;
    }

    public void setConfidentialityLevel(String confidentialityLevel) {
        this.confidentialityLevel = confidentialityLevel;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public boolean isLegalHold() {
        return legalHold;
    }

    public void setLegalHold(boolean legalHold) {
        this.legalHold = legalHold;
    }

    public String getOpposingParty() {
        return opposingParty;
    }

    public void setOpposingParty(String opposingParty) {
        this.opposingParty = opposingParty;
    }

    public String getOpposingCounsel() {
        return opposingCounsel;
    }

    public void setOpposingCounsel(String opposingCounsel) {
        this.opposingCounsel = opposingCounsel;
    }

    @Override
    public String toString() {
        return String.format("Case[id=%d, code='%s', title='%s', status='%s']", id, caseCode, title, status);
    }
}
