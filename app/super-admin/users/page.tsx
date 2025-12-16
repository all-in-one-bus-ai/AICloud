'use client';

import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Search, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  is_super_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface TenantInfo {
  id: string;
  name: string;
  status: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tenants, setTenants] = useState<Record<string, TenantInfo>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadData = async () => {
    setLoading(true);

    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('id, name, status');

    if (usersData) {
      setUsers(usersData as any);
    }

    if (tenantsData) {
      const tenantsMap: Record<string, TenantInfo> = {};
      (tenantsData as any).forEach((t: TenantInfo) => {
        tenantsMap[t.id] = t;
      });
      setTenants(tenantsMap);
    }

    setLoading(false);
  };

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(u =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredUsers(filtered);
  };

  const getRoleBadge = (role: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) {
      return <Badge className="bg-purple-100 text-purple-700">Super Admin</Badge>;
    }

    switch (role) {
      case 'owner':
        return <Badge className="bg-blue-100 text-blue-700">Owner</Badge>;
      case 'manager':
        return <Badge className="bg-green-100 text-green-700">Manager</Badge>;
      case 'cashier':
        return <Badge className="bg-slate-100 text-slate-700">Cashier</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600 mt-2">View all users across all businesses</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                No users found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const tenant = tenants[user.tenant_id];

                  return (
                    <div
                      key={user.id}
                      className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {user.is_super_admin && (
                              <Shield className="h-5 w-5 text-purple-600" />
                            )}
                            <h3 className="font-semibold text-lg">{user.full_name}</h3>
                            {getRoleBadge(user.role, user.is_super_admin)}
                            {!user.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                            <div>
                              <span className="font-medium">Email:</span> {user.email}
                            </div>
                            <div>
                              <span className="font-medium">Business:</span>{' '}
                              {tenant ? (
                                <>
                                  {tenant.name}
                                  {tenant.status !== 'approved' && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {tenant.status}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                'Unknown'
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Role:</span> {user.role}
                            </div>
                            <div>
                              <span className="font-medium">Joined:</span>{' '}
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
