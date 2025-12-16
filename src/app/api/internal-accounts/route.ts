

import { NextResponse } from 'next/server';
import { listInternalAccounts } from '@/lib/modern-treasury';
import { track } from '@/lib/track';

// GET: Fetch all internal accounts (your company accounts)
export const GET = track(async () => {
  try {
    const internalAccounts = await listInternalAccounts();

    console.log("listInternalAccounts is", internalAccounts);

    return NextResponse.json({
      success: true,
      internalAccounts: internalAccounts.body,
    });
  } catch (error) {
    console.error('Error fetching internal accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch internal accounts' },
      { status: 500 }
    );
  }
});

