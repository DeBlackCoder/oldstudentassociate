import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import School from '@/lib/models/School';
import { createSchoolSchema } from '@/lib/validations/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    await connectDB();

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { lga: regex }];
    }

    const schools = await School.find(query).sort({ name: 1 });

    return NextResponse.json({ success: true, schools });
  } catch (error) {
    console.error('Schools fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();

    const existing = await School.findOne({ name: new RegExp(`^${parsed.data.name}$`, 'i') });
    if (existing) {
      return NextResponse.json({ error: 'School with this name already exists' }, { status: 409 });
    }

    const school = await School.create(parsed.data);

    return NextResponse.json({ success: true, school }, { status: 201 });
  } catch (error) {
    console.error('School create error:', error);
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
  }
}
