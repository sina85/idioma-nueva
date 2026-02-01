import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getWords, createWord, updateWord, deleteWord, ensureUser } from '@/lib/db';
import { currentUser } from '@repo/auth/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const words = await getWords(userId);
  return NextResponse.json({ words });
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

  const { english, spanish } = await request.json();
  const word = await createWord(userId, { english, spanish });
  return NextResponse.json({ success: true, word });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, english, spanish } = await request.json();
  const word = await updateWord(userId, id, { english, spanish });

  if (!word) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, word });
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

  const deleted = await deleteWord(userId, id);
  if (!deleted) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
