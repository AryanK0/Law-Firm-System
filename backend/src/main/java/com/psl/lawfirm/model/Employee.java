package com.psl.lawfirm.model;

/**
 * 
 * Employee Domain Entity mapped to MySQL `employee` table.
 */
public class Employee extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String name;
    private String email;
    private String phone;
    private Long roleId;
    private Long departmentId;
    private String status;

    public Employee() {
        super();
        this.status = "Active";
    }

    public Employee(Long id, String name, String email, String phone, String status) {
        super(id);
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.status = status != null ? status : "Active";
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Long getRoleId() {
        return roleId;
    }

    public void setRoleId(Long roleId) {
        this.roleId = roleId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return String.format("Employee[id=%d, name='%s', status='%s']", id, name, status);
    }
}
