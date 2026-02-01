import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getGroups, createGroup, updateGroup, deleteGroup, ensureUser } from '@/lib/db';
import { currentUser } from '@repo/auth/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groups = await getGroups(userId);
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user exists in database
  const user = await currentUser();
  if (user) {
    await ensureUser(userId, user.email || '', user.user_metadata?.name);
  }

  const { name } = await request.json();
  const group = await createGroup(userId, name);
  return NextResponse.json({ success: true, group });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, wordIds } = await request.json();
  const group = await updateGroup(userId, id, { name, wordIds });

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, group });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const deleted = await deleteGroup(userId, id);
  if (!deleted) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
