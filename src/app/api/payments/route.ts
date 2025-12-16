

import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentOrderStatus,
  listPaymentOrders,
  modernTreasuryClient,
  Payment,
} from '@/lib/modern-treasury';
import { track } from '@/lib/track';

// Helper function to transform payment order to payment format
function transformPaymentOrderToPayment(paymentOrder: any): Payment {
  return {
    id: paymentOrder.id,
    contractorId: paymentOrder.metadata?.contractor_id || '',
    contractorName: paymentOrder.metadata?.contractor_name || '',
    amount: paymentOrder.amount,
    currency: paymentOrder.currency,
    status: paymentOrder.status,
    description: paymentOrder.description || '',
    paymentOrderId: paymentOrder.id,
    createdAt: new Date(paymentOrder.created_at),
    originatingAccountId: paymentOrder.originating_account_id || '',
    receivingAccountId: paymentOrder.receiving_account_id || '',
  };
}

// GET: Fetch all payments (from Modern Treasury payment orders)
export const GET = track(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');

    // Fetch payment orders from Modern Treasury
    const mtPaymentOrders = await listPaymentOrders();

    // Transform payment orders to payment format
    let payments = mtPaymentOrders.body.map(transformPaymentOrderToPayment);

    // Filter by contractor if specified
    if (contractorId) {
      payments = payments.filter((p) => p.contractorId === contractorId);
    }

    console.log("payments is", payments)

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
});

// POST: Create a new payment (payment order in Modern Treasury)
export const POST = track(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      contractorId,
      contractorName,
      amount,
      currency,
      description,
      originatingAccountId,
      receivingAccountId
    } = body;

    // Validation
    if (!contractorId || !contractorName || !amount || !currency || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!originatingAccountId || !receivingAccountId) {
      return NextResponse.json(
        { success: false, error: 'Originating and receiving account IDs are required' },
        { status: 400 }
      );
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create payment order in Modern Treasury
    const paymentOrder = await modernTreasuryClient.paymentOrders.create({
      amount: amountInCents,
      currency: currency.toUpperCase(),
      direction: 'credit', // Sending money
      type: 'ach',
      originating_account_id: originatingAccountId,
      receiving_account_id: receivingAccountId,
      description: description,
      metadata: {
        contractor_id: contractorId,
        contractor_name: contractorName,
      },
    });

    // Create payment object to return
    const payment: Payment = {
      id: paymentOrder.id,
      contractorId,
      contractorName,
      amount: amountInCents,
      currency:paymentOrder.currency,
      status: paymentOrder.status,
      description: paymentOrder.description || description,
      paymentOrderId: paymentOrder.id,
      createdAt: new Date(paymentOrder.created_at),
      originatingAccountId,
      receivingAccountId,
    };

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create payment: ${error}` },
      { status: 500 }
    );
  }
});

// PATCH: Update payment status (fetch from Modern Treasury)
export const PATCH = track(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Fetch updated status from Modern Treasury
    const paymentOrder = await getPaymentOrderStatus(paymentId);

    // Transform to payment format
    const payment = transformPaymentOrderToPayment(paymentOrder);

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    );
  }
});

