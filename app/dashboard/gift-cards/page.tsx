'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Search, CreditCard, DollarSign, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface GiftCard {
  id: string;
  card_number: string;
  pin_code: string;
  card_type: 'gift_card' | 'voucher' | 'promotional';
  initial_value: number;
  current_balance: number;
  issued_date: string;
  expiry_date: string;
  is_active: boolean;
  customers?: {
    name: string;
  };
}

interface GiftCardTransaction {
  id: string;
  transaction_type: 'purchase' | 'redeem' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  notes: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

export default function GiftCardsPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);

  const [formData, setFormData] = useState({
    card_type: 'gift_card',
    initial_value: 0,
    customer_id: '',
    expiry_days: 365,
  });

  const [stats, setStats] = useState({
    totalCards: 0,
    activeCards: 0,
    totalValue: 0,
    redeemedValue: 0,
  });

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const [cardsRes, customersRes] = await Promise.all([
        (supabase as any)
          .from('gift_cards')
          .select('*, customers(name)')
          .eq('tenant_id', tenantId)
          .order('issued_date', { ascending: false }),
        supabase
          .from('customers')
          .select('id, name, email')
          .eq('tenant_id', tenantId)
          .order('name'),
      ]);

      if (cardsRes.data) {
        setGiftCards(cardsRes.data);
        calculateStats(cardsRes.data);
      }
      if (customersRes.data) setCustomers(customersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gift cards data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (cards: GiftCard[]) => {
    const activeCards = cards.filter((c) => c.is_active);
    setStats({
      totalCards: cards.length,
      activeCards: activeCards.length,
      totalValue: activeCards.reduce((sum, c) => sum + Number(c.current_balance), 0),
      redeemedValue: cards.reduce(
        (sum, c) => sum + (Number(c.initial_value) - Number(c.current_balance)),
        0
      ),
    });
  };

  const generateCardNumber = () => {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
  };

  const generatePIN = () => {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  };

  const handleAddCard = async () => {
    if (!tenantId) return;

    if (formData.initial_value <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Initial value must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      const cardNumber = generateCardNumber();
      const pinCode = generatePIN();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + formData.expiry_days);

      const { error } = await (supabase as any).from('gift_cards').insert({
        tenant_id: tenantId,
        card_number: cardNumber,
        pin_code: pinCode,
        card_type: formData.card_type,
        initial_value: formData.initial_value,
        current_balance: formData.initial_value,
        expiry_date: expiryDate.toISOString(),
        issued_to_customer_id: formData.customer_id || null,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Gift card created: ${cardNumber}`,
      });

      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating gift card:', error);
      toast({
        title: 'Error',
        description: 'Failed to create gift card',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (card: GiftCard) => {
    try {
      const { error } = await (supabase as any)
        .from('gift_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Gift card ${card.is_active ? 'deactivated' : 'activated'}`,
      });

      fetchData();
    } catch (error) {
      console.error('Error updating gift card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update gift card',
        variant: 'destructive',
      });
    }
  };

  const viewTransactions = async (card: GiftCard) => {
    setSelectedCard(card);

    const { data } = await (supabase as any)
      .from('gift_card_transactions')
      .select('*')
      .eq('gift_card_id', card.id)
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
    }

    setShowTransactionsDialog(true);
  };

  const resetForm = () => {
    setFormData({
      card_type: 'gift_card',
      initial_value: 0,
      customer_id: '',
      expiry_days: 365,
    });
  };

  const getCardTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      gift_card: 'default',
      voucher: 'secondary',
      promotional: 'default',
    };
    return (
      <Badge variant={variants[type]} className={type === 'promotional' ? 'bg-purple-500' : ''}>
        {type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getTransactionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      purchase: 'bg-green-500',
      redeem: 'bg-blue-500',
      refund: 'bg-orange-500',
      adjustment: 'bg-gray-500',
    };
    return (
      <Badge className={colors[type]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredCards = giftCards.filter((card) => {
    const matchesSearch =
      card.card_number.includes(searchTerm) ||
      card.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && card.is_active) ||
      (statusFilter === 'inactive' && !card.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gift Cards & Vouchers</h1>
            <p className="text-muted-foreground">Manage gift cards and promotional vouchers</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Gift Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Gift Card</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Card Type *</Label>
                  <Select
                    value={formData.card_type}
                    onValueChange={(value) => setFormData({ ...formData, card_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gift_card">Gift Card</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Initial Value (£) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_value}
                    onChange={(e) =>
                      setFormData({ ...formData, initial_value: parseFloat(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Issue to Customer (Optional)</Label>
                  <Select
                    value={formData.customer_id || undefined}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expiry (Days) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.expiry_days}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_days: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCard}>Create Gift Card</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard title="Total Cards" value={stats.totalCards} icon={CreditCard} />
          <StatsCard title="Active Cards" value={stats.activeCards} icon={Gift} />
          <StatsCard
            title="Total Value"
            value={`£${stats.totalValue.toFixed(2)}`}
            icon={DollarSign}
          />
          <StatsCard
            title="Redeemed Value"
            value={`£${stats.redeemedValue.toFixed(2)}`}
            icon={DollarSign}
          />
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by card number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Initial Value</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No gift cards found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium font-mono">
                      {card.card_number.match(/.{1,4}/g)?.join(' ')}
                    </TableCell>
                    <TableCell>{getCardTypeBadge(card.card_type)}</TableCell>
                    <TableCell>{card.customers?.name || '-'}</TableCell>
                    <TableCell>£{Number(card.initial_value).toFixed(2)}</TableCell>
                    <TableCell>£{Number(card.current_balance).toFixed(2)}</TableCell>
                    <TableCell>
                      {card.expiry_date
                        ? format(new Date(card.expiry_date), 'MMM dd, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={card.is_active ? 'default' : 'secondary'}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewTransactions(card)}
                        >
                          Transactions
                        </Button>
                        <Button
                          variant={card.is_active ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleActive(card)}
                        >
                          {card.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Transaction History</DialogTitle>
            </DialogHeader>
            {selectedCard && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <Label className="text-muted-foreground">Card Number</Label>
                    <p className="font-medium font-mono">
                      {selectedCard.card_number.match(/.{1,4}/g)?.join(' ')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PIN Code</Label>
                    <p className="font-medium">{selectedCard.pin_code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Balance</Label>
                    <p className="font-medium text-lg">
                      £{Number(selectedCard.current_balance).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={selectedCard.is_active ? 'default' : 'secondary'}>
                        {selectedCard.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">Transactions</Label>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Balance After</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell>
                              {format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>{getTransactionTypeBadge(txn.transaction_type)}</TableCell>
                            <TableCell
                              className={
                                txn.transaction_type === 'redeem'
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {txn.transaction_type === 'redeem' ? '-' : '+'}£
                              {Number(txn.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>£{Number(txn.balance_after).toFixed(2)}</TableCell>
                            <TableCell>{txn.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
