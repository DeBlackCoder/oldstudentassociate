'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

interface Application {
  _id: string;
  applicationRef: string;
  fullName: string;
  email: string;
  secondarySchool: string;
  graduationYear: number;
  status: string;
  submittedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        'rounded-full',
        status === 'Pending' && 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
        status === 'Approved' && 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
        status === 'Rejected' && 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
      )}
    >
      {status}
    </Badge>
  );
}

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const url = `/api/admin/applications?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter(
    (app) =>
      app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicationRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.secondarySchool.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Applications Management</h1>
        <p className="text-white/60">Review and process membership applications</p>
      </div>

      {/* Filters */}
      <Card className="bg-white mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or reference..."
                className="h-10"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? 'all')}>
                <SelectTrigger id="status-filter" className="w-full h-10">
                  <SelectValue placeholder="All Applications" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredApplications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Ref Number
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Full Name
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    School
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Year
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Submitted
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app._id}>
                    <TableCell className="px-6 py-4 font-mono text-sm text-gray-900">
                      {app.applicationRef}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-900">
                      {app.fullName}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600">
                      {app.email}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600">
                      {app.secondarySchool}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600">
                      {app.graduationYear}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600">
                      {new Date(app.submittedAt).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/admin/dashboard/applications/${app._id}`}
                        className="text-sm text-[#1a472a] hover:underline font-medium"
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">No applications found</div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="mt-4 text-sm text-white/40">
        Showing {filteredApplications.length} of {applications.length} applications
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}
