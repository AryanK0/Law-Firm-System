from ..db import fetch_all, fetch_one


def get_analytics():
    case_status = fetch_all(
        """
        SELECT COALESCE(status, 'Unspecified') AS name, COUNT(*) AS value
        FROM Cases
        GROUP BY COALESCE(status, 'Unspecified')
        ORDER BY value DESC, name
        """
    )

    billing = fetch_all(
        """
        SELECT
          case_code AS name,
          COALESCE(SUM(amount), 0) AS amount
        FROM vw_billing_register
        GROUP BY case_code
        ORDER BY amount DESC
        LIMIT 6
        """
    )

    ticket_status = fetch_all(
        """
        SELECT COALESCE(status, 'Unspecified') AS name, COUNT(*) AS value
        FROM Ticket
        GROUP BY COALESCE(status, 'Unspecified')
        ORDER BY value DESC, name
        """
    )

    roles = fetch_all(
        """
        SELECT
          role_name AS name,
          COUNT(employee_id) AS value
        FROM vw_employee_directory
        GROUP BY role_name
        ORDER BY MIN(hierarchy_level), role_name
        """
    )

    summary = {
        "total_cases": fetch_one("SELECT COUNT(*) AS total FROM Cases")["total"],
        "open_cases": fetch_one(
            "SELECT COUNT(*) AS total FROM Cases WHERE status <> 'Closed'"
        )["total"],
        "total_tickets": fetch_one("SELECT COUNT(*) AS total FROM Ticket")["total"],
        "breached_tickets": fetch_one(
            "SELECT COUNT(*) AS total FROM Ticket WHERE breach_flag = TRUE"
        )["total"],
        "documents": fetch_one("SELECT COUNT(*) AS total FROM Document")["total"],
    }

    return {
        "summary": summary,
        "case_status": case_status,
        "billing": [
            {
                **item,
                "amount": float(item["amount"] or 0),
            }
            for item in billing
        ],
        "ticket_status": ticket_status,
        "roles": roles,
    }


def get_overview():
    summary = {
        "active_people": fetch_one(
            "SELECT COUNT(*) AS total FROM Employee WHERE status = 'Active'"
        )["total"],
        "open_matters": fetch_one(
            "SELECT COUNT(*) AS total FROM Cases WHERE status <> 'Closed'"
        )["total"],
        "upcoming_hearings": fetch_one(
            "SELECT COUNT(*) AS total FROM Hearing WHERE date >= CURDATE()"
        )["total"],
        "open_tickets": fetch_one(
            "SELECT COUNT(*) AS total FROM Ticket WHERE status <> 'Resolved'"
        )["total"],
        "active_clients": fetch_one(
            "SELECT COUNT(DISTINCT client_id) AS total FROM Cases WHERE status <> 'Closed'"
        )["total"],
        "tracked_revenue": float(
            fetch_one("SELECT COALESCE(SUM(amount), 0) AS total FROM Billing")["total"] or 0
        ),
        "pending_bills": fetch_one(
            "SELECT COUNT(*) AS total FROM Billing WHERE status = 'Pending'"
        )["total"],
        "sla_risk": fetch_one(
            """
            SELECT COUNT(*) AS total
            FROM vw_ticket_overview
            WHERE status <> 'Resolved'
              AND sla_state IN ('Overdue', 'Due Soon')
            """
        )["total"],
    }

    featured_people = fetch_all(
        """
        SELECT
          employee_id,
          name,
          role_name,
          department_name,
          status,
          employment_type,
          supervisor_name,
          access_level
        FROM vw_employee_directory
        ORDER BY hierarchy_level, name
        """
    )

    role_access = fetch_all(
        """
        SELECT role_id, role_name, hierarchy_level, access_level, permissions
        FROM vw_role_access_matrix
        ORDER BY hierarchy_level, role_name
        """
    )

    priority_matters = fetch_all(
        """
        SELECT
          case_id,
          COALESCE(case_code, CONCAT('Case #', case_id)) AS case_code,
          title,
          case_type,
          status,
          confidentiality_level,
          client_name,
          lead_partner_name,
          lead_senior_name,
          start_date,
          end_date
        FROM vw_case_overview
        ORDER BY
          CASE status
            WHEN 'Hearing Scheduled' THEN 1
            WHEN 'Open' THEN 2
            WHEN 'Drafting' THEN 3
            WHEN 'Negotiation' THEN 4
            WHEN 'Closed' THEN 5
            ELSE 6
          END,
          end_date IS NULL,
          end_date,
          case_id DESC
        LIMIT 8
        """
    )

    upcoming_hearings = fetch_all(
        """
        SELECT
          hearing_id,
          date,
          notes,
          case_id,
          case_code,
          title,
          court_name,
          location
        FROM vw_hearing_calendar
        WHERE date >= CURDATE()
        ORDER BY date, hearing_id
        LIMIT 6
        """
    )

    recent_documents = fetch_all(
        """
        SELECT
          document_id,
          created_at,
          confidentiality_level,
          file_path,
          case_code,
          case_title AS title,
          uploaded_by_name
        FROM vw_document_register
        ORDER BY created_at DESC, document_id DESC
        LIMIT 6
        """
    )

    support_watch = fetch_all(
        """
        SELECT
          ticket_id,
          description,
          priority,
          status,
          resolution_deadline,
          breach_flag,
          raised_by_name,
          assigned_to_name
        FROM vw_ticket_overview
        WHERE status <> 'Resolved'
        ORDER BY
          CASE priority
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
            ELSE 5
          END,
          resolution_deadline IS NULL,
          resolution_deadline,
          ticket_id DESC
        LIMIT 6
        """
    )

    department_coverage = fetch_all(
        """
        SELECT
          d.department_name AS name,
          COUNT(e.employee_id) AS headcount
        FROM Department d
        LEFT JOIN Employee e ON d.department_id = e.department_id
        GROUP BY d.department_id, d.department_name
        ORDER BY headcount DESC, d.department_name
        """
    )

    client_portfolio = fetch_all(
        """
        SELECT
          client_id,
          client_name,
          matter_count,
          billed_total,
          last_contact
        FROM vw_client_portfolio
        WHERE matter_count > 0
        ORDER BY matter_count DESC, billed_total DESC, client_name
        LIMIT 6
        """
    )

    recent_interactions = fetch_all(
        """
        SELECT
          ci.interaction_id,
          ci.interaction_type,
          ci.notes,
          ci.datetime,
          COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
          e.name AS employee_name
        FROM Client_Interaction ci
        INNER JOIN Client cl ON ci.client_id = cl.client_id
        LEFT JOIN Employee e ON ci.employee_id = e.employee_id
        ORDER BY ci.datetime DESC, ci.interaction_id DESC
        LIMIT 6
        """
    )

    billing_watch_rows = fetch_all(
        """
        SELECT
          bill_id,
          amount,
          status,
          case_code,
          title,
          client_name,
          generated_by_name,
          approved_by_name
        FROM vw_billing_register
        ORDER BY
          CASE status
            WHEN 'Pending' THEN 1
            WHEN 'Approved' THEN 2
            ELSE 3
          END,
          amount DESC,
          bill_id DESC
        LIMIT 6
        """
    )

    return {
        "firm": {
            "name": "Precision in Legal Management",
            "tagline": "Academic DBMS project for legal matters, access control, billing, documents, and support operations.",
        },
        "summary": summary,
        "featured_people": featured_people,
        "role_access": role_access,
        "priority_matters": priority_matters,
        "upcoming_hearings": upcoming_hearings,
        "recent_documents": recent_documents,
        "support_watch": support_watch,
        "department_coverage": department_coverage,
        "client_portfolio": [
            {
                **item,
                "billed_total": float(item["billed_total"] or 0),
            }
            for item in client_portfolio
        ],
        "recent_interactions": recent_interactions,
        "billing_watch": [
            {
                **item,
                "amount": float(item["amount"] or 0),
            }
            for item in billing_watch_rows
        ],
    }
