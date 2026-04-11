from ..db import fetch_all


def list_employees():
    return fetch_all(
        """
        SELECT
          e.employee_id,
          e.name,
          e.email,
          e.phone,
          e.status,
          e.employment_type,
          d.department_name,
          r.role_name,
          r.hierarchy_level,
          CASE
            WHEN r.hierarchy_level = 1 THEN 'Executive'
            WHEN r.hierarchy_level = 2 THEN 'Leadership'
            WHEN r.hierarchy_level = 3 THEN 'Senior Matter Access'
            WHEN r.hierarchy_level = 4 THEN 'Matter Access'
            ELSE 'Support Access'
          END AS access_level,
          supervisor.name AS supervisor_name
        FROM Employee e
        LEFT JOIN Department d ON e.department_id = d.department_id
        LEFT JOIN Role r ON e.role_id = r.role_id
        LEFT JOIN Employee supervisor ON e.supervisor_id = supervisor.employee_id
        ORDER BY r.hierarchy_level, e.name
        """
    )


def list_roles():
    return fetch_all(
        """
        SELECT role_id, role_name, hierarchy_level
        FROM Role
        ORDER BY hierarchy_level, role_name
        """
    )
