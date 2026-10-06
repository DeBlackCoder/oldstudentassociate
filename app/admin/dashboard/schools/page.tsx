import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export default function SchoolsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Schools Management</h1>
        <p className="text-white/60">Manage secondary schools in the association database</p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            School management features are under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            This section will allow you to add, edit, and manage secondary schools in the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
