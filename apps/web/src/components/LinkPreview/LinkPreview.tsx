'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface LinkPreviewProps {
  url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const { data } = useQuery({
    queryKey: ['link-preview', url],
    queryFn: () =>
      api<LinkPreviewData>(`/api/link-preview?url=${encodeURIComponent(url)}`),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: false,
  });

  if (!data || (!data.title && !data.description)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex overflow-hidden rounded-[1rem] border border-[#d7e2ea] bg-[#f4f8fb] shadow-sm transition-colors hover:bg-white"
    >
      {data.image && (
        <div className="h-24 w-24 shrink-0 border-r border-[#d7e2ea]">
          <Image
            src={data.image}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 p-3">
        {data.siteName && (
          <p className="inline-flex rounded-full bg-[#eaf1f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#607384]">
            {data.siteName}
          </p>
        )}
        {data.title && (
          <p className="mt-1 truncate text-sm font-semibold text-[#203040]">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#607384]">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}
