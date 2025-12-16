

import { NextRequest, NextResponse } from 'next/server';
import {
  listCounterparties,
  modernTreasuryClient,
  Contractor,
} from '@/lib/modern-treasury';
import { track } from '@/lib/track';

// Helper function to transform counterparty to contractor format
function transformCounterpartyToContractor(counterparty: any): Contractor {
  // Get the first external account if exists
  const externalAccount = counterparty.accounts?.[0];

  return {
    id: counterparty.id,
    name: counterparty.name,
    email: counterparty.email || '',
    phone: counterparty.metadata?.phone || '',
    bankAccountName: externalAccount?.name || '',
    bankRoutingNumber: externalAccount?.routing_details?.[0]?.routing_number || '',
    bankAccountNumber: externalAccount?.account_details?.[0]?.account_number || '',
    counterpartyId: counterparty.id,
    externalAccountId: externalAccount?.id || '',
    createdAt: new Date(counterparty.created_at),
  };
}

// GET: Fetch all contractors (from Modern Treasury counterparties)
export const GET = track(async () => {
  try {
    // Fetch counterparties from Modern Treasury
    const mtCounterparties = await listCounterparties();

    // Transform counterparties to contractor format
    const contractors = mtCounterparties.body.map(transformCounterpartyToContractor);

    return NextResponse.json({
      success: true,
      contractors,
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contractors' },
      { status: 500 }
    );
  }
});

// POST: Create a new contractor(counterparty in Modern Treasury)
export const POST = track(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, email, phone, bankAccountName, bankRoutingNumber, bankAccountNumber } = body;

    // Validation
    if (!name || !email || !bankAccountName || !bankRoutingNumber || !bankAccountNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create counterparty in Modern Treasury
    const counterparty = await modernTreasuryClient.counterparties.create({
      name,
      email,
      accounting: {
        type: 'vendor',
      },
      metadata: {
        phone: phone || '',
      },
    });

    // Create external account for the counterparty
    const externalAccount = await modernTreasuryClient.externalAccounts.create({
      counterparty_id: counterparty.id,
      name: bankAccountName,
      account_type: 'checking',
      party_type: 'business',
      account_details: [
        {
          account_number: bankAccountNumber,
        },
      ],
      routing_details: [
        {
          routing_number: bankRoutingNumber,
          routing_number_type: 'aba',
          payment_type: 'ach',
        },
      ],
    });

    // Create contractor object to return
    const contractor: Contractor = {
      id: counterparty.id,
      name: counterparty.name,
      email: counterparty.email || '',
      phone: phone || '',
      bankAccountName,
      bankRoutingNumber,
      bankAccountNumber,
      counterpartyId: counterparty.id,
      externalAccountId: externalAccount.id,
      createdAt: new Date(counterparty.created_at),
    };

    return NextResponse.json({
      success: true,
      contractor,
    });
  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create contractor' },
      { status: 500 }
    );
  }
});

// DELETE:Remove a contractor (delete counterparty from Modern Treasury)
export const DELETE = track(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('id');

    if (!contractorId) {
      return NextResponse.json(
        { success: false, error: 'Contractor ID is required' },
        { status: 400 }
      );
    }

    // Delete counterparty from Modern Treasury
    await modernTreasuryClient.counterparties.del(contractorId);

    return NextResponse.json({
      success: true,
      message: 'Contractor deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contractor' },
      { status: 500 }
    );
  }
});

