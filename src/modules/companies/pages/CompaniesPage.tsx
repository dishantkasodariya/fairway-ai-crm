import React, { useState } from 'react';
import { Building2, Search, Filter, Plus, Download, UploadCloud, MapPin, ArrowUpDown, ChevronRight, User } from 'lucide-react';
import { StorageService } from '@/modules/core/services/storageService';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { Company, PriorityLevel, CompanyStatus } from '@/modules/core/types';
import { Button } from '@/modules/core/components/ui/Button';
import { Badge } from '@/modules/core/components/ui/Badge';
import { Input, Select } from '@/modules/core/components/ui/Input';
import { getPriorityBadge, getCompanyStatusBadge, formatDate } from '@/modules/core/utils/formatters';

export interface CompanyListViewProps {
  onSelectCompany: (id: string) => void;
  onOpenNewCompany: () => void;
  onOpenImport: () => void;
  onNavigateToMap?: () => void;
}

export const CompanyListView: React.FC<CompanyListViewProps> = ({
  onSelectCompany,
  onOpenNewCompany,
  onOpenImport,
  onNavigateToMap,
}) => {
  const { canEdit, currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const companies = StorageService.getCompanies();
  const users = StorageService.getUsers();

  // Extract unique industries & cities
  const uniqueIndustries = Array.from(new Set(companies.map((c) => c.industry))).filter(Boolean);
  const uniqueCities = Array.from(new Set(companies.map((c) => c.city))).filter(Boolean);

  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.legalName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q);

    const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    const matchesOwner = ownerFilter === 'all' || c.assignedOwnerId === ownerFilter;
    const matchesCity = cityFilter === 'all' || c.city === cityFilter;

    return matchesQuery && matchesIndustry && matchesStatus && matchesPriority && matchesOwner && matchesCity;
  });

  const exportCSV = () => {
    const headers = ['Company Name', 'Legal Name', 'Industry', 'City', 'State', 'Status', 'Owner', 'Priority', 'Phone', 'Email', 'Created Date'];
    const rows = filteredCompanies.map((c) => [
      `"${c.name}"`,
      `"${c.legalName}"`,
      `"${c.industry}"`,
      `"${c.city}"`,
      `"${c.state}"`,
      `"${c.status}"`,
      `"${c.assignedOwnerName}"`,
      `"${c.priority}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      `"${c.createdAt.split('T')[0]}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fairway_CRM_Companies_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-left">
      {/* Header Pattern as specified in Design Brief Section 39 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fairway-800 uppercase tracking-wider">CRM / Companies</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2 mt-0.5">
            <Building2 className="w-6 h-6 text-fairway-600" />
            <span>Companies Master</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Top-level customer accounts, linked facilities, active inquiry requirements and ownership.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportCSV} leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenImport} leftIcon={<UploadCloud className="w-3.5 h-3.5" />}>
            Import
          </Button>
          {canEdit && (
            <Button size="sm" variant="primary" onClick={onOpenNewCompany} leftIcon={<Plus className="w-4 h-4" />}>
              Add Company
            </Button>
          )}
        </div>
      </div>

      {/* Combinable Search & Multi-Filter Bar (PRD Section 16) */}
      <div className="bg-surface p-3.5 rounded-card border border-border shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by company name, legal name, city, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-muted/60 border border-border rounded-input focus:border-fairway-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Industry Filter */}
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            {/* City Filter */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Cities</option>
              {uniqueCities.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>

            {/* Owner Filter */}
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Owners</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-input px-2.5 py-1.5 font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Prospect">Prospect</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Filter stats count */}
        <div className="flex items-center justify-between text-[11px] text-foreground-muted pt-1 border-t border-border/60">
          <span>
            Showing <strong>{filteredCompanies.length}</strong> of {companies.length} companies
          </span>
          {(searchQuery || industryFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || ownerFilter !== 'all' || cityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIndustryFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setOwnerFilter('all');
                setCityFilter('all');
              }}
              className="text-fairway-700 hover:text-fairway-900 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* High-density Swiss CRM Table */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-foreground-muted border-b border-border sticky top-0">
              <tr>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-center">Facilities</th>
                <th className="py-3 px-4 text-center">Inquiries</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-foreground-muted">
                    No companies matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => {
                  const prioBadge = getPriorityBadge(comp.priority);
                  const statusBadge = getCompanyStatusBadge(comp.status);

                  return (
                    <tr
                      key={comp.id}
                      onClick={() => onSelectCompany(comp.id)}
                      className="hover:bg-fairway-50/50 cursor-pointer transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-fairway-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-fairway-100 text-fairway-800 font-bold text-xs flex items-center justify-center shrink-0 border border-fairway-200">
                            {comp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold">{comp.name}</span>
                            <span className="text-[10px] text-foreground-muted font-normal">{comp.legalName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="py-3.5 px-4 text-foreground-muted max-w-[180px] truncate">{comp.industry}</td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{comp.city}, {comp.state}</span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-foreground">{comp.assignedOwnerName}</span>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-fairway-800 bg-fairway-50 px-2 py-0.5 rounded border border-fairway-200 capitalize">
                          {comp.prospectStage}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <Badge variant={comp.priority === 'High' ? 'danger' : comp.priority === 'Medium' ? 'warning' : 'default'} size="sm" dot>
                          {comp.priority}
                        </Badge>
                      </td>

                      {/* Facilities Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold bg-surface-muted px-2 py-0.5 rounded border border-border text-[11px]">
                          {comp.facilitiesCount || StorageService.getFacilities(comp.id).length}
                        </span>
                      </td>

                      {/* Inquiries Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold bg-fairway-50 text-fairway-900 px-2 py-0.5 rounded border border-fairway-200 text-[11px]">
                          {comp.inquiriesCount || StorageService.getInquiries(comp.id).length}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-fairway-700 inline-block transition-transform group-hover:translate-x-0.5" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const CompaniesPage = CompanyListView;
export default CompaniesPage;
