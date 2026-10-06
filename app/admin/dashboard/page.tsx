'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalRegistered: number;
  pendingApplications: number;
  approvedMembers: number;
  rejectedApplications: number;
  newThisMonth: number;
  schoolsRepresented: number;
}

interface RecentApplication {
  _id: string;
  applicationRef: string;
  fullName: string;
  secondarySchool: string;
  status: string;
  submittedAt: string;
}

const EMPTY_STATS: DashboardStats = {
  totalRegistered: 0,
  pendingApplications: 0,
  approvedMembers: 0,
  rejectedApplications: 0,
  newThisMonth: 0,
  schoolsRepresented: 0,
};

const BRAND = '#1a472a';

const fmt = (n: number) => (n ?? 0).toLocaleString('en-GB');

const formatDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
};

const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full font-medium capitalize',
        s === 'pending' && 'bg-amber-50 text-amber-800 border-amber-200',
        s === 'approved' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
        s === 'rejected' && 'bg-red-50 text-red-800 border-red-200'
      )}
    >
      {status}
    </Badge>
  );
}

/* ---------- Bento tiles ---------- */

function StatTile({
  label,
  value,
  icon: Icon,
  href,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  hint?: string;
  tone?: 'default' | 'green' | 'red';
}) {
  const body = (
    <Card
      className={cn(
        'group h-full bg-white transition-all',
        href && 'hover:border-[#1a472a]/40 hover:shadow-md'
      )}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              tone === 'default' && 'bg-[#1a472a]/10 text-[#1a472a]',
              tone === 'green' && 'bg-emerald-100 text-emerald-700',
              tone === 'red' && 'bg-red-100 text-red-700'
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          {href && (
            <ArrowUpRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-[#1a472a]" />
          )}
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
            {fmt(value)}
          </div>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a] rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

function PipelineTile({ stats }: { stats: DashboardStats }) {
  const total =
    stats.pendingApplications + stats.approvedMembers + stats.rejectedApplications;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const rate = total > 0 ? Math.round(pct(stats.approvedMembers)) : 0;

  const rows = [
    { label: 'Approved', value: stats.approvedMembers, color: 'bg-emerald-500' },
    { label: 'Pending', value: stats.pendingApplications, color: 'bg-amber-400' },
    { label: 'Rejected', value: stats.rejectedApplications, color: 'bg-red-400' },
  ];

  return (
    <Card className="h-full bg-white">
      <CardContent className="flex h-full flex-col justify-between gap-5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Application pipeline
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {fmt(total)} application{total === 1 ? '' : 's'} in total
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-[#1a472a]">{rate}%</div>
            <p className="text-xs text-gray-500">approval rate</p>
          </div>
        </div>

        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100"
          role="img"
          aria-label={`${stats.approvedMembers} approved, ${stats.pendingApplications} pending, ${stats.rejectedApplications} rejected`}
        >
          {rows.map((r) => (
            <div
              key={r.label}
              className={cn('h-full transition-all', r.color)}
              style={{ width: `${pct(r.value)}%` }}
            />
          ))}
        </div>

        <ul className="grid grid-cols-3 gap-2">
          {rows.map((r) => (
            <li key={r.label} className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', r.color)} />
                <span className="truncate">{r.label}</span>
              </div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                {fmt(r.value)}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ActionTile({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-all hover:border-[#1a472a]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1a472a]/10 text-[#1a472a]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block truncate text-xs text-gray-500">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1a472a]" />
    </Link>
  );
}

/* ---------- Loading + error ---------- */

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-6 sm:mb-8">
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-56 rounded-xl lg:row-span-2 lg:h-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
        <Skeleton className="col-span-2 h-40 rounded-xl" />
        <Skeleton className="col-span-2 h-40 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-72 rounded-xl" />
    </div>
  );
}

/* ---------- Page ---------- */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();

      if (!data.success) throw new Error(data.message || 'Could not load dashboard data');

      setStats({ ...EMPTY_STATS, ...data.stats });
      setRecentApplications(data.recentApplications || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-white/60 sm:text-base">
            Welcome to the RSSSOSAA administration portal
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Couldn&apos;t load the latest data</p>
            <p className="text-red-700/80">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchDashboardData} className="bg-white">
            Retry
          </Button>
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Hero: pending applications (2x2 on desktop) */}
        <Link
          href="/admin/dashboard/applications?status=pending"
          className="group col-span-2 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a] focus-visible:ring-offset-2 lg:row-span-2"
        >
          <Card
            className="relative h-full overflow-hidden border-0 text-white shadow-sm transition-shadow group-hover:shadow-lg"
            style={{
              backgroundImage: `linear-gradient(135deg, ${BRAND} 0%, #2d6a45 100%)`,
            }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5" />
            <CardContent className="relative flex h-full min-h-[220px] flex-col justify-between gap-6 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Needs your attention
                </span>
                <ArrowUpRight className="h-5 w-5 text-white/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
              <div>
                <div className="text-6xl font-bold tabular-nums sm:text-7xl">
                  {fmt(stats.pendingApplications)}
                </div>
                <p className="mt-2 text-base font-medium text-white/90">
                  Pending application{stats.pendingApplications === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {stats.pendingApplications > 0
                    ? 'Tap to review and process them'
                    : "You're all caught up"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <StatTile
          label="Approved members"
          value={stats.approvedMembers}
          icon={UserCheck}
          href="/admin/dashboard/members"
          tone="green"
        />
        <StatTile
          label="Schools represented"
          value={stats.schoolsRepresented}
          icon={GraduationCap}
          href="/admin/dashboard/schools"
        />
        <StatTile
          label="New this month"
          value={stats.newThisMonth}
          icon={CalendarPlus}
          hint="Applications received"
        />
        <StatTile
          label="Rejected"
          value={stats.rejectedApplications}
          icon={UserX}
          href="/admin/dashboard/applications?status=rejected"
          tone="red"
        />

        {/* Pipeline */}
        <div className="col-span-2">
          <PipelineTile stats={stats} />
        </div>

        {/* Quick actions */}
        <Card className="col-span-2 bg-white">
          <CardContent className="flex h-full flex-col gap-2 p-3 sm:p-4">
            <p className="px-1 pt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Quick actions
            </p>
            <ActionTile
              href="/admin/dashboard/applications?status=pending"
              title="Review Applications"
              description="Process pending membership applications"
              icon={ClipboardList}
            />
            <ActionTile
              href="/admin/dashboard/members"
              title="Manage Members"
              description="View and update member information"
              icon={Users}
            />
            <ActionTile
              href="/admin/dashboard/reports"
              title="Generate Reports"
              description="Export member data and statistics"
              icon={FileBarChart}
            />
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card className="col-span-2 overflow-hidden bg-white lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-gray-100 p-4 sm:px-6">
            <CardTitle className="text-lg font-semibold text-gray-900 sm:text-xl">
              Recent Applications
            </CardTitle>
            <Link
              href="/admin/dashboard/applications"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1a472a] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentApplications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-gray-500">
                <ClipboardList className="h-8 w-8 text-gray-300" />
                <p className="text-sm">No recent applications</p>
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <ul className="divide-y divide-gray-100 md:hidden">
                  {recentApplications.map((app) => (
                    <li key={app._id}>
                      <Link
                        href={`/admin/dashboard/applications/${app._id}`}
                        className="flex items-center gap-3 px-4 py-3 active:bg-gray-50"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a472a]/10 text-sm font-semibold text-[#1a472a]">
                          {initials(app.fullName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-gray-900">
                              {app.fullName}
                            </span>
                            <StatusBadge status={app.status} />
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {app.secondarySchool}
                          </span>
                          <span className="mt-0.5 flex items-center justify-between text-xs text-gray-400">
                            <span className="font-mono">{app.applicationRef}</span>
                            <span>{formatDate(app.submittedAt)}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Desktop: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        {['Application Ref', 'Full Name', 'School', 'Status', 'Date', ''].map(
                          (h, i) => (
                            <TableHead
                              key={i}
                              className="px-6 text-xs font-medium uppercase tracking-wider text-gray-600"
                            >
                              {h}
                            </TableHead>
                          )
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentApplications.map((app) => (
                        <TableRow key={app._id} className="hover:bg-gray-50/60">
                          <TableCell className="px-6 py-4 font-mono text-sm text-gray-900">
                            {app.applicationRef}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a472a]/10 text-xs font-semibold text-[#1a472a]">
                                {initials(app.fullName)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {app.fullName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate px-6 py-4 text-sm text-gray-600">
                            {app.secondarySchool}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <StatusBadge status={app.status} />
                          </TableCell>
                          <TableCell className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(app.submittedAt)}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Link
                              href={`/admin/dashboard/applications/${app._id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-[#1a472a] hover:underline"
                            >
                              View <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}