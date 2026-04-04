'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import { EventList } from '@/components/EventList';
import { CreateEventModal } from '@/components/CreateEventModal';
import type { Community } from '@zktalk/shared';

export default function EventsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const currentUser = useAuthStore((s) => s.user);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { roleName, isAdmin, isLoading: roleLoading } = useCommunityRole(community?.id);

  const { data: eventsData } = useQuery({
    queryKey: ['events', community?.id],
    queryFn: () => api<{ events: Array<{
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
    }> }>(`/api/communities/${community!.id}/events`),
    enabled: !!community?.id,
  });

  const canCreateEvent = !!community && !!currentUser && !roleLoading && !!roleName;

  return (
    <div className="mx-auto max-w-3xl p-6" data-testid="events-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('event.upcoming')}
        </h1>
        {canCreateEvent && (
          <button
            onClick={() => setShowCreateModal(true)}
            data-testid="events-create-button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t('event.create')}
          </button>
        )}
      </div>

      <div className="mt-6">
        {community && (
          <EventList
            events={eventsData?.events ?? []}
            communityId={community.id}
            currentUserId={currentUser?.id}
            canManageAllEvents={isAdmin}
          />
        )}
      </div>

      {showCreateModal && community && (
        <CreateEventModal
          communityId={community.id}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
