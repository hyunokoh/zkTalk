'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Category {
  id: string;
  name: string;
  position: number;
  communityId: string;
}

interface CategoryManagerProps {
  communityId: string;
  onClose: () => void;
}

export function CategoryManager({ communityId, onClose }: CategoryManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', communityId],
    queryFn: async () => {
      const res = await api<{ categories: Category[] }>(
        `/api/communities/${communityId}/categories`,
      );
      return res.categories ?? [];
    },
  });

  const createCategory = useMutation({
    mutationFn: () =>
      api<Category>(`/api/communities/${communityId}/categories`, {
        method: 'POST',
        body: { name: newName, position: categories.length },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', communityId] });
      setNewName('');
    },
  });

  const updateCategory = useMutation({
    mutationFn: (categoryId: string) =>
      api<Category>(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        body: { name: editingName },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', communityId] });
      setEditingId(null);
      setEditingName('');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) =>
      api(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', communityId] });
    },
  });

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim()) return;
      createCategory.mutate();
    },
    [newName, createCategory],
  );

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleUpdate = (categoryId: string) => {
    if (!editingName.trim()) return;
    updateCategory.mutate(categoryId);
  };

  const handleDelete = (categoryId: string) => {
    setPendingDeleteCategoryId(categoryId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-100">{t('category.manage')}</h2>

        {/* Create new category */}
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('category.namePlaceholder')}
            className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newName.trim() || createCategory.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createCategory.isPending ? t('category.creating') : t('category.create')}
          </button>
        </form>

        {/* Category list */}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isLoading && (
            <p className="py-4 text-center text-sm text-gray-400">{t('common.loading')}</p>
          )}

          {!isLoading && categories.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">{t('category.empty')}</p>
          )}

          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2"
            >
              {editingId === category.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(category.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(category.id)}
                    disabled={!editingName.trim() || updateCategory.isPending}
                    className="rounded px-2 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-300"
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-100">{category.name}</span>
                  <button
                    type="button"
                    onClick={() => startEditing(category)}
                    className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-200"
                  >
                    {t('category.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category.id)}
                    disabled={deleteCategory.isPending}
                    className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {t('category.delete')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Error messages */}
        {(createCategory.isError || updateCategory.isError || deleteCategory.isError) && (
          <p className="mt-3 text-sm text-red-400">
            {((createCategory.error ?? updateCategory.error ?? deleteCategory.error) as Error)?.message || t('misc.failed')}
          </p>
        )}

        {/* Close button */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={pendingDeleteCategoryId !== null}
        title={t('category.delete')}
        description={t('category.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        isPending={deleteCategory.isPending}
        onCancel={() => setPendingDeleteCategoryId(null)}
        onConfirm={() => {
          if (!pendingDeleteCategoryId) {
            return;
          }
          deleteCategory.mutate(pendingDeleteCategoryId, {
            onSuccess: () => {
              setPendingDeleteCategoryId(null);
            },
            onError: () => {
              setPendingDeleteCategoryId(null);
            },
          });
        }}
      />
    </div>
  );
}
