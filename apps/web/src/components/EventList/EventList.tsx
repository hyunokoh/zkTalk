'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { CreateEventModal } from '@/components/CreateEventModal';

interface EventItem {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  createdByUserId: string;
  rsvpCounts: { interested: number; going: number };
  userRsvpStatus: 'interested' | 'going' | null;
}

interface EventAttendee {
  status: 'interested' | 'going';
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface EventListProps {
  events: EventItem[];
  communityId: string;
  currentUserId?: string;
  canManageAllEvents?: boolean;
}

export function EventList({
  events,
  communityId,
  currentUserId,
  canManageAllEvents = false,
}: EventListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [attendeesEvent, setAttendeesEvent] = useState<EventItem | null>(null);

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'interested' | 'going' }) =>
      api(`/api/events/${eventId}/rsvp`, { method: 'POST', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', communityId] });
    },
  });

  const removeRsvpMutation = useMutation({
    mutationFn: (eventId: string) =>
      api(`/api/events/${eventId}/rsvp`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', communityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => api(`/api/events/${eventId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', communityId] });
    },
  });

  const attendeesQuery = useQuery({
    queryKey: ['event-attendees', attendeesEvent?.id],
    queryFn: async () => {
      if (!attendeesEvent) return [] as EventAttendee[];
      const res = await api<{ attendees: EventAttendee[] }>(`/api/events/${attendeesEvent.id}/attendees`);
      return res.attendees;
    },
    enabled: !!attendeesEvent,
  });

  const dmMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await api<{ conversation?: { id: string }; id?: string }>(
        '/api/dm/conversations',
        { method: 'POST', body: { targetUserId } },
      );
      return res.id ?? res.conversation?.id ?? null;
    },
    onSuccess: (conversationId) => {
      if (!conversationId) return;
      window.location.assign(`/dm/${conversationId}`);
    },
  });

  const handleRsvp = (eventId: string, status: 'interested' | 'going', currentStatus: string | null) => {
    if (currentStatus === status) {
      removeRsvpMutation.mutate(eventId);
    } else {
      rsvpMutation.mutate({ eventId, status });
    }
  };

  if (events.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
        data-testid="event-empty-state"
      >
        {t('event.noEvents')}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3" data-testid="event-list">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          data-testid="event-card"
          data-event-id={event.id}
          data-user-rsvp-status={event.userRsvpStatus ?? 'none'}
          data-going-count={String(event.rsvpCounts.going)}
          data-interested-count={String(event.rsvpCounts.interested)}
        >
          {(currentUserId === event.createdByUserId || canManageAllEvents) && (
            <div className="mb-3 flex justify-end gap-2">
              <button
                onClick={() => setEditingEvent(event)}
                data-testid="event-edit-button"
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.edit')}
              </button>
              <button
                onClick={() => {
                  const confirmed = window.confirm(t('event.deleteConfirm'));
                  if (confirmed) {
                    deleteMutation.mutate(event.id);
                  }
                }}
                data-testid="event-delete-button"
                className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                {t('common.delete')}
              </button>
            </div>
          )}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {new Date(event.startAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {event.endAt && (
                  <> - {new Date(event.endAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</>
                )}
              </p>
            </div>
          </div>

          {event.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
          )}

          {event.location && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {event.location}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => handleRsvp(event.id, 'interested', event.userRsvpStatus)}
              data-testid="event-rsvp-interested-button"
              data-active={event.userRsvpStatus === 'interested' ? 'true' : 'false'}
              data-count={String(event.rsvpCounts.interested)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                event.userRsvpStatus === 'interested'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('event.interested')} ({event.rsvpCounts.interested})
            </button>
            <button
              onClick={() => handleRsvp(event.id, 'going', event.userRsvpStatus)}
              data-testid="event-rsvp-going-button"
              data-active={event.userRsvpStatus === 'going' ? 'true' : 'false'}
              data-count={String(event.rsvpCounts.going)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                event.userRsvpStatus === 'going'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('event.going')} ({event.rsvpCounts.going})
            </button>
            <button
              onClick={() => setAttendeesEvent(event)}
              data-testid="event-attendees-button"
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {t('event.attendees')}
            </button>
          </div>
        </div>
      ))}
      </div>

      {editingEvent && (
        <CreateEventModal
          communityId={communityId}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {attendeesEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setAttendeesEvent(null)}
          data-testid="event-attendees-modal"
          data-event-id={attendeesEvent.id}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
            data-testid="event-attendees-panel"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('event.attendees')}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {attendeesEvent.title}
                </p>
              </div>
              <button
                onClick={() => setAttendeesEvent(null)}
                data-testid="event-attendees-close-button"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                {t('common.cancel')}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {dmMutation.isError && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {(dmMutation.error as Error).message || 'Failed to open direct message'}
                </p>
              )}

              {attendeesQuery.isLoading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.loading')}
                </p>
              )}

              {!attendeesQuery.isLoading && (attendeesQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('event.noAttendees')}
                </p>
              )}

              {attendeesQuery.data?.map((attendee) => (
                <div
                  key={attendee.user.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                  data-testid="event-attendee-row"
                  data-user-id={attendee.user.id}
                  data-status={attendee.status}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {attendee.user.displayName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      @{attendee.user.username} · {attendee.status === 'going' ? t('event.going') : t('event.interested')}
                    </p>
                  </div>
                  <button
                    onClick={() => dmMutation.mutate(attendee.user.id)}
                    disabled={dmMutation.isPending}
                    data-testid="event-attendee-message-button"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {t('event.messageAttendee')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
