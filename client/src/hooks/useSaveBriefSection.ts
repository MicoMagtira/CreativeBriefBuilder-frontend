import { useState } from 'react';
import api from '../lib/api';

interface SaveSectionResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  saveSection: (section: string, data: Record<string, any>) => Promise<string | null>;
}

export function useSaveBriefSection(): SaveSectionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const saveSection = async (section: string, data: Record<string, any>): Promise<string | null> => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      let response, result;
      if (section === 'brandInfo' && data.briefId) {
        // PATCH for brandInfo only
        response = await api.patch(`/api/briefs/${data.briefId}`, data);
        result = response.data;
      } else {
        // POST for all other sections
        response = await api.post('/api/briefs/save-section', { section, ...data });
        result = response.data;
      }
      if ((response.status < 200 || response.status >= 300) || !result.success) {
        setError((result.error ? `[${section}] ` + result.error : `Failed to save section: ${section}`));
        setSuccess(false);
        setLoading(false);
        return null;
      }
      setSuccess(true);
      setLoading(false);
      return result.briefId || data.briefId || null;
    } catch (err: any) {
      setError(`[${section}] ` + (err?.message || 'Unknown error'));
      setSuccess(false);
      setLoading(false);
      return null;
    }
  };

  return { loading, error, success, saveSection };
}
