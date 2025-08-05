import { useState } from 'react';
import { soapAPI, fileAPI, showToast } from '../config/api';

const SOAPNoteCard = ({ soapNote, transcript, onRefine, onExport }) => {
  const [activeTab, setActiveTab] = useState('subjective');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementNotes, setRefinementNotes] = useState('');
  const [showRefinement, setShowRefinement] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const tabs = [
    { id: 'subjective', label: 'Subjective', icon: '🗣️' },
    { id: 'objective', label: 'Objective', icon: '🔍' },
    { id: 'assessment', label: 'Assessment', icon: '🩺' },
    { id: 'plan', label: 'Plan', icon: '📋' }
  ];

  const handleRefine = async () => {
    if (!refinementNotes.trim()) {
      showToast('Please enter refinement notes', 'error');
      return;
    }

    setIsRefining(true);
    try {
      const response = await soapAPI.refineSOAP(soapNote, refinementNotes);
      onRefine(response.data.refined_soap_note);
      setRefinementNotes('');
      setShowRefinement(false);
      showToast('SOAP note refined successfully', 'success');
    } catch (error) {
      console.error('Refinement failed:', error);
      showToast('Failed to refine SOAP note', 'error');
    } finally {
      setIsRefining(false);
    }
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const exportData = {
        ...soapNote,
        transcript: transcript,
        exported_at: new Date().toISOString()
      };

      const response = await fileAPI.uploadToBlob(`soap_note.${format}`, exportData);
      
      if (onExport) {
        onExport(response.data);
      }
      
      showToast(`SOAP note exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export SOAP note', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied to clipboard', 'success');
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const getSectionContent = (section) => {
    return soapNote?.[section] || 'No content generated yet...';
  };

  if (!soapNote) {
    return (
      <div className="glass-card p-8 rounded-xl h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">SOAP Note Generator</h3>
          <p className="text-gray-400 text-sm">
            Record patient conversation to generate SOAP note
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">SOAP Note</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-primary-400 bg-primary-400/10 px-2 py-1 rounded-full">
              Generated {new Date(soapNote.generated_at).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="soap-section">
          <div className="flex items-center justify-between mb-3">
            <h4 className="soap-label">
              {tabs.find(t => t.id === activeTab)?.label}
            </h4>
            <button
              onClick={() => copyToClipboard(getSectionContent(activeTab))}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center space-x-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <div className="soap-content bg-white/5 p-4 rounded-lg border border-white/10 min-h-[200px]">
            <p className="whitespace-pre-wrap leading-relaxed">
              {getSectionContent(activeTab)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-white/10 space-y-4">
        {/* Refinement Section */}
        {showRefinement && (
          <div className="space-y-3">
            <textarea
              value={refinementNotes}
              onChange={(e) => setRefinementNotes(e.target.value)}
              placeholder="Enter specific refinement instructions (e.g., 'Add more detail to the assessment section')"
              className="w-full input-glass h-20 resize-none"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleRefine}
                disabled={isRefining}
                className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                {isRefining ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Refining...</span>
                  </>
                ) : (
                  <span>Apply Refinement</span>
                )}
              </button>
              <button
                onClick={() => setShowRefinement(false)}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRefinement(!showRefinement)}
            className="btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Refine</span>
          </button>

          <button
            onClick={() => copyToClipboard(JSON.stringify(soapNote, null, 2))}
            className="btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy All</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export</span>
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
            
            {/* Export Options */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-32 bg-dark-800 border border-white/20 rounded-lg shadow-xl z-10">
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-t-lg"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                Text
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-b-lg"
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        {soapNote.confidence_score && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-400">Confidence:</span>
            <div className="flex-1 bg-white/10 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${soapNote.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-primary-400 font-medium">
              {Math.round(soapNote.confidence_score * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOAPNoteCard;