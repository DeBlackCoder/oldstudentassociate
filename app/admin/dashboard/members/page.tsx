'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/admin/members');
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.membershipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Approved Members</h1>
        <p className="text-white/60">View and search all approved association members</p>
      </div>

      {/* Search */}
      <Card className="bg-white mb-6">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-700">Search Members</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="member-search">Search by name, membership number, or email</Label>
            <Input
              id="member-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="h-10 max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      {isLoading ? (
        <Card className="bg-white">
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardContent className="p-0">
            {filteredMembers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                      Membership No.
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                      Full Name
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                      School
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                      Year
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-600 uppercase tracking-wider px-6">
                      Approved On
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member._id}>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {member.membershipNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-gray-900">
                        {member.fullName}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600">
                        {member.secondarySchool}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600">
                        {member.graduationYear}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600">
                        {new Date(member.verifiedAt).toLocaleDateString('en-GB')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">No members found</div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 text-sm text-white/40">
        Showing {filteredMembers.length} of {members.length} members
      </div>
    </div>
  );
}
