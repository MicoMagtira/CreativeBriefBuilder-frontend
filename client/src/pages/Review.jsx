import React, { useContext, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useBriefId } from '../contexts/BriefIdContext';

const Review = () => {
  const navigate = useNavigate();
  const { briefId } = useBriefId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState({});

  useEffect(() => {
    async function fetchSections() {
      setLoading(true);
      setError('');
      try {
        // Use axios instance to ensure correct backend URL
        const res = await api.get(`/briefs/${briefId}`);
        setSections(res.data);
      } catch (e) {
        setError(e.message || 'Failed to load brief data');
      } finally {
        setLoading(false);
      }
    }
    if (briefId) fetchSections();
  }, [briefId]);

  const handleBack = () => {
    navigate('/reviews');
  };

  const handleFinish = () => {
    // This would submit the form data in a real application
    alert('Form submitted successfully!');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <span className="text-blue-500 font-medium">Loading brief data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <span className="text-red-500 font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900">Review</h2>
          <p className="mt-1 text-sm text-gray-500">Review and submit your ad creative brief.</p>

          {/* Structured AI Summary Section */}
          {(() => {
            // Find the latest AI Creative Brief Summary
            const aiSummaries = sections.aiSummaries || [];
            const latestSummary = [...aiSummaries].reverse().find(s => s.fileName === 'AI Creative Brief Summary');
            if (latestSummary?.summary) {
              return (
                <div className="mt-8 mb-8 p-6 bg-indigo-50 border-l-4 border-indigo-400 rounded-md shadow-sm">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-4">Structured AI Creative Brief Summary</h3>
                  <div className="prose prose-indigo max-w-none text-sm">
                    <ReactMarkdown>{latestSummary.summary}</ReactMarkdown>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Visual Strategy Summary Section */}
          {(() => {
            const aiSummaries = sections.aiSummaries || [];
            const visualStrategySummary = [...aiSummaries].reverse().find(s => s.fileName === 'Visual Strategy Summary');
            if (visualStrategySummary?.summary) {
              return (
                <div className="mt-8 mb-8 p-6 bg-blue-50 border-l-4 border-blue-400 rounded-md shadow-sm">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">AI Visual Strategy Summary</h3>
                  <div className="prose prose-blue max-w-none text-sm">
                    <ReactMarkdown>{visualStrategySummary.summary}</ReactMarkdown>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="mt-6 space-y-8">
            {/* Brand Info Section */}
            {sections.brandInfo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Brand Info</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p><span className="font-medium">Client/Brand Name:</span> {sections.brandInfo.brandName}</p>
                  <p><span className="font-medium">Industry:</span> {sections.brandInfo.industry}</p>
                  <p><span className="font-medium">Product List:</span> {sections.brandInfo.productList}</p>
                  {/* Add more fields as needed */}
                </div>
              </div>
            )}

          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/briefs/${briefId}/download-docx`, {
                    method: 'GET',
                  });
                  if (!res.ok) throw new Error('Failed to download DOCX');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'creative-brief.docx';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  alert('Failed to download DOCX. Please try again.');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-900 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
            >
              Download Brief
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
