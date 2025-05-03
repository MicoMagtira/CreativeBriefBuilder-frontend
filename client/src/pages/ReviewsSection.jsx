import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ReviewsSection = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError('');
      try {
        const briefId = window.localStorage.getItem('briefId');
        if (!briefId) throw new Error('No brief ID found.');
        const res = await api.get(`/api/briefs/${briefId}`);
        const brandReviews = res.data?.brandReviews?.reviews || [];
        setReviews(brandReviews);
        // Try to get the latest AI summary if available
        const aiSummaries = res.data?.aiSummaries || [];
        const latestSummary = aiSummaries.reverse().find(s => s.fileName === 'AI Creative Brief Summary');
        setSummary(latestSummary?.summary || '');
      } catch (e) {
        // Defensive: If error is a SyntaxError from JSON, show a user-friendly message
        if (e instanceof SyntaxError && e.message && e.message.includes('Unexpected token <')) {
          setError('Server returned an unexpected response. Please try again or contact support.');
        } else {
          setError(e.message || 'Failed to fetch reviews.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    setSummary('');
    try {
      const briefId = window.localStorage.getItem('briefId');
      if (!briefId) throw new Error('No brief ID found.');
      const res = await api.post(`/api/briefs/${briefId}/generate-summary`);
      // Defensive: If summary is not a string, stringify it safely
      let summaryText = res.data.summary;
      if (typeof summaryText !== 'string') {
        summaryText = JSON.stringify(summaryText, null, 2);
      }
      setSummary(summaryText);
    } catch (e) {
      setSummaryError(e.message || 'Failed to generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8 flex flex-col min-h-[60vh]">
        {/* AI Summary Output */}
        {summary && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded p-6 text-gray-900 whitespace-pre-wrap shadow">
            <h3 className="font-bold mb-2 text-lg text-blue-900">AI Creative Brief Summary</h3>
            <div className="text-sm">{summary}</div>
          </div>
        )}
        {summaryError && <div className="mt-2 text-red-600 text-sm">{summaryError}</div>}
        {loading && (
          <div className="flex items-center text-gray-500">
            <LoadingSpinner size={20} color="text-gray-500" />
            Loading...
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
        {!summary && !loading && !error && (
          <div className="text-gray-500">No AI creative brief summary available. Please upload and analyze reviews.</div>
        )}
        <div className="mt-auto flex justify-end">
          <button
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-900 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 disabled:opacity-60"
            onClick={async () => {
  setSummaryLoading(true);
  setSummaryError('');
  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop so spinner shows
  try {
    if (summary) {
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'creative-brief-summary.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      // Optional: Add a short artificial delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      const briefId = window.localStorage.getItem('briefId');
      if (!briefId) throw new Error('No brief ID found.');
      const res = await api.post(`/api/briefs/${briefId}/generate-summary`);
      let summaryText = res.data.summary;
      if (typeof summaryText !== 'string') {
        summaryText = JSON.stringify(summaryText, null, 2);
      }
      setSummary(summaryText);
      // Download after generation
      const blob = new Blob([summaryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'creative-brief-summary.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    if (e instanceof SyntaxError && e.message && e.message.includes('Unexpected token <')) {
      setSummaryError('Server returned an unexpected response. Please try again or contact support.');
    } else {
      setSummaryError(e.message || 'Failed to generate summary.');
    }
  } finally {
    setSummaryLoading(false);
  }
}}
            disabled={summaryLoading || loading || error}
          >
            {summaryLoading ? (
  <span className="flex items-center"><LoadingSpinner size={20} color="text-white" />Generating...</span>
) : (
  'Download Brief'
)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewsSection;
