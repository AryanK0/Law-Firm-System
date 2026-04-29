from ..db import fetch_all


def list_employees():
    return fetch_all(
        """
        SELECT
          employee_id,
          name,
          email,
          phone,
          status,
          employment_type,
          department_name,
          role_name,
          hierarchy_level,
          access_level,
          supervisor_name
        FROM vw_employee_directory
        ORDER BY hierarchy_level, name
        """
    )


def list_roles():
    return fetch_all(
        """
        SELECT role_id, role_name, hierarchy_level, access_level, permissions
        FROM vw_role_access_matrix
        ORDER BY hierarchy_level, role_name
        """
    )
