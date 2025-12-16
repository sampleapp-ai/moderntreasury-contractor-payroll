
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  PlusCircle,
  Wallet,
  Users,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Loader2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Contractor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bankAccountName: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  counterpartyId?: string;
  externalAccountId?: string;
  createdAt: string;
}

interface Payment {
  id: string;
  contractorId: string;
  contractorName: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  paymentOrderId?: string;
  createdAt: string;
  originatingAccountId?: string;
  receivingAccountId?: string;
}

interface InternalAccount {
  id: string;
  name: string;
  account_number?: string;
  routing_number?: string;
  created_at?: string;
  account_details?: Array<{
    account_number: string;
  }>;
  routing_details?: Array<{
    routing_number: string;
  }>;
}

export default function ModernTreasuryDashboard() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [internalAccounts, setInternalAccounts] = useState<InternalAccount[]>([]);
  const [isAddingContractor, setIsAddingContractor] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const { toast } = useToast();

  // Form states
  const [contractorForm, setContractorForm] = useState({
    name: '',
    email: '',
    phone: '',
    bankAccountName: '',
    bankRoutingNumber: '',
    bankAccountNumber: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    contractorId: '',
    amount: '',
    currency: 'USD',
    description: '',
    originatingAccountId: '',
    receivingAccountId: '',
  });

  // Fetch contractors
  const fetchContractors = async () => {
    try {
      const response = await fetch('/api/contractors');
      const data = await response.json();
      if (data.success) {
        setContractors(data.contractors || []);
      }
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments');
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  // Fetch internal accounts
  const fetchInternalAccounts = async () => {
    try {
      const response = await fetch('/api/internal-accounts');
      const data = await response.json();
      if (data.success) {
        setInternalAccounts(data.internalAccounts || []);
      }
    } catch (error) {
      console.error('Error fetching internal accounts:', error);
    }
  };

  useEffect(() => {
    fetchContractors();
    fetchPayments();
    fetchInternalAccounts();
  }, []);

  // Refresh all data
  const refreshAllData = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchContractors(), fetchPayments(), fetchInternalAccounts()]);
    setIsRefreshing(false);
    toast({
      title: 'Data refreshed',
      description: 'All dashboard data has been updated',
    });
  };

  // Add contractor
  const handleAddContractor = async () => {
    try {
      setIsAddingContractor(true);
      const response = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractorForm),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Vendor created',
          description: `${contractorForm.name} has been added successfully`,
        });
        fetchContractors();
        setContractorForm({
          name: '',
          email: '',
          phone: '',
          bankAccountName: '',
          bankRoutingNumber: '',
          bankAccountNumber: '',
        });
        setOpenAddDialog(false);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add vendor',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add vendor',
        variant: 'destructive',
      });
} finally {
      setIsAddingContractor(false);
    }
  };

  // Create payment
  const handleCreatePayment = async () => {
    try {
      setIsCreatingPayment(true);

      const contractor = contractors.find(c => c.id === paymentForm.contractorId);
      if (!contractor) {
        toast({
          title: 'Error',
          description: 'Please select a vendor',
          variant: 'destructive',
        });
        return;
      }

      if (!paymentForm.originatingAccountId) {
        toast({
          title: 'Error',
          description: 'Please select an originating account',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: contractor.id,
          contractorName: contractor.name,
          amount: parseFloat(paymentForm.amount),
          currency: paymentForm.currency,
          description: paymentForm.description,
          originatingAccountId: paymentForm.originatingAccountId,
          receivingAccountId: contractor.externalAccountId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Payment created',
          description: `Payment to ${contractor.name} initiated successfully`,
        });
        fetchPayments();
        setPaymentForm({
          contractorId: '',
          amount: '',
          currency: 'USD',
          description: '',
          originatingAccountId: '',
          receivingAccountId: '',
        });
        setOpenPayDialog(false);
        setSelectedContractor(null);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
title: 'Error',
        description: 'Failed to create payment',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Helper to get account number from account
  const getAccountNumber = (account: InternalAccount): string => {
    if (account.account_number) return account.account_number;
    if (account.account_details && account.account_details.length > 0) {
      return account.account_details[0].account_number;
    }
    return '';
  };

  // Helper to format account display name
  const formatAccountDisplay = (account: InternalAccount): string => {
    const accountNumber = getAccountNumber(account);
    const lastFour = accountNumber ? `****${accountNumber.slice(-4)}` : account.id.slice(0, 8);
    return `${account.name} (${lastFour})`;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus.includes('approved') || normalizedStatus.includes('completed') || normalizedStatus.includes('sent')) {
      return (
        <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-50">
          <span className="status-dot status-dot-success mr-1.5"></span>
          {status}
        </Badge>
      );
    }

    if (normalizedStatus.includes('pending') || normalizedStatus.includes('processing')) {
      return (
        <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-50">
          <span className="status-dot status-dot-pending mr-1.5"></span>
          {status}
</Badge>
      );
    }

    if (normalizedStatus.includes('failed') || normalizedStatus.includes('rejected')) {
      return (
        <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50">
          <span className="status-dot status-dot-error mr-1.5"></span>
          {status}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800">
        {status}
      </Badge>
    );
  };

  // Calculate stats
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status.toLowerCase().includes('pending')).length;
  const completedPayments = payments.filter(p =>
    p.status.toLowerCase().includes('approved') ||
    p.status.toLowerCase().includes('completed') ||
    p.status.toLowerCase().includes('sent')
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Environment Banner - Modern Treasury style */}
      <div className="env-banner">
        <div className="flex items-center justify-center gap-2">
          <span className="font-semibold">Developer Sandbox</span>
          <span>•</span>
          <span>Test mode enabled</span>
        </div>
      </div>

      {/* Header */}
      <div className="glass-header border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Vendor Payment System
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={isRefreshing}
                className="gap-1.5 h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-1.5 h-9 btn-teal">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Vendor
</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Add New Vendor</DialogTitle>
                    <DialogDescription>
                      Create a vendor counterparty and configure bank account details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase">Vendor Name</Label>
                        <Input
                          id="name"
                          value={contractorForm.name}
                          onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })}
                          placeholder="Acme Corporation"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
<Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contractorForm.email}
                          onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })}
                          placeholder="payments@acme.com"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase">Phone (Optional)</Label>
                      <Input
                        id="phone"
                        value={contractorForm.phone}
                        onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="h-10"
                      />
                    </div>
                    <div className="mt-divider my-2"></div>
                    <div>
                      <h4 className="text-sm font-semibold mb-4">Bank Account Details</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankAccountName" className="text-xs font-semibold text-muted-foreground uppercase">Account Name</Label>
                          <Input
                            id="bankAccountName"
                            value={contractorForm.bankAccountName}
                            onChange={(e) => setContractorForm({ ...contractorForm, bankAccountName: e.target.value })}
                            placeholder="Acme Corporation Business Account"
className="h-10"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="routingNumber" className="text-xs font-semibold text-muted-foreground uppercase">Routing Number</Label>
                            <Input
                              id="routingNumber"
                              value={contractorForm.bankRoutingNumber}
                              onChange={(e) => setContractorForm({ ...contractorForm, bankRoutingNumber: e.target.value })}
                              placeholder="123456789"
                              maxLength={9}
                              className="h-10 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber" className="text-xs font-semibold text-muted-foreground uppercase">Account Number</Label>
                            <Input
                              id="accountNumber"
                              value={contractorForm.bankAccountNumber}
                              onChange={(e) => setContractorForm({ ...contractorForm, bankAccountNumber: e.target.value })}
                              placeholder="987654321"
                              className="h-10 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddContractor}
                      disabled={isAddingContractor}
                      className="w-full h-10 btn-teal"
                    >
                      {isAddingContractor ? (
                        <>
<Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Vendor
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="mt-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="stat-label">Total Vendors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-value numeric-emphasis">{contractors.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active counterparties</p>
            </CardContent>
          </Card>

          <Card className="mt-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="stat-label">Total Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-value numeric-emphasis">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground mt-1">{payments.length} payment orders</p>
            </CardContent>
          </Card>

          <Card className="mt-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="stat-label">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-value numeric-emphasis">{pendingPayments}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="mt-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="stat-label">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="stat-value numeric-emphasis">{completedPayments}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully sent</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-12">
        <Tabs defaultValue="vendors" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-10 bg-secondary">
            <TabsTrigger value="vendors" className="text-sm">
              Vendors
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-sm">
              Payments
            </TabsTrigger>
            <TabsTrigger value="accounts" className="text-sm">
              Accounts
            </TabsTrigger>
          </TabsList>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <Card className="mt-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Vendors</CardTitle>
                <CardDescription className="text-sm">
                  Manage vendor counterparties and banking information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractors.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-3">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">No vendors</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                      Add your first vendor to start processing payments
                    </p>
                    <Button
                      onClick={() => setOpenAddDialog(true)}
                      size="sm"
                      className="btn-teal"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Vendor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contractors.map((contractor) => (
                      <div
                        key={contractor.id}
                        className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{contractor.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {contractor.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center text-xs text-muted-foreground font-mono">
                                <CreditCard className="h-3 w-3 mr-1" />
                                ****{contractor.bankAccountNumber.slice(-4)}
                              </span>
                              {contractor.externalAccountId && (
                                <Badge variant="outline" className="text-xs h-5">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog open={openPayDialog && selectedContractor?.id === contractor.id} onOpenChange={(open) => {
                            setOpenPayDialog(open);
                            if (!open) setSelectedContractor(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedContractor(contractor);
                                  setPaymentForm({
                                    ...paymentForm,
                                    contractorId: contractor.id,
                                    receivingAccountId: contractor.externalAccountId || '',
                                  });
                                }}
                                className="gap-1.5 h-8 text-xs btn-teal"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                Pay
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                              <DialogHeader>
                                <DialogTitle className="text-xl">Create Payment</DialogTitle>
                                <DialogDescription>
                                  Send an ACH payment to {contractor.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-5 py-4">
                                <div className="p-3 rounded-lg bg-secondary border">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                                      <Building2 className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{contractor.name}</p>
                                      <p className="text-xs text-muted-foreground">{contractor.email}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="originatingAccount" className="text-xs font-semibold text-muted-foreground uppercase">From Account</Label>
                                  <Select
                                    value={paymentForm.originatingAccountId}
                                    onValueChange={(value) =>
                                      setPaymentForm({ ...paymentForm, originatingAccountId: value })
                                    }
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select your company account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {internalAccounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                          <div className="flex items-center gap-2">
                                            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-sm">{formatAccountDisplay(account)}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase">Amount (USD)</Label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id="amount"
                                      type="number"
                                      step="0.01"
                                      value={paymentForm.amount}
                                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                      placeholder="1,000.00"
                                      className="pl-9 h-10 text-base font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase">Description</Label>
                                  <Input
                                    id="description"
                                    value={paymentForm.description}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                    placeholder="Invoice #12345 - Services rendered"
                                    className="h-10"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleCreatePayment}
                                  disabled={isCreatingPayment}
                                  className="w-full h-10 btn-teal"
                                >
                                  {isCreatingPayment ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpRight className="h-4 w-4 mr-2" />
                                      Create Payment
                                    </>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="mt-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Payment Orders</CardTitle>
                <CardDescription className="text-sm">
                  Track ACH payments and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">No payments</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Create your first payment to a vendor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-semibold text-sm">{payment.contractorName}</h3>
                            {getStatusBadge(payment.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5">
                            {payment.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(payment.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {payment.paymentOrderId && (
                              <span className="font-mono">
                                {payment.paymentOrderId.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-6">
                          <p className="font-bold text-base numeric-emphasis">
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {payment.currency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Internal Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4">
            <Card className="mt-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Internal Accounts</CardTitle>
                <CardDescription className="text-sm">
                  Company accounts configured in Modern Treasury
                </CardDescription>
              </CardHeader>
              <CardContent>
                {internalAccounts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-3">
                      <Wallet className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">No accounts</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Configure internal accounts in Modern Treasury
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {internalAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{account.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {getAccountNumber(account) ? `****${getAccountNumber(account).slice(-4)}` : account.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs h-5">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

