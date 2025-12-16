'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/StatsCard';
import { DataTable } from '@/components/DataTable';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Users, UserCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  hourly_rate: number | null;
  employment_type: string;
  hire_date: string;
  is_active: boolean;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'cashier',
    hourly_rate: '',
    employment_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (tenantId) fetchStaff();
  }, [tenantId]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('staff')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('first_name');
    if (data) setStaff(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const staffData = {
      ...formData,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      tenant_id: tenantId,
    };

    if (editingStaff) {
      await (supabase as any).from('staff').update(staffData).eq('id', editingStaff.id);
      toast({ title: 'Staff member updated' });
    } else {
      await (supabase as any).from('staff').insert(staffData);
      toast({ title: 'Staff member added' });
    }
    fetchStaff();
    resetForm();
  };

  const handleDelete = async (item: Staff) => {
    if (confirm(`Delete ${item.first_name} ${item.last_name}?`)) {
      await (supabase as any).from('staff').delete().eq('id', item.id);
      toast({ title: 'Staff member deleted' });
      fetchStaff();
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'cashier',
      hourly_rate: '',
      employment_type: 'full_time',
      hire_date: new Date().toISOString().split('T')[0],
    });
    setEditingStaff(null);
    setDialogOpen(false);
  };

  const columns = [
    { header: 'Name', accessor: (item: Staff) => `${item.first_name} ${item.last_name}` },
    { header: 'Email', accessor: 'email' as keyof Staff },
    { header: 'Phone', accessor: (item: Staff) => item.phone || '-' },
    { header: 'Role', accessor: (item: Staff) => <Badge>{item.role}</Badge> },
    { header: 'Type', accessor: (item: Staff) => item.employment_type.replace('_', ' ') },
    { header: 'Hire Date', accessor: (item: Staff) => new Date(item.hire_date).toLocaleDateString() },
    { header: 'Status', accessor: (item: Staff) => <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge> },
  ];

  const activeStaff = staff.filter(s => s.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
            <p className="text-slate-600 mt-1">Manage employee records and information</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Total Staff" value={staff.length} icon={Users} />
          <StatsCard title="Active Staff" value={activeStaff} icon={UserCheck} />
          <StatsCard title="Departments" value="4" subtitle="Roles assigned" icon={Clock} />
        </div>

        <Card>
          <CardContent className="p-0">
            <DataTable
              data={staff}
              columns={columns}
              loading={loading}
              onEdit={(item) => {
                setEditingStaff(item);
                setFormData({
                  first_name: item.first_name,
                  last_name: item.last_name,
                  email: item.email,
                  phone: item.phone || '',
                  role: item.role,
                  hourly_rate: item.hourly_rate?.toString() || '',
                  employment_type: item.employment_type,
                  hire_date: item.hire_date,
                });
                setDialogOpen(true);
              }}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="stock_manager">Stock Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employment Type *</Label>
                  <Select value={formData.employment_type} onValueChange={(val) => setFormData({...formData, employment_type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hourly Rate (£)</Label>
                  <Input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})} />
                </div>
                <div>
                  <Label>Hire Date *</Label>
                  <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({...formData, hire_date: e.target.value})} required />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{editingStaff ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
