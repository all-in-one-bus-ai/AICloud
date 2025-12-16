'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Clock, Coffee, LogOut as LogOutIcon, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
}

interface AttendanceRecord {
  id: string;
  staff_id: string;
  staff?: Staff;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  total_break_minutes: number;
  notes: string | null;
}

export default function AttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [onBreak, setOnBreak] = useState(false);
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (tenantId) {
      fetchStaff();
      fetchAttendanceRecords();
    }
  }, [tenantId, filterDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeSession) {
        setAttendanceRecords(prev => prev.map(record =>
          record.id === activeSession.id ? activeSession : record
        ));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchStaff = async () => {
    const { data } = await (supabase as any)
      .from('staff')
      .select('id, first_name, last_name, employee_number')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('first_name');

    if (data) {
      setStaff(data);
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await (supabase as any)
      .from('attendance')
      .select('*, staff(id, first_name, last_name, employee_number)')
      .eq('tenant_id', tenantId)
      .gte('clock_in', startOfDay.toISOString())
      .lte('clock_in', endOfDay.toISOString())
      .order('clock_in', { ascending: false });

    if (!error && data) {
      setAttendanceRecords(data);

      const active = data.find((record: AttendanceRecord) => !record.clock_out);
      if (active) {
        setActiveSession(active);
        setOnBreak(!!active.break_start && !active.break_end);
      }
    }
    setLoading(false);
  };

  const clockIn = async () => {
    if (!selectedStaff) {
      toast({ title: 'Please select a staff member', variant: 'destructive' });
      return;
    }

    const { data, error } = await (supabase as any)
      .from('attendance')
      .insert({
        tenant_id: tenantId,
        staff_id: selectedStaff,
        clock_in: new Date().toISOString(),
      })
      .select('*, staff(id, first_name, last_name, employee_number)')
      .single();

    if (!error && data) {
      toast({ title: 'Clocked in successfully' });
      setActiveSession(data);
      fetchAttendanceRecords();
    } else {
      toast({ title: 'Error clocking in', variant: 'destructive' });
    }
  };

  const clockOut = async () => {
    if (!activeSession) return;

    const clockInTime = new Date(activeSession.clock_in);
    const clockOutTime = new Date();
    const totalMs = clockOutTime.getTime() - clockInTime.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);

    const { error } = await (supabase as any)
      .from('attendance')
      .update({
        clock_out: clockOutTime.toISOString(),
        total_hours: parseFloat(totalHours.toFixed(2)),
      })
      .eq('id', activeSession.id);

    if (!error) {
      toast({ title: 'Clocked out successfully' });
      setActiveSession(null);
      setOnBreak(false);
      fetchAttendanceRecords();
    } else {
      toast({ title: 'Error clocking out', variant: 'destructive' });
    }
  };

  const startBreak = async () => {
    if (!activeSession) return;

    const { error } = await (supabase as any)
      .from('attendance')
      .update({
        break_start: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    if (!error) {
      toast({ title: 'Break started' });
      setOnBreak(true);
      fetchAttendanceRecords();
    } else {
      toast({ title: 'Error starting break', variant: 'destructive' });
    }
  };

  const endBreak = async () => {
    if (!activeSession) return;

    const breakStart = new Date(activeSession.break_start!);
    const breakEnd = new Date();
    const breakMs = breakEnd.getTime() - breakStart.getTime();
    const breakMinutes = Math.floor(breakMs / (1000 * 60));

    const { error } = await (supabase as any)
      .from('attendance')
      .update({
        break_end: breakEnd.toISOString(),
        total_break_minutes: (activeSession.total_break_minutes || 0) + breakMinutes,
      })
      .eq('id', activeSession.id);

    if (!error) {
      toast({ title: 'Break ended' });
      setOnBreak(false);
      fetchAttendanceRecords();
    } else {
      toast({ title: 'Error ending break', variant: 'destructive' });
    }
  };

  const formatDuration = (startTime: string, endTime: string | null = null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTodaysStats = () => {
    const total = attendanceRecords.length;
    const clockedIn = attendanceRecords.filter(r => !r.clock_out).length;
    const avgHours = attendanceRecords
      .filter(r => r.total_hours)
      .reduce((sum, r) => sum + (r.total_hours || 0), 0) / Math.max(1, attendanceRecords.filter(r => r.total_hours).length);

    return { total, clockedIn, avgHours: avgHours.toFixed(1) };
  };

  const stats = getTodaysStats();

  return (
    <DashboardLayout>
      <ModulePage
        title="Attendance Tracking"
        description="Clock in/out and track employee attendance"
      >
        <div className="grid grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Today's Records
              </CardTitle>
              <Calendar className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Currently Clocked In
              </CardTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clockedIn}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Average Hours
              </CardTitle>
              <User className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgHours}h</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Clock In/Out</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSession ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-green-900">
                        {activeSession.staff?.first_name} {activeSession.staff?.last_name}
                      </div>
                      <div className="text-sm text-green-700">
                        Clocked in at {formatTime(activeSession.clock_in)}
                      </div>
                    </div>
                    <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                      {formatDuration(activeSession.clock_in)}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!onBreak && !activeSession.break_start && (
                    <Button
                      onClick={startBreak}
                      variant="outline"
                      className="flex-1"
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Start Break
                    </Button>
                  )}
                  {onBreak && (
                    <Button
                      onClick={endBreak}
                      variant="outline"
                      className="flex-1"
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      End Break
                    </Button>
                  )}
                  <Button
                    onClick={clockOut}
                    variant="destructive"
                    className="flex-1"
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Clock Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="staff">Select Staff Member</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name} ({member.employee_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={clockIn} className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Records</CardTitle>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-48"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Break Time</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No attendance records for this date</TableCell>
                  </TableRow>
                ) : (
                  attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.staff?.first_name} {record.staff?.last_name}
                      </TableCell>
                      <TableCell>{formatTime(record.clock_in)}</TableCell>
                      <TableCell>
                        {record.clock_out ? formatTime(record.clock_out) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.total_break_minutes > 0
                          ? `${record.total_break_minutes} min`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.clock_out
                          ? `${record.total_hours?.toFixed(2)}h`
                          : formatDuration(record.clock_in)}
                      </TableCell>
                      <TableCell>
                        {!record.clock_out ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700">Completed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </ModulePage>
    </DashboardLayout>
  );
}
