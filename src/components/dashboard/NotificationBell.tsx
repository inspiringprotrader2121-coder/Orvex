'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Users, CalendarDays, PhoneMissed, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'NEW_LEAD' | 'NEW_BOOKING' | 'TICKET_REPLY' | 'MISSED_CALL' | 'HUMAN_HANDOFF_REQUEST' | 'TICKET_CREATED';
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

const TYPE_ICON = {
  NEW_LEAD: Users,
  NEW_BOOKING: CalendarDays,
  TICKET_REPLY: Bell,
  TICKET_CREATED: Bell,
  MISSED_CALL: PhoneMissed,
  HUMAN_HANDOFF_REQUEST: Users
};

const TYPE_COLOR = {
  NEW_LEAD: 'text-purple-600 bg-purple-100',
  NEW_BOOKING: 'text-green-600 bg-green-100',
  TICKET_REPLY: 'text-blue-600 bg-blue-100',
  TICKET_CREATED: 'text-blue-600 bg-blue-100',
  MISSED_CALL: 'text-orange-600 bg-orange-100',
  HUMAN_HANDOFF_REQUEST: 'text-red-600 bg-red-100'
};

const TYPE_HREF = {
  NEW_LEAD: '/dashboard/crm',
  NEW_BOOKING: '/dashboard/appointments',
  TICKET_REPLY: '/dashboard/tickets',
  TICKET_CREATED: '/dashboard/tickets',
  MISSED_CALL: '/dashboard/conversations',
  HUMAN_HANDOFF_REQUEST: '/dashboard/conversations'
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data, refetch } = useQuery<NotificationResponse>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/business/notifications?limit=10').then(({ data }) => data),
    refetchInterval: 30_000
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  async function markAsRead(id: string) {
    await api.patch(`/business/notifications/${id}/read`);
    refetch();
  }

  async function markAllAsRead() {
    await api.post('/business/notifications/read-all');
    refetch();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications ({unreadCount})</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] || Bell;
                  const color = TYPE_COLOR[n.type] || 'text-slate-600 bg-slate-100';
                  const href = TYPE_HREF[n.type] || '/dashboard';
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => {
                        setOpen(false);
                        if (!n.readAt) markAsRead(n.id);
                      }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b last:border-0 ${!n.readAt ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <p className={`text-xs font-semibold ${!n.readAt ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                          {!n.readAt && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t px-4 py-2 text-center">
                <Badge variant="secondary" className="text-xs">
                  {notifications.length} recent events
                </Badge>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

