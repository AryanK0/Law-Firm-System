package com.psl.lawfirm.model;

import java.util.Objects;

/**
 * 
 * Client Domain Entity mapped to MySQL `client` table.
 */
public class Client extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String name;
    private String contactInfo;
    private String organization;

    public Client() {
        super();
    }

    public Client(Long id, String name, String contactInfo, String organization) {
        super(id);
        this.name = name;
        this.contactInfo = contactInfo;
        this.organization = organization;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(String contactInfo) {
        this.contactInfo = contactInfo;
    }

    public String getOrganization() {
        return organization;
    }

    public void setOrganization(String organization) {
        this.organization = organization;
    }

    @Override
    public String toString() {
        return String.format("Client[id=%d, name='%s', org='%s']", id, name, organization);
    }
}
