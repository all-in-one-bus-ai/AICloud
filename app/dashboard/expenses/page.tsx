'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Pencil, Trash2, Receipt, TrendingUp, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  payment_method: string;
  supplier_id: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  'Rent & Utilities',
  'Salaries & Wages',
  'Inventory Purchases',
  'Marketing & Advertising',
  'Office Supplies',
  'Equipment & Maintenance',
  'Insurance',
  'Professional Services',
  'Transportation',
  'Taxes & Fees',
  'Other',
];

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    description: '',
    payment_method: 'Cash',
    receipt_number: '',
    notes: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    topCategory: '',
  });

  useEffect(() => {
    if (tenantId) {
      fetchExpenses();
    }
  }, [tenantId]);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false });

    if (!error && data) {
      setExpenses(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (data: Expense[]) => {
    const total = data.reduce((sum, exp) => sum + exp.amount, 0);

    const now = new Date();
    const thisMonth = data.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }).reduce((sum, exp) => sum + exp.amount, 0);

    const categoryTotals: Record<string, number> = {};
    data.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    setStats({ total, thisMonth, topCategory });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tenant_id: tenantId,
      created_by: user?.id,
    };

    if (editingExpense) {
      const { error } = await (supabase as any)
        .from('expenses')
        .update(expenseData)
        .eq('id', editingExpense.id);

      if (!error) {
        toast({ title: 'Expense updated successfully' });
        fetchExpenses();
        resetForm();
      } else {
        toast({ title: 'Error updating expense', variant: 'destructive' });
      }
    } else {
      const { error } = await (supabase as any)
        .from('expenses')
        .insert(expenseData);

      if (!error) {
        toast({ title: 'Expense created successfully' });
        fetchExpenses();
        resetForm();
      } else {
        toast({ title: 'Error creating expense', variant: 'destructive' });
      }
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      payment_method: expense.payment_method,
      receipt_number: expense.receipt_number || '',
      notes: expense.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const { error } = await (supabase as any)
        .from('expenses')
        .delete()
        .eq('id', id);

      if (!error) {
        toast({ title: 'Expense deleted successfully' });
        fetchExpenses();
      } else {
        toast({ title: 'Error deleting expense', variant: 'destructive' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: '',
      description: '',
      payment_method: 'Cash',
      receipt_number: '',
      notes: '',
    });
    setEditingExpense(null);
    setDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
            <p className="text-slate-600 mt-1">Track and categorize business expenses</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.total.toFixed(2)}</div>
              <p className="text-xs text-slate-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.thisMonth.toFixed(2)}</div>
              <p className="text-xs text-slate-600 mt-1">Current month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topCategory}</div>
              <p className="text-xs text-slate-600 mt-1">Most spending</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No expenses found</TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.payment_method}</TableCell>
                      <TableCell>{expense.receipt_number || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        £{expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the expense"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="receipt_number">Receipt Number</Label>
                  <Input
                    id="receipt_number"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes (optional)"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
