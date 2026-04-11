'use client';

import { Navbar } from '@/components/navbar';
import { Card } from '@/components/card-component';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

const clientsData = [
  { id: 'C001', name: 'John Smith', email: 'john@example.com', phone: '(555) 123-4567', cases: 3, type: 'Individual' },
  { id: 'C002', name: 'Acme Corporation', email: 'legal@acme.com', phone: '(555) 234-5678', cases: 7, type: 'Corporate' },
  { id: 'C003', name: 'Mary Williams', email: 'mary.w@email.com', phone: '(555) 345-6789', cases: 2, type: 'Individual' },
  { id: 'C004', name: 'Tech Startup Inc', email: 'hello@techstartup.io', phone: '(555) 456-7890', cases: 5, type: 'Corporate' },
  { id: 'C005', name: 'Robert Anderson', email: 'r.anderson@mail.com', phone: '(555) 567-8901', cases: 1, type: 'Individual' },
  { id: 'C006', name: 'Global Traders LLC', email: 'legal@globaltraders.com', phone: '(555) 678-9012', cases: 4, type: 'Corporate' },
];

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clientsData.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Clients</h1>
          <p className="mt-2 text-base text-muted-foreground">Manage your client relationships and contacts</p>
        </div>

        {/* Search and Create */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full card-premium pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground smooth-transition focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg smooth-transition hover:opacity-90">
            <Plus size={18} />
            Add Client
          </button>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <div key={client.id} className="card-premium p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{client.name}</h3>
                  <p className="text-xs text-primary font-medium">{client.id}</p>
                </div>
                <span className="rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-primary">
                  {client.type}
                </span>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{client.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">{client.phone}</p>
                </div>
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-xl font-bold text-primary">{client.cases}</p>
                </div>
              </div>

              <button className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-primary smooth-transition hover:bg-white/5">
                View Details
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredClients.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-base font-light text-muted-foreground">No clients found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}
