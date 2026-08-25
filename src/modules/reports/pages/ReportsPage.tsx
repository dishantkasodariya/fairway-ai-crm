import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Trophy,
  PieChart,
  Calendar,
  Filter,
  Download,
  Users,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { formatINR, formatSqFt } from '@/modules/core/utils/formatters';
import { Button } from '@/modules/core/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/modules/core/components/ui/Card';

export const ReportsView: React.FC = () => {
  const [dateRange, setDateRange] = useState('q3_2026');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const inquiries = StorageService.getInquiries();
  const companies = StorageService.getCompanies();
  const properties = StorageService.getProperties();
  const users = StorageService.getUsers();
  const tasks = StorageService.getTasks();
  const stages = StorageService.getPipelineStages();

  const wonDeals = inquiries.filter((i) => i.stage === 'won' || i.status === 'Won');
  const lostDeals = inquiries.filter((i) => i.stage === 'lost' || i.status === 'Lost');
  const activeInquiries = inquiries.filter((i) => i.status === 'Active');

  const totalWonValue = wonDeals.reduce((acc, curr) => acc + (curr.wonFinalValueMonthlyINR || curr.budgetMonthlyINR || 0), 0);
  const totalPipelineValue = activeInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

  const completedTasksCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueTasksCount = tasks.filter(
    (t) => t.status === 'Pending' && new Date(t.dueDate) < new Date(new Date().toDateString())
  ).length;
  const onTimeFollowupRate = Math.round((completedTasksCount / (tasks.length || 1)) * 100);

  // Lost reasons distribution
  const lostReasonsCount: Record<string, number> = {};
  lostDeals.forEach((ld) => {
    const reason = ld.lostReason || 'Competitor Selected / Budget Variance';
    lostReasonsCount[reason] = (lostReasonsCount[reason] || 0) + 1;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Analytics</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <BarChart3 className="w-6 h-6 text-fairway-600" />
            <span>Sales & Operations Reports</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Real-time pipeline conversion, salesperson performance, property absorption, and follow-up discipline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs bg-surface border border-border rounded-input px-3 py-1.5 font-medium text-foreground focus:outline-none"
          >
            <option value="q3_2026">Q3 FY27 (Jul - Sep 2026)</option>
            <option value="ytd">Year to Date (FY 2026-27)</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Closed Won Revenue
          </span>
          <span className="text-2xl font-black text-emerald-800 mt-2 block">{formatINR(totalWonValue, true)} / mo</span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            {formatINR(totalWonValue * 12, true)} Annualized Run-Rate
          </span>
        </Card>

        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Active Weighted Pipeline
          </span>
          <span className="text-2xl font-black text-fairway-800 mt-2 block">{formatINR(totalPipelineValue, true)} / mo</span>
          <span className="text-[10px] text-foreground-muted mt-1 block">Across {activeInquiries.length} active inquiries</span>
        </Card>

        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Deal Conversion Rate
          </span>
          <span className="text-2xl font-black text-foreground mt-2 block">
            {Math.round((wonDeals.length / ((wonDeals.length + lostDeals.length) || 1)) * 100)}%
          </span>
          <span className="text-[10px] text-foreground-muted mt-1 block">
            {wonDeals.length} Won · {lostDeals.length} Lost
          </span>
        </Card>

        <Card className="p-4 bg-surface">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Follow-up Discipline
          </span>
          <span className="text-2xl font-black text-fairway-800 mt-2 block">{onTimeFollowupRate}%</span>
          <span className="text-[10px] text-foreground-muted mt-1 block">
            {completedTasksCount} completed on-time · {overdueTasksCount} overdue
          </span>
        </Card>
      </div>

      {/* Grid: Pipeline by Stage & Won/Lost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stage Volume & Value */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline Volume & Monthly Value by Stage</CardTitle>
          </CardHeader>

          <div className="space-y-3 pt-2">
            {stages.map((stg) => {
              const inqs = inquiries.filter((i) => i.stage === stg.key);
              const val = inqs.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);
              const maxVal = Math.max(totalPipelineValue, 1);
              const percent = Math.min(100, Math.round((val / maxVal) * 100));

              return (
                <div key={stg.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{stg.label} ({inqs.length})</span>
                    <span className="font-mono font-bold text-fairway-900">{formatINR(val, true)}/mo</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-fairway-600 transition-all duration-300"
                      style={{ width: `${Math.max(percent, inqs.length > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Salesperson Performance Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Salesperson Performance & Conversion</CardTitle>
          </CardHeader>

          <div className="divide-y divide-border text-xs">
            {users
              .filter((u) => u.role === 'sales' || u.role === 'admin' || u.role === 'super_admin')
              .map((u) => {
                const userInquiries = inquiries.filter((i) => i.salespersonId === u.id);
                const userWon = userInquiries.filter((i) => i.stage === 'won' || i.status === 'Won').length;
                const userActive = userInquiries.filter((i) => i.status === 'Active').length;
                const userVal = userInquiries.reduce((acc, curr) => acc + (curr.budgetMonthlyINR || 0), 0);

                return (
                  <div key={u.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                      <div>
                        <span className="font-bold text-foreground block">{u.name}</span>
                        <span className="text-[10px] text-foreground-muted">{u.role.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <span className="text-[10px] uppercase text-foreground-muted block font-semibold">Active Leads</span>
                        <span className="font-bold text-foreground">{userActive}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-foreground-muted block font-semibold">Won Deals</span>
                        <span className="font-bold text-emerald-800">{userWon}</span>
                      </div>
                      <div className="min-w-[80px]">
                        <span className="text-[10px] uppercase text-foreground-muted block font-semibold">Pipeline</span>
                        <span className="font-mono font-bold text-fairway-900">{formatINR(userVal, true)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Property Occupancy & Warehouse Park Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fairway Warehouse Parks — Inventory & Absorption</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {properties.map((prop) => {
            const leasedArea = prop.totalAreaSqFt - prop.availableAreaSqFt;
            const occupancyRate = Math.round((leasedArea / prop.totalAreaSqFt) * 100);

            return (
              <div key={prop.id} className="p-4 bg-surface-muted/30 rounded-card border border-border text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-fairway-800 bg-fairway-50 px-2 py-0.5 rounded border border-fairway-200">
                    {prop.code}
                  </span>
                  <span className="font-bold text-emerald-800">{occupancyRate}% Leased</span>
                </div>
                <h4 className="font-bold text-foreground leading-snug">{prop.name}</h4>
                <p className="text-[11px] text-foreground-muted">{prop.city} · {prop.corridor}</p>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Available: <strong>{formatSqFt(prop.availableAreaSqFt)}</strong></span>
                    <span>Total: {formatSqFt(prop.totalAreaSqFt)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-fairway-600 rounded-full" style={{ width: `${occupancyRate}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export const ReportsPage = ReportsView;
export default ReportsPage;
