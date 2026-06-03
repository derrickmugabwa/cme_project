import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

function isPrivilegedWebinarDeleter(user: { id: string; email?: string | null }) {
  const allowedIds = (process.env.WEBINAR_DELETE_OVERRIDE_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedEmails = (process.env.WEBINAR_DELETE_OVERRIDE_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return (
    allowedIds.includes(user.id) ||
    Boolean(user.email && allowedEmails.includes(user.email.toLowerCase()))
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ canDeleteEnrolledWebinars: false }, { status: 401 });
    }

    return NextResponse.json({
      canDeleteEnrolledWebinars: isPrivilegedWebinarDeleter(user),
    });
  } catch (error: unknown) {
    console.error('Error checking webinar delete permission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check delete permission' },
      { status: 500 }
    );
  }
}
