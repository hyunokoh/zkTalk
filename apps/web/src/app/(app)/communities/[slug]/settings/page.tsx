'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import { useP2PSettingsStore } from '@/stores/p2p-settings';
import { useToastStore } from '@/stores/toast';
import { uploadImageAsset } from '@/lib/upload-assets';
import { resolveImageRenderProps } from '@/lib/image-optimization';
import { mergeUpdatedCommunity } from '@/lib/community-cache';
import type { Community } from '@zktalk/shared';

interface Invite {
  id: string;
  code: string;
  maxUses: number | null;
  expiresAt: string | null;
}

export default function CommunitySettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<string>('public');
  const [iconUrl, setIconUrl] = useState('');
  const [iconPreviewVersion, setIconPreviewVersion] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [maxUses, setMaxUses] = useState<string>('0');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const p2pWifiOnly = useP2PSettingsStore((s) => s.wifiOnly);
  const p2pAutoSeed = useP2PSettingsStore((s) => s.autoSeed);
  const setP2PWifiOnly = useP2PSettingsStore((s) => s.setWifiOnly);
  const setP2PAutoSeed = useP2PSettingsStore((s) => s.setAutoSeed);

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });
  const previewIcon = resolveImageRenderProps(
    iconUrl,
    iconPreviewVersion ?? community?.updatedAt,
  );

  useEffect(() => {
    if (community) {
      setName(community.name);
      setDescription(community.description ?? '');
      setVisibility(community.visibility);
      setIconUrl(community.iconUrl ?? '');
    }
  }, [community]);

  const { canManageSettings, isOwner, isLoading: roleLoading } = useCommunityRole(community?.id);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; visibility: string; iconUrl: string | null }) => {
      return api<{ community: Community }>(`/api/communities/${community!.id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: ({ community: updatedCommunity }) => {
      setName(updatedCommunity.name);
      setDescription(updatedCommunity.description ?? '');
      setVisibility(updatedCommunity.visibility);
      setIconUrl(updatedCommunity.iconUrl ?? '');
      setIconPreviewVersion(updatedCommunity.updatedAt);

      queryClient.setQueryData<Community[]>(['communities'], (previous) =>
        mergeUpdatedCommunity(previous, updatedCommunity),
      );
      queryClient.setQueryData(['community', slug], updatedCommunity);
      queryClient.setQueryData(['community', updatedCommunity.id], updatedCommunity);
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      notify('success', t('settings.saved'));
    },
    onError: () => {
      notify('error', t('settings.saveError'));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      const uses = parseInt(maxUses, 10);
      if (uses > 0) body.maxUses = uses;
      const days = parseInt(expiresInDays, 10);
      if (days > 0) body.expiresInHours = days * 24;
      return api<{ invite: Invite }>(`/api/communities/${community!.id}/invites`, {
        method: 'POST',
        body,
      });
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/invite/${data.invite.code}`;
      setInviteLink(link);
      notify('success', t('settings.inviteCreated'));
    },
    onError: () => {
      notify('error', t('settings.saveError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api(`/api/communities/${community!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      router.push('/home');
    },
    onError: () => {
      notify('error', t('community.deleteError'));
    },
  });

  function notify(tone: 'success' | 'error', message: string) {
    showToast({ tone, message });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      name,
      description,
      visibility,
      iconUrl: iconUrl || null,
    });
  }

  function handleCreateInvite() {
    setCopied(false);
    setInviteLink(null);
    inviteMutation.mutate();
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    notify('success', t('webhook.tokenCopied'));
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !community) return;

    try {
      setIsUploadingIcon(true);
      const uploadedUrl = await uploadImageAsset(file, 'community_icon', community.id);
      setIconUrl(uploadedUrl);
      setIconPreviewVersion(String(Date.now()));
    } catch (error) {
      console.error('Community icon upload failed', error);
      notify('error', t('settings.saveError'));
    } finally {
      setIsUploadingIcon(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('community.notFound')}
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
        <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0a2 2 0 100-4 2 2 0 000 4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <p className="text-sm">{t('settings.notAdmin')}</p>
      </div>
    );
  }

  const visibilityOptions = [
    { value: 'public', label: t('community.public'), desc: t('community.publicDesc') },
    { value: 'invite_only', label: t('community.inviteOnly'), desc: t('community.inviteOnlyDesc') },
    { value: 'private', label: t('community.private'), desc: t('community.privateDesc') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-6 pb-12">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
        <h1 className="text-xl font-bold text-gray-100">{t('settings.communitySettings')}</h1>
        <p className="mt-2 text-sm text-gray-400">{t('settings.communitySettingsSubtitle')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="#general"
            className="rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-600 hover:bg-gray-700"
          >
            {t('settings.general')}
          </a>
          <a
            href="#invites"
            className="rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-600 hover:bg-gray-700"
          >
            {t('settings.invites')}
          </a>
          <a
            href="#p2p"
            className="rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-600 hover:bg-gray-700"
          >
            {t('p2p.settings')}
          </a>
          {isOwner ? (
            <a
              href="#danger-zone"
              className="rounded-full border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:border-red-800 hover:bg-red-900/20"
            >
              {t('settings.dangerZone')}
            </a>
          ) : null}
        </div>
      </div>

      {/* General Settings */}
      <form id="general" onSubmit={handleSave} className="mt-6 scroll-mt-6">
        <h2 className="text-lg font-semibold text-gray-300">{t('settings.general')}</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">
              {t('community.iconPhoto')}
            </label>
            <div className="mt-2 flex items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800/60 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-xl font-bold text-white">
                {iconUrl ? (
                  <Image
                    src={previewIcon.src ?? iconUrl}
                    alt={name || community.name}
                    width={64}
                    height={64}
                    unoptimized={previewIcon.unoptimized}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (name || community.name).charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-200">{t('community.iconHint')}</p>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconChange}
                />
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={isUploadingIcon}
                  className="mt-3 rounded-full border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-100 hover:bg-gray-600 disabled:opacity-50"
                >
                  {isUploadingIcon ? t('attachment.uploading') : t('community.iconPhoto')}
                </button>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-400">
              {t('community.name')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-400">
              {t('community.description')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-400">
              {t('community.visibility')}
            </label>
            <div className="mt-2 space-y-2">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                    visibility === opt.value
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-200">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('settings.saving') : t('common.save')}
          </button>
        </div>
      </form>

      {/* Divider */}
      <hr className="my-8 border-gray-700" />

      {/* Invite Section */}
      <div id="invites" className="scroll-mt-6">
        <h2 className="text-lg font-semibold text-gray-300">{t('settings.invites')}</h2>

        <div className="mt-4 space-y-4">
          {/* Max Uses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxUses" className="block text-sm font-medium text-gray-400">
                {t('settings.maxUses')}
              </label>
              <select
                id="maxUses"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="0">{t('settings.unlimited')}</option>
                <option value="1">1</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Expires In */}
            <div>
              <label htmlFor="expiresIn" className="block text-sm font-medium text-gray-400">
                {t('settings.expiresIn')}
              </label>
              <select
                id="expiresIn"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="0">{t('settings.noExpiry')}</option>
                <option value="1">{t('settings.days', { count: 1 })}</option>
                <option value="7">{t('settings.days', { count: 7 })}</option>
                <option value="14">{t('settings.days', { count: 14 })}</option>
                <option value="30">{t('settings.days', { count: 30 })}</option>
              </select>
            </div>
          </div>

          {/* Create Invite Button */}
          <button
            type="button"
            onClick={handleCreateInvite}
            disabled={inviteMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviteMutation.isPending ? t('common.loading') : t('settings.createInvite')}
          </button>

          {/* Generated Invite Link */}
          {inviteLink && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <p className="mb-2 text-xs font-medium text-gray-400">{t('settings.inviteLink')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600"
                >
                  {copied ? t('settings.copied') : t('settings.copy')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P2P File Settings */}
      <hr className="my-8 border-gray-700" />
      <div id="p2p" className="scroll-mt-6">
        <h2 className="text-lg font-semibold text-gray-300">{t('p2p.settings')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('p2p.noLimit')}</p>

        <div className="mt-4 space-y-3">
          {/* WiFi Only Toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-200">{t('p2p.wifiOnly')}</p>
            </div>
            <input
              type="checkbox"
              checked={p2pWifiOnly}
              onChange={(e) => setP2PWifiOnly(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>

          {/* Auto-seed Toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-200">{t('p2p.autoSeed')}</p>
            </div>
            <input
              type="checkbox"
              checked={p2pAutoSeed}
              onChange={(e) => setP2PAutoSeed(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
          </label>
        </div>
      </div>

      {isOwner && (
        <>
          {/* Danger Zone */}
          <hr className="my-8 border-gray-700" />
          <div id="danger-zone" className="scroll-mt-6">
            <h2 className="text-lg font-semibold text-red-400">{t('settings.dangerZone')}</h2>
            <div className="mt-4 rounded-lg border border-red-900/50 bg-red-900/10 p-4 space-y-4">
              <p className="text-sm text-gray-400">
                {t('settings.deleteCommunityWarning')}
              </p>
              <div>
                <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-400">
                  {t('settings.typeToConfirm')}
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={community.name}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteConfirmName !== community.name || deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteMutation.isPending ? t('common.loading') : t('community.deleteCommunity')}
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
