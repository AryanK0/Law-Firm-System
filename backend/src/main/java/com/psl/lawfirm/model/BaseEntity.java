package com.psl.lawfirm.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 
 * Abstract base class demonstrating OOP principles:
 * - Abstraction & Inheritance
 * - Encapsulation (protected fields, public getters/setters)
 * - Object Serialization (implements Serializable with serialVersionUID)
 * - Objects utility class (equals, hashcode, requireNonNull)
 */
public abstract class BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    // Static member tracking system entity instantiation metrics
    private static long totalEntitiesCreated = 0;

    protected Long id;
    protected LocalDateTime createdAt;
    protected LocalDateTime updatedAt;

    public BaseEntity() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        incrementEntityCounter();
    }

    public BaseEntity(Long id) {
        this();
        this.id = id;
    }

    private static synchronized void incrementEntityCounter() {
        totalEntitiesCreated++;
    }

    public static long getTotalEntitiesCreated() {
        return totalEntitiesCreated;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BaseEntity that = (BaseEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return String.format("%s[id=%s]", getClass().getSimpleName(), id);
    }
}
