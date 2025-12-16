'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/lib/supabase/types';

type Membership = Database['public']['Tables']['memberships']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

interface MembershipWithCustomer extends Membership {
  customers: Customer;
}

export default function MembershipsPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<MembershipWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMembership, setEditingMembership] = useState<MembershipWithCustomer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    customer_id: '',
    member_name: '',
    card_barcode: '',
    tier: 'bronze' as 'bronze' | 'silver' | 'gold',
  });

  useEffect(() => {
    if (tenantId) {
      loadMemberships();
      loadCustomers();
    }
  }, [tenantId]);

  const loadCustomers = async () => {
    if (!tenantId) return;

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (data) {
      setCustomers(data);
    }
  };

  const loadMemberships = async () => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('memberships')
      .select('*, customers!inner(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load memberships',
        variant: 'destructive',
      });
      return;
    }

    setMemberships(data as MembershipWithCustomer[] || []);
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `MEM${timestamp}${random}`;
  };

  const openCreateDialog = () => {
    setEditingMembership(null);
    setFormData({
      customer_id: '',
      member_name: '',
      card_barcode: generateBarcode(),
      tier: 'bronze',
    });
    setShowDialog(true);
  };

  const openEditDialog = (membership: MembershipWithCustomer) => {
    setEditingMembership(membership);
    setFormData({
      customer_id: membership.customer_id || '',
      member_name: membership.member_name,
      card_barcode: membership.card_barcode,
      tier: membership.tier as 'bronze' | 'silver' | 'gold',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!tenantId || !formData.customer_id || !formData.member_name || !formData.card_barcode) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const cardNumber = formData.card_barcode.replace(/[^0-9]/g, '').slice(-10).padStart(10, '0');

    const membershipData = {
      customer_id: formData.customer_id,
      member_name: formData.member_name,
      card_number: cardNumber,
      card_barcode: formData.card_barcode,
      tier: formData.tier,
    };

    if (editingMembership) {
      const { error } = await (supabase as any)
        .from('memberships')
        .update(membershipData)
        .eq('id', editingMembership.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update membership',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Membership updated successfully',
      });
    } else {
      const { error } = await (supabase as any)
        .from('memberships')
        .insert({
          ...membershipData,
          tenant_id: tenantId,
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create membership',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Membership created successfully',
      });
    }

    setShowDialog(false);
    loadMemberships();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership?')) return;

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete membership',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Membership deleted successfully',
    });

    loadMemberships();
  };

  const filteredMemberships = memberships.filter(m =>
    m.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.card_barcode.includes(searchQuery) ||
    m.customers.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'bg-yellow-100 text-yellow-700';
      case 'silver': return 'bg-slate-100 text-slate-700';
      case 'bronze': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Memberships</h1>
            <p className="text-slate-600 mt-1">Manage loyalty memberships</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Membership
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <Input
                placeholder="Search by member name, barcode, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Member Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Barcode</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-900">Tier</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMemberships.map((membership) => (
                      <tr key={membership.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium">{membership.member_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{membership.customers.name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{membership.card_barcode}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Badge variant="secondary" className={getTierColor(membership.tier)}>
                            {membership.tier.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(membership)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(membership.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMemberships.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          <CreditCard className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No memberships found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMembership ? 'Edit Membership' : 'Add Membership'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <select
                  id="customer"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member_name">Member Name *</Label>
                <Input
                  id="member_name"
                  value={formData.member_name}
                  onChange={(e) => setFormData({ ...formData, member_name: e.target.value })}
                  placeholder="Enter member name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Member Barcode *</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.card_barcode}
                    onChange={(e) => setFormData({ ...formData, card_barcode: e.target.value })}
                    placeholder="Member barcode"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, card_barcode: generateBarcode() })}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Membership Tier *</Label>
                <select
                  id="tier"
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as 'bronze' | 'silver' | 'gold' })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingMembership ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
