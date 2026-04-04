'use client';

import { useParams } from 'next/navigation';
import { useMobileNavStore } from '@/stores/mobile-nav';
import { DmList } from '@/components/DmList';

export default function DmLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const conversationId = params.conversationId as string | undefined;
  const dmShowList = useMobileNavStore((s) => s.dmShowList);
  const setDmShowList = useMobileNavStore((s) => s.setDmShowList);

  // On mobile: if a conversation is selected and list is hidden, show only conversation
  const hasActiveConversation = !!conversationId;

  return (
    <div className="flex h-full w-full">
      {/* DmList: always visible on desktop, conditionally on mobile */}
      <div
        className={`h-full shrink-0 md:block ${
          hasActiveConversation && !dmShowList ? 'hidden' : 'block w-full md:w-auto'
        }`}
      >
        <DmList onConversationSelect={() => setDmShowList(false)} />
      </div>

      {/* Conversation area: always visible on desktop, conditionally on mobile */}
      <div
        className={`flex min-w-0 flex-1 md:flex ${
          hasActiveConversation && !dmShowList ? 'flex' : !hasActiveConversation ? 'hidden md:flex' : 'hidden md:flex'
        }`}
      >
        {/* Mobile back button */}
        {hasActiveConversation && (
          <button
            onClick={() => setDmShowList(true)}
            className="fixed left-14 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-gray-300 shadow-lg hover:bg-gray-700 md:hidden"
            aria-label="Back to conversations"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
