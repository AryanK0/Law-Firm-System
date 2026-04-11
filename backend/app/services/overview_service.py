from ..db import fetch_all, fetch_one

ACCESS_LEVEL_SQL = """
CASE
  WHEN r.hierarchy_level = 1 THEN 'Executive'
  WHEN r.hierarchy_level = 2 THEN 'Leadership'
  WHEN r.hierarchy_level = 3 THEN 'Senior Matter Access'
  WHEN r.hierarchy_level = 4 THEN 'Matter Access'
  ELSE 'Support Access'
END
"""


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
          COALESCE(NULLIF(c.case_code, ''), c.title, CONCAT('Case #', b.case_id)) AS name,
          COALESCE(SUM(b.amount), 0) AS amount
        FROM Billing b
        LEFT JOIN Cases c ON b.case_id = c.case_id
        GROUP BY COALESCE(NULLIF(c.case_code, ''), c.title, CONCAT('Case #', b.case_id))
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
          r.role_name AS name,
          COUNT(e.employee_id) AS value
        FROM Role r
        LEFT JOIN Employee e ON e.role_id = r.role_id
        GROUP BY r.role_id, r.role_name
        ORDER BY r.hierarchy_level
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
        "billing": billing,
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
        "tracked_revenue": fetch_one(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM Billing"
        )["total"],
        "pending_bills": fetch_one(
            "SELECT COUNT(*) AS total FROM Billing WHERE status = 'Pending'"
        )["total"],
        "sla_risk": fetch_one(
            """
            SELECT COUNT(*) AS total
            FROM Ticket
            WHERE status <> 'Resolved'
              AND (
                breach_flag = TRUE
                OR (
                  resolution_deadline IS NOT NULL
                  AND resolution_deadline <= DATE_ADD(NOW(), INTERVAL 2 DAY)
                )
              )
            """
        )["total"],
    }

    featured_people = fetch_all(
        f"""
        SELECT
          e.employee_id,
          e.name,
          r.role_name,
          d.department_name,
          e.status,
          e.employment_type,
          supervisor.name AS supervisor_name,
          {ACCESS_LEVEL_SQL} AS access_level
        FROM Employee e
        LEFT JOIN Department d ON e.department_id = d.department_id
        LEFT JOIN Role r ON e.role_id = r.role_id
        LEFT JOIN Employee supervisor ON e.supervisor_id = supervisor.employee_id
        ORDER BY r.hierarchy_level, e.name
        """
    )

    role_access = fetch_all(
        f"""
        SELECT
          r.role_id,
          r.role_name,
          r.hierarchy_level,
          {ACCESS_LEVEL_SQL} AS access_level,
          COALESCE(
            GROUP_CONCAT(DISTINCT p.permission_name ORDER BY p.permission_name SEPARATOR ', '),
            'No explicit permissions mapped'
          ) AS permissions
        FROM Role r
        LEFT JOIN Role_Permission rp ON r.role_id = rp.role_id
        LEFT JOIN Permission p ON rp.permission_id = p.permission_id
        GROUP BY r.role_id, r.role_name, r.hierarchy_level
        ORDER BY r.hierarchy_level, r.role_name
        """
    )

    priority_matters = fetch_all(
        """
        SELECT
          c.case_id,
          COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
          c.title,
          c.case_type,
          c.status,
          c.confidentiality_level,
          cl.organization AS client_name,
          lp.name AS lead_partner_name,
          ls.name AS lead_senior_name,
          c.start_date,
          c.end_date
        FROM Cases c
        LEFT JOIN Client cl ON c.client_id = cl.client_id
        LEFT JOIN Employee lp ON c.lead_partner_id = lp.employee_id
        LEFT JOIN Employee ls ON c.lead_senior_id = ls.employee_id
        ORDER BY
          CASE c.status
            WHEN 'Hearing Scheduled' THEN 1
            WHEN 'Open' THEN 2
            WHEN 'Drafting' THEN 3
            WHEN 'Negotiation' THEN 4
            WHEN 'Closed' THEN 5
            ELSE 6
          END,
          c.end_date IS NULL,
          c.end_date,
          c.case_id DESC
        LIMIT 8
        """
    )

    upcoming_hearings = fetch_all(
        """
        SELECT
          h.hearing_id,
          h.date,
          h.notes,
          c.case_id,
          COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
          c.title,
          court.name AS court_name,
          court.location
        FROM Hearing h
        INNER JOIN Cases c ON h.case_id = c.case_id
        INNER JOIN Court court ON h.court_id = court.court_id
        WHERE h.date >= CURDATE()
        ORDER BY h.date, h.hearing_id
        LIMIT 6
        """
    )

    recent_documents = fetch_all(
        """
        SELECT
          d.document_id,
          d.created_at,
          d.confidentiality_level,
          d.file_path,
          COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
          c.title,
          uploader.name AS uploaded_by_name
        FROM Document d
        LEFT JOIN Cases c ON d.case_id = c.case_id
        LEFT JOIN Employee uploader ON d.uploaded_by = uploader.employee_id
        ORDER BY d.created_at DESC, d.document_id DESC
        LIMIT 6
        """
    )

    support_watch = fetch_all(
        """
        SELECT
          t.ticket_id,
          t.description,
          t.priority,
          t.status,
          t.resolution_deadline,
          t.breach_flag,
          raised_by.name AS raised_by_name,
          assigned_to.name AS assigned_to_name
        FROM Ticket t
        LEFT JOIN Employee raised_by ON t.raised_by = raised_by.employee_id
        LEFT JOIN Employee assigned_to ON t.assigned_to = assigned_to.employee_id
        WHERE t.status <> 'Resolved'
        ORDER BY
          CASE t.priority
            WHEN 'High' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Low' THEN 3
            ELSE 4
          END,
          t.resolution_deadline IS NULL,
          t.resolution_deadline,
          t.ticket_id DESC
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
          cl.client_id,
          COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
          COALESCE(m.matter_count, 0) AS matter_count,
          COALESCE(b.billed_total, 0) AS billed_total,
          i.last_contact
        FROM Client cl
        LEFT JOIN (
          SELECT client_id, COUNT(*) AS matter_count
          FROM Cases
          GROUP BY client_id
        ) m ON m.client_id = cl.client_id
        LEFT JOIN (
          SELECT c.client_id, COALESCE(SUM(b.amount), 0) AS billed_total
          FROM Cases c
          LEFT JOIN Billing b ON b.case_id = c.case_id
          GROUP BY c.client_id
        ) b ON b.client_id = cl.client_id
        LEFT JOIN (
          SELECT client_id, MAX(datetime) AS last_contact
          FROM Client_Interaction
          GROUP BY client_id
        ) i ON i.client_id = cl.client_id
        WHERE COALESCE(m.matter_count, 0) > 0
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

    billing_watch = fetch_all(
        """
        SELECT
          b.bill_id,
          b.amount,
          b.status,
          COALESCE(NULLIF(c.case_code, ''), CONCAT('Case #', c.case_id)) AS case_code,
          c.title,
          COALESCE(NULLIF(cl.organization, ''), NULLIF(cl.name, ''), CONCAT('Client #', cl.client_id)) AS client_name,
          generator.name AS generated_by_name,
          approver.name AS approved_by_name
        FROM Billing b
        LEFT JOIN Cases c ON b.case_id = c.case_id
        LEFT JOIN Client cl ON c.client_id = cl.client_id
        LEFT JOIN Employee generator ON b.generated_by = generator.employee_id
        LEFT JOIN Employee approver ON b.approved_by = approver.employee_id
        ORDER BY
          CASE b.status
            WHEN 'Pending' THEN 1
            WHEN 'Approved' THEN 2
            ELSE 3
          END,
          b.amount DESC,
          b.bill_id DESC
        LIMIT 6
        """
    )

    return {
        "firm": {
            "name": "Precision in Legal Management",
            "tagline": "Premium operations workspace for matters, access, hearings, and support.",
        },
        "summary": summary,
        "featured_people": featured_people,
        "role_access": role_access,
        "priority_matters": priority_matters,
        "upcoming_hearings": upcoming_hearings,
        "recent_documents": recent_documents,
        "support_watch": support_watch,
        "department_coverage": department_coverage,
        "client_portfolio": client_portfolio,
        "recent_interactions": recent_interactions,
        "billing_watch": billing_watch,
    }
