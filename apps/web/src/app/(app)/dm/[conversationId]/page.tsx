'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DmConversation } from '@/components/DmConversation';
import { saveLastVisited } from '@/lib/user-settings';

export default function DmConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  useEffect(() => {
    if (conversationId) {
      void saveLastVisited({
        kind: 'dm',
        conversationId,
      });
    }
  }, [conversationId]);

  return <DmConversation conversationId={conversationId} />;
}
