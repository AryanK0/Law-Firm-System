package com.psl.lawfirm.dao;

import com.psl.lawfirm.exception.DatabaseOperationException;
import com.psl.lawfirm.model.SupportTicket;

import java.util.List;

/**
 * Support Ticket DAO Interface
 */
public interface SupportTicketDAO extends GenericDAO<SupportTicket, Long> {
    List<SupportTicket> findOpenTickets() throws DatabaseOperationException;
}
