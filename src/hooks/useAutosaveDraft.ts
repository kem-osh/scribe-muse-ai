import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface DraftData {
  title: string;
  content: string;
  contentType: string;
  sourceUrl: string;
  timestamp: number;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;

export const useAutosaveDraft = (contentType: string) => {
  const { user } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const getDraftKey = useCallback(() => {
    if (!user?.id) return null;
    return `draft_${user.id}_${contentType}`;
  }, [user?.id, contentType]);

  const saveDraft = useCallback((data: Omit<DraftData, 'timestamp'>) => {
    const key = getDraftKey();
    if (!key) return;

    const draftData: DraftData = {
      ...data,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(draftData));
      setLastSaved(draftData.timestamp);
      setHasDraft(true);
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [getDraftKey]);

  const loadDraft = useCallback((): DraftData | null => {
    const key = getDraftKey();
    if (!key) return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft = JSON.parse(stored) as DraftData;
      
      // Check if draft is less than 7 days old
      const isRecent = Date.now() - draft.timestamp < 7 * 24 * 60 * 60 * 1000;
      if (!isRecent) {
        clearDraft();
        return null;
      }

      setHasDraft(true);
      setLastSaved(draft.timestamp);
      return draft;
    } catch (error) {
      console.warn('Failed to load draft:', error);
      return null;
    }
  }, [getDraftKey]);

  const clearDraft = useCallback(() => {
    const key = getDraftKey();
    if (!key) return;

    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      setLastSaved(null);
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }, [getDraftKey]);

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft();
    setHasDraft(!!draft);
  }, [loadDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    lastSaved,
  };
};