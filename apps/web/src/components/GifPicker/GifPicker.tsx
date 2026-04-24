'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_SEARCH_URL = 'https://tenor.googleapis.com/v2/search';
const TENOR_FEATURED_URL = 'https://tenor.googleapis.com/v2/featured';

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    tinygif?: { url: string; dims: [number, number] };
    gif?: { url: string; dims: [number, number] };
    mediumgif?: { url: string; dims: [number, number] };
  };
}

interface TenorResponse {
  results: TenorGif[];
  next: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const url = searchQuery.trim()
        ? `${TENOR_SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif`
        : `${TENOR_FEATURED_URL}?key=${TENOR_API_KEY}&limit=20&media_filter=tinygif,gif`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Tenor API error');
      const data: TenorResponse = await res.json();
      setGifs(data.results);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch featured GIFs on mount
  useEffect(() => {
    fetchGifs('');
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function handleGifClick(gif: TenorGif) {
    const gifUrl =
      gif.media_formats.gif?.url ??
      gif.media_formats.mediumgif?.url ??
      gif.media_formats.tinygif?.url;
    if (gifUrl) {
      onSelect(gifUrl);
    }
  }

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-lg border border-line bg-white shadow-xl dark:bg-bg-subtle"
    >
      {/* Header */}
      <div className="border-b border-line px-3 py-2">
        <h3 className="text-sm font-semibold text-fg-muted">
          {t('gif.title')}
        </h3>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('gif.search')}
          autoFocus
          className="w-full rounded-md border border-line bg-bg-subtle px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none dark:bg-bg-subtle dark:placeholder:text-fg-muted"
        />
      </div>

      {/* GIF grid */}
      <div className="h-64 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-indigo-500" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {gifs.map((gif) => {
              const thumb =
                gif.media_formats.tinygif?.url ?? gif.media_formats.gif?.url;
              if (!thumb) return null;
              return (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleGifClick(gif)}
                  className="overflow-hidden rounded-md transition-opacity hover:opacity-80"
                >
                  <Image
                    src={thumb}
                    alt={gif.title || 'GIF'}
                    width={240}
                    height={96}
                    unoptimized
                    className="h-24 w-full object-cover"
                    sizes="(max-width: 768px) 50vw, 12rem"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line px-3 py-1.5">
        <p className="text-center text-xs text-fg-subtle">
          {t('gif.poweredBy')}
        </p>
      </div>
    </div>
  );
}
