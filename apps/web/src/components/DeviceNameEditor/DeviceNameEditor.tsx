'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentDevice } from '@zktalk/shared';
import { updateDevice } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';

const MAX_NAME_LENGTH = 60;

interface DeviceNameEditorProps {
  device: AgentDevice;
  /**
   * Whether the current viewer is allowed to rename. Anyone but the device
   * owner sees the static name only — the API also enforces this, but we
   * hide the pencil so non-owners aren't tempted to click into a dead form.
   */
  canEdit: boolean;
  /** Optional class applied to the static name span. */
  className?: string;
}

function PencilIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5l4 4-12 12H4.5v-4l12-12z" />
    </svg>
  );
}

export function DeviceNameEditor({ device, canEdit, className }: DeviceNameEditorProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(device.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setValue(device.name);
  }, [device.name]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const mutation = useMutation({
    mutationFn: (nextName: string) => updateDevice(device.id, { name: nextName }),
    onSuccess: () => {
      setIsEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['agent-devices'] });
    },
    onError: () => {
      setError(t('agents.device.renameError'));
    },
  });

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t('agents.device.renameEmpty'));
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(t('agents.device.renameTooLong', { max: MAX_NAME_LENGTH }));
      return;
    }
    if (trimmed === device.name) {
      setIsEditing(false);
      setError(null);
      return;
    }
    mutation.mutate(trimmed);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue(device.name);
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          ref={inputRef}
          data-testid="device-name-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_NAME_LENGTH}
          disabled={mutation.isPending}
          className="h-7 w-[180px] rounded-md border border-accent bg-bg-elevated px-2 text-[13px] text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60"
          aria-label={t('agents.device.rename')}
        />
        <button
          type="button"
          data-testid="device-name-save"
          onClick={handleSave}
          disabled={mutation.isPending}
          className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-[color:var(--on-accent)] transition hover:bg-accent-strong disabled:opacity-60"
        >
          {mutation.isPending ? t('agents.device.renameSaving') : t('agents.device.renameSave')}
        </button>
        <button
          type="button"
          data-testid="device-name-cancel"
          onClick={handleCancel}
          disabled={mutation.isPending}
          className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-fg-muted transition hover:bg-bg-hover disabled:opacity-60"
        >
          {t('agents.device.renameCancel')}
        </button>
        {error ? (
          <span className="text-[11px] text-danger" data-testid="device-name-error">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={className} data-testid="device-name-static">
        {device.name}
      </span>
      {canEdit ? (
        <button
          type="button"
          data-testid="device-name-edit"
          onClick={() => setIsEditing(true)}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-fg-subtle transition hover:bg-bg-hover hover:text-fg"
          aria-label={t('agents.device.rename')}
          title={t('agents.device.rename')}
        >
          <PencilIcon />
        </button>
      ) : null}
    </span>
  );
}
