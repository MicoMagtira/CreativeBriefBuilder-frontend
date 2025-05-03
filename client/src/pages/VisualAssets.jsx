import React, { useState } from 'react';
import api from '../lib/api';
import { toast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useBriefId } from '../contexts/BriefIdContext';
import { useSaveBriefSection } from '../hooks/useSaveBriefSection';

const VisualAssets = () => {
  const navigate = useNavigate();
  const { briefId, setBriefId } = useBriefId();
  const { loading, success, saveSection } = useSaveBriefSection();
  const adsFileInputRef = React.useRef(null);
  const moodboardFileInputRef = React.useRef(null);
  const [adsIsDragging, setAdsIsDragging] = useState(false);
  const [moodboardIsDragging, setMoodboardIsDragging] = useState(false);
  const [adsFiles, setAdsFiles] = useState([]);
  const [moodboardFiles, setMoodboardFiles] = useState([]);
  const [errors, setErrors] = useState({ ads: '', moodboard: '', ai: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [visualStrategy, setVisualStrategy] = useState(null);



  const handleAnalyzeVisualStrategy = async () => {
    setErrors((prev) => ({ ...prev, ai: '' }));
    setVisualStrategy(null);
    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append('briefId', briefId || '');
      adsFiles.forEach(file => formData.append('topAds', file));
      moodboardFiles.forEach(file => formData.append('moodboard', file));
      const res = await api.post('/api/visual-assets/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVisualStrategy(res.data);
    } catch (e) {
      setErrors((prev) => ({ ...prev, ai: e.message || 'Failed to analyze visual assets' }));
    } finally {
      setAiLoading(false);
    }
  };


  const handleNext = async () => {
    if (loading) return;
    try {
      setErrors({ ads: '', moodboard: '', ai: '' });
      const data = {
        images: adsFiles,
        videos: [],
      };
      if (briefId) data.briefId = briefId;
      const returnedBriefId = await saveSection('visualAssets', data);
      if (returnedBriefId) {
        setBriefId(returnedBriefId);
        toast({ title: 'Visual Assets Saved', description: 'Visual assets saved successfully!', variant: 'default' });
      }
      navigate('/brand-reviews');
    } catch (e) {
      setErrors((prev) => ({ ...prev, ads: 'Failed to save visual assets.' }));
    }
  };

  const handleBack = () => {
    navigate('/offer');
  };

  const MAX_FILE_SIZE_MB = 5;

  const handleAdsDragOver = (e) => {
    e.preventDefault();
    setAdsIsDragging(true);
  };

  const handleAdsDragLeave = (e) => {
    e.preventDefault();
    setAdsIsDragging(false);
  };

  const handleAdsDrop = (e) => {
    e.preventDefault();
    setAdsIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAdsFiles(e.dataTransfer.files);
    }
  };

  const handleAdsFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAdsFiles(e.target.files);
    }
  };

  const handleAdsFiles = (files) => {
    const newFiles = Array.from(files);
    const oversized = newFiles.some(file => file.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setErrors((prev) => ({ ...prev, ads: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.` }));
      return;
    }
    setAdsFiles([...adsFiles, ...newFiles]);
  };

  const openAdsFileSelector = () => {
    if (adsFileInputRef.current) {
      adsFileInputRef.current.click();
    }
  };

  const handleMoodboardDragOver = (e) => {
    e.preventDefault();
    setMoodboardIsDragging(true);
  };

  const handleMoodboardDragLeave = (e) => {
    e.preventDefault();
    setMoodboardIsDragging(false);
  };

  const handleMoodboardDrop = (e) => {
    e.preventDefault();
    setMoodboardIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMoodboardFiles(e.dataTransfer.files);
    }
  };

  const handleMoodboardFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMoodboardFiles(e.target.files);
    }
  };

  const handleMoodboardFiles = (files) => {
    const newFiles = Array.from(files);
    const oversized = newFiles.some(file => file.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setErrors((prev) => ({ ...prev, moodboard: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.` }));
      return;
    }
    setMoodboardFiles([...moodboardFiles, ...newFiles]);
  };

  const openMoodboardFileSelector = () => {
    if (moodboardFileInputRef.current) {
      moodboardFileInputRef.current.click();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900">Visual Assets</h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload images for top performing ads as reference, and upload visual moodboard samples to guide the creative direction.
          </p>
          <div className="mt-6 space-y-10">
            {/* Top Performing Ads Upload */}
            <div>
              <h3 className="text-base font-medium text-gray-700">Top Performing Ads (Reference)</h3>
              <div 
                className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center ${
                  adsIsDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragOver={handleAdsDragOver}
                onDragLeave={handleAdsDragLeave}
                onDrop={handleAdsDrop}
                onClick={openAdsFileSelector}
              >
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <svg 
                      className="h-12 w-12 text-gray-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">
                      Drag and drop image files here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Upload reference images from your best-performing ads. Supported formats: JPG, PNG, up to 10MB per file.
                    </p>
                  </div>
                  <input
                    ref={adsFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAdsFileInput}
                    accept=".jpg,.jpeg,.png"
                  />
                </div>
                {errors.ads && (
                  <div className="mt-2 text-red-600 text-sm font-semibold">
                    {errors.ads}
                  </div>
                )}
              </div>
              {adsFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {adsFiles.map((file, index) => (
                      <div key={index} className="flex flex-col items-center">
                        {['image/jpeg', 'image/png'].includes(file.type) && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-24 h-24 object-cover rounded border mb-1"
                            onLoad={e => URL.revokeObjectURL(e.target.src)}
                          />
                        )}
                        <span className="text-xs text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Visual Moodboard Upload */}
            <div>
              <h3 className="text-base font-medium text-gray-700">Visual Moodboard</h3>
              <div 
                className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center ${
                  moodboardIsDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragOver={handleMoodboardDragOver}
                onDragLeave={handleMoodboardDragLeave}
                onDrop={handleMoodboardDrop}
                onClick={openMoodboardFileSelector}
              >
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <svg 
                      className="h-12 w-12 text-gray-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">
                      Drag and drop image files here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Upload sample visuals that represent the desired look, feel, and style for the new creative. Supported formats: JPG, PNG, up to 10MB per file.
                    </p>
                    {errors.moodboard && (
                      <div className="mt-2 text-red-600 text-sm font-semibold">
                        {errors.moodboard}
                      </div>
                    )}
                  </div>
                  <input
                    ref={moodboardFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleMoodboardFileInput}
                    accept=".jpg,.jpeg,.png"
                  />
                </div>
              </div>
              {moodboardFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {moodboardFiles.map((file, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-24 h-24 object-cover rounded border mb-1"
                          onLoad={e => URL.revokeObjectURL(e.target.src)}
                        />
                        <span className="text-xs text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back: Offer
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Next: Brand Reviews
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-2">AI Visual Strategy Summary</h3>
            <button
              type="button"
              onClick={handleAnalyzeVisualStrategy}
              className="mb-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50"
              disabled={aiLoading || (!adsFiles.length && !moodboardFiles.length)}
            >
              {aiLoading ? 'Analyzing...' : 'Generate Visual Strategy'}
            </button>
            {errors.ai && <div className="text-red-600 mb-2">{errors.ai}</div>}
            {visualStrategy && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-blue-800 mb-2">Visual Strategy Summary</h4>
                <pre className="whitespace-pre-wrap text-sm mb-4">{visualStrategy.visualStrategySummary}</pre>
                <h5 className="font-semibold text-gray-700 mt-4 mb-1">Top Ads Analyses:</h5>
                <ul className="mb-2">
                  {visualStrategy.topAdsAnalyses && visualStrategy.topAdsAnalyses.map((a, i) => (
                    <li key={i} className="mb-2">
                      <span className="font-medium text-gray-800">{a.filename}:</span> <span className="text-gray-700">{a.analysis}</span>
                    </li>
                  ))}
                </ul>
                <h5 className="font-semibold text-gray-700 mt-4 mb-1">Moodboard Analyses:</h5>
                <ul>
                  {visualStrategy.moodboardAnalyses && visualStrategy.moodboardAnalyses.map((a, i) => (
                    <li key={i} className="mb-2">
                      <span className="font-medium text-gray-800">{a.filename}:</span> <span className="text-gray-700">{a.analysis}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualAssets;