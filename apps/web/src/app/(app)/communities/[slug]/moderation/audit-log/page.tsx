'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuditLogTable } from '@/components/AuditLogTable';
import type { Community, ModerationAction } from '@zktalk/shared';

export default function AuditLogPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['audit-log', community?.id],
    queryFn: () =>
      api<ModerationAction[]>(
        `/api/communities/${community!.id}/audit-log`,
      ),
    enabled: !!community,
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Audit Log</h1>
      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading audit log...</p>
        ) : (
          <AuditLogTable actions={actions} />
        )}
      </div>
    </div>
  );
}
