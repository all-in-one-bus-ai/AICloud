'use client';

import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Check, Edit, Eye, DollarSign } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_branches: number;
  max_users: number;
  features: any;
  is_active: boolean;
  display_order: number;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order');

    if (!error && data) {
      setPlans(data as any);
    }
    setLoading(false);
  };

  const getFeatureCount = (features: any) => {
    if (!features) return 0;
    return Object.values(features).filter(v => v === true).length;
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
            <p className="text-slate-600 mt-2">Manage pricing plans and feature packages</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`${
                  plan.name === 'Professional'
                    ? 'border-blue-500 border-2 shadow-lg relative'
                    : ''
                }`}
              >
                {plan.name === 'Professional' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.is_active ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 min-h-[40px]">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border-b pb-4">
                    <div className="flex items-baseline gap-1">
                      <DollarSign className="h-6 w-6 text-slate-600" />
                      <div className="text-4xl font-bold">{plan.price_monthly.toFixed(0)}</div>
                      <span className="text-slate-600">/month</span>
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      or ${plan.price_yearly.toFixed(2)}/year (save {Math.round((1 - (plan.price_yearly / (plan.price_monthly * 12))) * 100)}%)
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="font-semibold text-slate-900 mb-3">Limits</div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Users</span>
                          <span className="font-medium text-slate-900">
                            {plan.max_users === 999 ? 'Unlimited' : plan.max_users}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Branches</span>
                          <span className="font-medium text-slate-900">
                            {plan.max_branches === 999 ? 'Unlimited' : plan.max_branches}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-900 mb-3">
                        Features ({getFeatureCount(plan.features)} modules)
                      </div>
                      <div className="space-y-2 text-sm">
                        {plan.features && Object.entries(plan.features).filter(([_, enabled]) => enabled).slice(0, 8).map(([key, _], idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600">
                              {key.replace('feature_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          </div>
                        ))}
                        {getFeatureCount(plan.features) > 8 && (
                          <div className="text-xs text-slate-500 pl-6">
                            + {getFeatureCount(plan.features) - 8} more features
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-slate-50">
          <CardContent className="py-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Plan Assignment</h3>
              <p className="text-sm text-slate-600">
                To assign a plan to a business, go to <strong>Businesses</strong> page and use the <strong>Features</strong> button,
                or manually configure feature flags for each business.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
