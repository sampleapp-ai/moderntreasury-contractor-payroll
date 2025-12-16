

import { NextRequest, NextResponse } from 'next/server';
import { modernTreasuryClient } from '@/lib/modern-treasury';
import { track } from '@/lib/track';

// GET: Fetch external accounts for a counterparty
export const GET = track(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const counterpartyId = searchParams.get('counterpartyId');

    if (!counterpartyId) {
      return NextResponse.json(
        { success: false, error: 'Counterparty ID is required' },
        { status: 400 }
      );
    }

    // Fetch external accounts from Modern Treasury
    const externalAccounts = await modernTreasuryClient.externalAccounts.list({
      counterparty_id: counterpartyId,
      per_page: 100,
    });

    return NextResponse.json({
      success: true,
      externalAccounts: externalAccounts.body,
    });
  } catch (error) {
    console.error('Error fetching external accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch external accounts' },
      { status: 500 }
    );
  }
});

// POST: Create a new external account for a counterparty
export const POST = track(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      counterpartyId,
      accountName,
      accountNumber,
      routingNumber,
      accountType,
      partyType,
    } = body;

    // Validation
    if (!counterpartyId || !accountName || !accountNumber || !routingNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
}

    // Create external account in Modern Treasury
    const externalAccount = await modernTreasuryClient.externalAccounts.create({
      counterparty_id: counterpartyId,
      name: accountName,
      account_type: accountType || 'checking',
      party_type: partyType || 'business',
      account_details: [
        {
          account_number: accountNumber,
        },
      ],
      routing_details: [
        {
          routing_number: routingNumber,
          routing_number_type: 'aba',
          payment_type: 'ach',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      externalAccount,
    });
  } catch (error) {
    console.error('Error creating external account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create external account' },
      { status: 500 }
    );
  }
});

// DELETE: Delete an external account
export const DELETE = track(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const externalAccountId = searchParams.get('id');

    if (!externalAccountId) {
      return NextResponse.json(
        { success: false, error: 'External account ID is required' },
        { status: 400 }
      );
    }

    // Delete external account from Modern Treasury
    await modernTreasuryClient.externalAccounts.del(externalAccountId);

    return NextResponse.json({
      success: true,
      message: 'External account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting external account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete external account' },
      { status: 500 }
    );
  }
});

