'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { CreateEventModal } from '@/components/CreateEventModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<EventItem | null>(null);

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
        className="py-8 text-center text-sm text-fg-subtle"
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
          className="rounded-lg border border-line p-4"
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
                className="rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-medium text-fg-subtle dark:hover:bg-bg-subtle"
              >
                {t('common.edit')}
              </button>
              <button
                onClick={() => setPendingDeleteEvent(event)}
                data-testid="event-delete-button"
                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/85 dark:bg-danger/30 dark:text-danger dark:hover:bg-danger/50"
              >
                {t('common.delete')}
              </button>
            </div>
          )}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-fg-muted">{event.title}</h3>
              <p className="mt-0.5 text-sm text-fg-subtle">
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
            <p className="mt-2 text-sm text-fg-muted">{event.description}</p>
          )}

          {event.location && (
            <p className="mt-1 text-xs text-fg-subtle">
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
                  ? 'bg-accent text-[color:var(--on-accent)]'
                  : 'bg-bg-hover text-fg hover:bg-line-subtle dark:hover:bg-bg-subtle'
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
                  ? 'bg-success text-white'
                  : 'bg-bg-hover text-fg hover:bg-line-subtle dark:hover:bg-bg-subtle'
              }`}
            >
              {t('event.going')} ({event.rsvpCounts.going})
            </button>
            <button
              onClick={() => setAttendeesEvent(event)}
              data-testid="event-attendees-button"
              className="rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-medium text-fg-subtle dark:hover:bg-bg-subtle"
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

      <ConfirmDialog
        open={pendingDeleteEvent !== null}
        title={t('common.delete')}
        description={t('event.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDeleteEvent(null)}
        onConfirm={() => {
          if (!pendingDeleteEvent) {
            return;
          }
          deleteMutation.mutate(pendingDeleteEvent.id, {
            onSuccess: () => {
              setPendingDeleteEvent(null);
            },
            onError: () => {
              setPendingDeleteEvent(null);
            },
          });
        }}
      />

      {attendeesEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-subtle p-4"
          onClick={() => setAttendeesEvent(null)}
          data-testid="event-attendees-modal"
          data-event-id={attendeesEvent.id}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-bg-subtle"
            onClick={(e) => e.stopPropagation()}
            data-testid="event-attendees-panel"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-fg-muted">
                  {t('event.attendees')}
                </h2>
                <p className="mt-1 text-sm text-fg-subtle">
                  {attendeesEvent.title}
                </p>
              </div>
              <button
                onClick={() => setAttendeesEvent(null)}
                data-testid="event-attendees-close-button"
                className="rounded-lg px-3 py-1.5 text-sm text-fg-muted hover:bg-bg-hover hover:text-fg-muted dark:hover:bg-bg-subtle dark:hover:text-fg"
              >
                {t('common.cancel')}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {dmMutation.isError && (
                <p className="text-sm text-danger dark:text-danger">
                  {(dmMutation.error as Error).message || 'Failed to open direct message'}
                </p>
              )}

              {attendeesQuery.isLoading && (
                <p className="text-sm text-fg-subtle">
                  {t('common.loading')}
                </p>
              )}

              {!attendeesQuery.isLoading && (attendeesQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-fg-subtle">
                  {t('event.noAttendees')}
                </p>
              )}

              {attendeesQuery.data?.map((attendee) => (
                <div
                  key={attendee.user.id}
                  className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                  data-testid="event-attendee-row"
                  data-user-id={attendee.user.id}
                  data-status={attendee.status}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg-muted">
                      {attendee.user.displayName}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      @{attendee.user.username} · {attendee.status === 'going' ? t('event.going') : t('event.interested')}
                    </p>
                  </div>
                  <button
                    onClick={() => dmMutation.mutate(attendee.user.id)}
                    disabled={dmMutation.isPending}
                    data-testid="event-attendee-message-button"
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
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
