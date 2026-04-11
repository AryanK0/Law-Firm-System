'use client';

import { Navbar } from '@/components/navbar';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

const casesData = [
  { id: '#2401', title: 'Smith vs. Johnson Corp', client: 'John Smith', status: 'Active', date: 'Jan 15, 2024' },
  { id: '#2402', title: 'Estate Planning - Williams', client: 'Mary Williams', status: 'Active', date: 'Jan 18, 2024' },
  { id: '#2403', title: 'Contract Review - Tech Startup', client: 'StartupXYZ Inc', status: 'Pending', date: 'Feb 02, 2024' },
  { id: '#2404', title: 'Divorce Settlement - Anderson', client: 'Robert Anderson', status: 'In Progress', date: 'Feb 05, 2024' },
  { id: '#2405', title: 'Business Formation - Traders LLC', client: 'David Traders', status: 'Closed', date: 'Dec 10, 2023' },
  { id: '#2406', title: 'Real Estate Transaction', client: 'Jennifer Lee', status: 'Active', date: 'Feb 10, 2024' },
];

export default function CasesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCases = casesData.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-primary/10 text-primary';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-400';
      case 'Closed':
        return 'bg-muted text-muted-foreground';
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Cases</h1>
          <p className="mt-2 text-base text-muted-foreground">Manage and track all client cases</p>
        </div>

        {/* Search and Create */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cases, clients, IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full card-premium pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground smooth-transition focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg smooth-transition hover:opacity-90">
            <Plus size={18} />
            Create Case
          </button>
        </div>

        {/* Cases Table */}
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Case ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCases.map((case_) => (
                  <tr key={case_.id} className="smooth-transition hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{case_.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{case_.title}</td>
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{case_.client}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-md px-3 py-1 text-xs font-medium ${getStatusColor(case_.status)}`}>
                        {case_.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{case_.date}</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-primary font-medium hover:opacity-70 smooth-transition">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredCases.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-base font-light text-muted-foreground">No cases found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}
