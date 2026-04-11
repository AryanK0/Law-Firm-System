'use client';

import { Navbar } from '@/components/navbar';
import { Card } from '@/components/card-component';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Briefcase, Users, DollarSign, AlertCircle } from 'lucide-react';

const caseData = [
  { name: 'Active', value: 24 },
  { name: 'Pending', value: 12 },
  { name: 'Closed', value: 48 },
];

const billingData = [
  { month: 'Jan', amount: 45000 },
  { month: 'Feb', amount: 52000 },
  { month: 'Mar', amount: 48000 },
  { month: 'Apr', amount: 61000 },
  { month: 'May', amount: 55000 },
  { month: 'Jun', amount: 67000 },
];

const COLORS = ['#22D3EE', '#3B82F6', '#06B6D4'];

export default function Dashboard() {
  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Hero Section */}
        <section className="mb-20">
          <h1 className="max-w-3xl">
            <span className="block text-6xl font-semibold tracking-tight text-foreground mb-2">
              Precision in Legal
            </span>
            <span 
              className="block text-6xl font-semibold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.25)' }}
            >
              Management
            </span>
          </h1>
          <div className="mt-6 flex items-center gap-4">
            <div 
              className="h-0.5 w-32 rounded-full opacity-80"
              style={{ background: 'linear-gradient(90deg, #22D3EE, #3B82F6)' }}
            />
          </div>
          <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed">
            Streamline your practice with our comprehensive law firm management system. Designed for precision, built for professionals.
          </p>
        </section>

        {/* Stats Cards */}
        <section className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card
            title="Active Cases"
            value="24"
            description="Cases in progress"
            icon={<Briefcase size={20} />}
          />
          <Card
            title="Clients"
            value="156"
            description="Active clients"
            icon={<Users size={20} />}
          />
          <Card
            title="Monthly Billing"
            value="$67K"
            description="June 2024"
            icon={<DollarSign size={20} />}
          />
          <Card
            title="Open Tickets"
            value="8"
            description="Pending support"
            icon={<AlertCircle size={20} />}
          />
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Case Status Chart */}
          <div className="card-premium p-8">
            <h2 className="mb-8 text-lg font-bold text-foreground">Case Status Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={caseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#22D3EE"
                  dataKey="value"
                >
                  {caseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} cases`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Billing Chart */}
          <div className="card-premium p-8">
            <h2 className="mb-8 text-lg font-bold text-foreground">Billing Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={billingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(11, 17, 32, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '1rem',
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="amount" fill="#22D3EE" name="Revenue" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mt-20">
          <h2 className="mb-8 text-lg font-bold text-foreground">Recent Activity</h2>
          <div className="card-premium p-8 space-y-1">
            {[
              { action: 'Case #2401 updated', time: '2 hours ago', status: 'Active' },
              { action: 'New client onboarded: Acme Corp', time: '5 hours ago', status: 'Success' },
              { action: 'Document uploaded: Contract Review', time: '1 day ago', status: 'Complete' },
              { action: 'Support ticket #534 resolved', time: '2 days ago', status: 'Closed' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 border-b border-white/5 last:border-b-0 smooth-transition hover:bg-white/[0.02] px-2 -mx-2">
                <div>
                  <p className="font-medium text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-md bg-white/5 text-primary">{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
