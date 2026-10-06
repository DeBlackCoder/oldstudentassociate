'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const handleExport = (type: string) => {
    alert(`${type} export feature coming soon`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reports & Export</h1>
        <p className="text-white/60">Generate and download reports for association data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Export All Members</CardTitle>
            <CardDescription>
              Download complete member list with all details in CSV format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('CSV')}
              className="bg-[#1a472a] hover:bg-[#2d5f3f] text-white border-0"
            >
              Export to CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pending Applications Report</CardTitle>
            <CardDescription>
              Download list of all pending applications for review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('Pending')}
              className="bg-[#1a472a] hover:bg-[#2d5f3f] text-white border-0"
            >
              Export Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Schools Statistics</CardTitle>
            <CardDescription>Member distribution across different schools</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('Schools')}
              className="bg-[#1a472a] hover:bg-[#2d5f3f] text-white border-0"
            >
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Monthly Statistics</CardTitle>
            <CardDescription>Applications and approvals by month</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleExport('Monthly')}
              className="bg-[#1a472a] hover:bg-[#2d5f3f] text-white border-0"
            >
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
