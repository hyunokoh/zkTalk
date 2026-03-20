'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Community } from '@zktalk/shared';
import type { CommunityVisibility } from '@zktalk/shared';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export default function NewCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const community = await api<Community>('/api/communities', {
        method: 'POST',
        body: { name, slug, description: description || undefined, visibility },
      });
      router.push(`/communities/${community.slug}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create community. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-gray-700 px-6 py-4">
        <h1 className="text-lg font-bold">Create a Community</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-lg space-y-5 rounded-lg bg-gray-800 p-6"
        >
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-300">
              Community Name
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Awesome Community"
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-300">
              Slug
            </label>
            <div className="flex items-center rounded-md border border-gray-600 bg-gray-700">
              <span className="px-3 text-sm text-gray-400">/communities/</span>
              <input
                id="slug"
                type="text"
                required
                maxLength={50}
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full bg-transparent px-1 py-2 text-sm text-gray-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about?"
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Visibility
            </label>
            <div className="space-y-2">
              {([
                { value: 'public', label: 'Public', desc: 'Anyone can find and join' },
                { value: 'invite_only', label: 'Invite Only', desc: 'Only people with an invite link can join' },
                { value: 'private', label: 'Private', desc: 'Hidden from search, invite only' },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                    visibility === opt.value
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !slug.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
