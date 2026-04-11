'use client';

import { Navbar } from '@/components/navbar';
import { Plus, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const ticketsData = [
  { id: '#T001', issue: 'Document signature required for Case #2401', priority: 'High', status: 'Open', date: 'Feb 15, 2024', assigned: 'Sarah Johnson' },
  { id: '#T002', issue: 'Update client contact information', priority: 'Low', status: 'Open', date: 'Feb 14, 2024', assigned: 'Mike Chen' },
  { id: '#T003', issue: 'Prepare discovery documents', priority: 'High', status: 'In Progress', date: 'Feb 12, 2024', assigned: 'Emily Davis' },
  { id: '#T004', issue: 'Schedule client meeting', priority: 'Medium', status: 'In Progress', date: 'Feb 10, 2024', assigned: 'Robert Wilson' },
  { id: '#T005', issue: 'File motion with court', priority: 'Critical', status: 'Open', date: 'Feb 08, 2024', assigned: 'James Martinez' },
  { id: '#T006', issue: 'Billing invoice generation', priority: 'Low', status: 'Resolved', date: 'Feb 05, 2024', assigned: 'Lisa Anderson' },
];

export default function TicketsPage() {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredTickets = filterStatus
    ? ticketsData.filter((t) => t.status === filterStatus)
    : ticketsData;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Low':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return <AlertCircle size={16} />;
      case 'In Progress':
        return <Clock size={16} />;
      case 'Resolved':
        return <CheckCircle size={16} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-red-500/10 text-red-400';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-400';
      case 'Resolved':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Support Tickets</h1>
          <p className="mt-2 text-base text-muted-foreground">Track and manage support issues</p>
        </div>

        {/* Raise Ticket Button */}
        <div className="mb-8 flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg smooth-transition hover:opacity-90">
            <Plus size={18} />
            Raise Ticket
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 flex gap-2 border-b border-white/5 pb-4 overflow-x-auto">
          <button
            onClick={() => setFilterStatus(null)}
            className={`px-4 py-2 text-sm font-medium smooth-transition whitespace-nowrap ${
              filterStatus === null
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Tickets
          </button>
          {['Open', 'In Progress', 'Resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm font-medium smooth-transition whitespace-nowrap ${
                filterStatus === status
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="card-premium p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-primary">{ticket.id}</span>
                    <h3 className="text-base font-bold text-foreground">{ticket.issue}</h3>
                  </div>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">Assigned to: {ticket.assigned}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{ticket.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTickets.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-base text-muted-foreground">No tickets found with the selected filter.</p>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card-premium p-6">
            <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {ticketsData.filter((t) => t.status === 'Open').length}
            </p>
          </div>
          <div className="card-premium p-6">
            <p className="text-sm font-medium text-muted-foreground">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {ticketsData.filter((t) => t.status === 'In Progress').length}
            </p>
          </div>
          <div className="card-premium p-6">
            <p className="text-sm font-medium text-muted-foreground">Resolved</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {ticketsData.filter((t) => t.status === 'Resolved').length}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
