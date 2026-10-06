import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import School from '@/lib/models/School';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lga = searchParams.get('lga');

    await connectDB();

    const query: Record<string, unknown> = { isActive: true };
    if (lga) {
      query.lga = new RegExp(`^${lga}$`, 'i');
    }

    const schools = await School.find(query)
      .select('_id name lga')
      .sort({ name: 1 });

    return NextResponse.json({ success: true, schools });
  } catch (error) {
    console.error('Public schools fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}
