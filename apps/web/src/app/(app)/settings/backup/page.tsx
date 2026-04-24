'use client';

import React, { useState, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { devLogError } from '@/lib/client-log';
import {
  getBackupExportErrorMessage,
  getBackupImportErrorMessage,
} from '@/lib/error-copy';
import {
  encrypt,
  decrypt,
  generateKeyPair,
  getPrivateKey,
  storePrivateKey,
} from '@/lib/crypto';

interface BackupData {
  version: number;
  exportedAt: string;
  userId: string;
  channelMessages: unknown[];
  dmMessages: unknown[];
}

type BackupStatusTone = 'neutral' | 'success' | 'error';

export default function BackupSettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<BackupStatusTone>('neutral');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureBackupKey = async (userId: string): Promise<string> => {
    const existingPrivateKey = await getPrivateKey(userId);
    if (existingPrivateKey) {
      return existingPrivateKey;
    }

    setStatus(t('backup.generatingKey'));
    setStatusTone('neutral');

    const keyPair = await generateKeyPair();
    await storePrivateKey(userId, keyPair.privateKey);
    await api('/api/me/keys', {
      method: 'PUT',
      body: { publicKey: keyPair.publicKey },
    });

    return keyPair.privateKey;
  };

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    setStatus(t('backup.encrypting'));
    setStatusTone('neutral');

    try {
      // Fetch the backup data from server
      const backup = await api<BackupData>('/api/me/backup', {
        method: 'POST',
      });

      // Encrypt with a derived key from the user's keypair.
      // If this is the first backup/export on desktop, create the keypair now.
      const privateKeyBase64 = await ensureBackupKey(user.id);
      setStatus(t('backup.encrypting'));

      // Use a symmetric key derived from the private key for backup encryption
      const backupJson = JSON.stringify(backup);
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(privateKeyBase64.slice(0, 32)),
        'PBKDF2',
        false,
        ['deriveKey'],
      );

      const backupKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('zktalk-backup-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      const encrypted = await encrypt(backupJson, backupKey);

      // Download as file
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zktalk-backup-${new Date().toISOString().slice(0, 10)}.enc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(t('backup.exportSuccess'));
      setStatusTone('success');
    } catch (err) {
      setStatus(getBackupExportErrorMessage(t, err));
      setStatusTone('error');
      devLogError('[Backup] Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    setStatus(t('backup.decrypting'));
    setStatusTone('neutral');

    try {
      const encryptedData = await file.text();

      // Validate with server
      await api('/api/me/restore', {
        method: 'POST',
        body: { encryptedData },
      });

      // Decrypt locally
      const privateKeyBase64 = await getPrivateKey(user.id);
      if (!privateKeyBase64) {
        setStatus(t('backup.noKey'));
        setStatusTone('error');
        setIsImporting(false);
        return;
      }

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(privateKeyBase64.slice(0, 32)),
        'PBKDF2',
        false,
        ['deriveKey'],
      );

      const backupKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('zktalk-backup-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      const decrypted = await decrypt(encryptedData, backupKey);
      const backup = JSON.parse(decrypted) as BackupData;

      setStatus(t('backup.importSuccessDetail', {
        channelCount: backup.channelMessages.length,
        dmCount: backup.dmMessages.length,
      }));
      setStatusTone('success');
    } catch (err) {
      setStatus(getBackupImportErrorMessage(t, err));
      setStatusTone('error');
      devLogError('[Backup] Import failed:', err);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-fg">
        {t('backup.title')}
      </h1>

      <div className="space-y-6">
        {/* Export */}
        <div className="rounded-lg border border-line bg-bg-subtle p-5">
          <h2 className="text-lg font-semibold text-fg">
            {t('backup.export')}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {t('backup.exportDesc')}
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? t('backup.encrypting') : t('backup.export')}
          </button>
        </div>

        {/* Import */}
        <div className="rounded-lg border border-line bg-bg-subtle p-5">
          <h2 className="text-lg font-semibold text-fg">
            {t('backup.import')}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {t('backup.importDesc')}
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-bg-subtle px-4 py-2 text-sm font-medium text-fg hover:bg-bg-hover">
            {isImporting ? t('backup.decrypting') : t('backup.import')}
            <input
              ref={fileInputRef}
              type="file"
              accept=".enc"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>

        {/* Status */}
        {status && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              statusTone === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : statusTone === 'error'
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-line bg-bg-subtle/50 text-fg-muted'
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
