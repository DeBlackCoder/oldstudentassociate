import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import School from '@/lib/models/School';
import { updateSchoolSchema } from '@/lib/validations/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const school = await School.findById(id);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, school });
  } catch (error) {
    console.error('School fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch school' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();

    const school = await School.findById(id);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const updated = await School.findByIdAndUpdate(id, parsed.data, { new: true });

    return NextResponse.json({ success: true, school: updated });
  } catch (error) {
    console.error('School update error:', error);
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const school = await School.findById(id);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    await School.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('School delete error:', error);
    return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 });
  }
}
