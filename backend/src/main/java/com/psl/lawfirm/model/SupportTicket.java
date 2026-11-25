package com.psl.lawfirm.model;

import java.time.LocalDateTime;

/**
 * 
 * Support Ticket Entity mapped to MySQL `ticket` table.
 */
public class SupportTicket extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private Long raisedBy;
    private String description;
    private String priority; // 'Low', 'Medium', 'High', 'Critical'
    private String status;   // 'Open', 'In Progress', 'Resolved', 'Closed'
    private Long assignedTo;
    private LocalDateTime resolvedAt;
    private LocalDateTime resolutionDeadline;
    private boolean breachFlag;

    public SupportTicket() {
        super();
        this.priority = "Medium";
        this.status = "Open";
        this.breachFlag = false;
    }

    public SupportTicket(Long id, Long raisedBy, String description, String priority, String status) {
        super(id);
        this.raisedBy = raisedBy;
        this.description = description;
        this.priority = priority != null ? priority : "Medium";
        this.status = status != null ? status : "Open";
        this.breachFlag = false;
    }

    public Long getRaisedBy() {
        return raisedBy;
    }

    public void setRaisedBy(Long raisedBy) {
        this.raisedBy = raisedBy;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(Long assignedTo) {
        this.assignedTo = assignedTo;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public LocalDateTime getResolutionDeadline() {
        return resolutionDeadline;
    }

    public void setResolutionDeadline(LocalDateTime resolutionDeadline) {
        this.resolutionDeadline = resolutionDeadline;
    }

    public boolean isBreachFlag() {
        return breachFlag;
    }

    public void setBreachFlag(boolean breachFlag) {
        this.breachFlag = breachFlag;
    }

    @Override
    public String toString() {
        return String.format("Ticket[id=%d, priority='%s', status='%s']", id, priority, status);
    }
}
