

// IMPORTANT: Import track.ts first to patch http/https/fetch before SDK initialization
import '@/lib/track';
import ModernTreasury from 'modern-treasury';

// Initialize Modern Treasury client
export const modernTreasuryClient = new ModernTreasury({
  apiKey: process.env.MODERN_TREASURY_API_KEY || '',
  organizationId: process.env.MODERN_TREASURY_ORGANIZATION_ID || '',
  environment: process.env.MODERN_TREASURY_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
});

// Type definitions for our app
export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bankAccountName: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  counterpartyId?: string;
  externalAccountId?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  contractorId: string;
  contractorName: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  paymentOrderId?: string;
  createdAt: Date;
  scheduledDate?: Date;
  originatingAccountId?: string;
  receivingAccountId?: string;
}

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100); // Amount is in cents
};

// Helper function to create a counterparty
export async function createCounterparty(contractor: Contractor) {
  try {
    const counterparty = await modernTreasuryClient.counterparties.create({
      name: contractor.name,
      email: contractor.email,
      accounting: {
        type: 'vendor',
      },
      metadata: {
        contractor_id: contractor.id,
        phone: contractor.phone || '',
      },
});

    return counterparty;
  } catch (error) {
    console.error('Error creating counterparty:', error);
    throw error;
  }
}

// Helper function to create an external account for a counterparty
export async function createExternalAccount(
  counterpartyId: string,
  contractor: Contractor
) {
  try {
    console.log("Contractor is", contractor)
    const externalAccount = await modernTreasuryClient.externalAccounts.create({
      counterparty_id: counterpartyId,
      name: contractor.bankAccountName,
      account_type: 'checking',
      party_type: 'business',
      account_details: [
        {
          account_number: contractor.bankAccountNumber,
        },
      ],
      routing_details: [
        {
          routing_number: contractor.bankRoutingNumber,
          routing_number_type: 'aba',
          payment_type: 'ach',
        },
      ],
      metadata: {
        contractor_id: contractor.id,
      },
    });

    return externalAccount;
  } catch (error) {
    console.error('Error creating external account:', error);
    throw error;
  }
}

// Helper function to create a payment order (ACH payment)
export async function createPaymentOrder(
  originatingAccountId: string,
  receivingAccountId: string,
  amount: number,
  currency: string,
  description: string,
  contractor: Contractor
) {
  try {
    const paymentOrder = await modernTreasuryClient.paymentOrders.create({
      amount: amount, // Amount in cents
      currency: currency,
      direction: 'credit', // Sending money
      type: 'ach',
      originating_account_id: originatingAccountId,
      receiving_account_id: receivingAccountId,
      description: description,
      metadata: {
        contractor_id: contractor.id,
        contractor_name: contractor.name,
      },
    });

    return paymentOrder;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
}

//Helper function to get payment order status
export async function getPaymentOrderStatus(paymentOrderId: string) {
  try {
    const paymentOrder = await modernTreasuryClient.paymentOrders.retrieve(paymentOrderId);
    return paymentOrder;
  } catch (error) {
    console.error('Error fetching payment order:', error);
    throw error;
  }
}

// Helper function to list all counterparties
export async function listCounterparties() {
  try {
    const counterparties = await modernTreasuryClient.counterparties.list({
      per_page: 100,
    });
    return counterparties;
  } catch (error) {
    console.error('Error listing counterparties:', error);
    throw error;
  }
}

// Helper function to list all payment orders
export async function listPaymentOrders() {
  try {
    const paymentOrders = await modernTreasuryClient.paymentOrders.list({
      per_page: 100,
    });
    return paymentOrders;
  } catch (error) {
    console.error('Error listing payment orders:', error);
    throw error;
  }
}

// Helper function to list internal accounts (your company accounts)
export async function listInternalAccounts() {
  try {
    const internalAccounts = await modernTreasuryClient.internalAccounts.list({
      per_page: 100,
      payment_type: "ach"
    });
    return internalAccounts;
  } catch (error) {
    console.error('Error listing internal accounts:', error);
    throw error;
  }
}

