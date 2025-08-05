import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, soapAPI, showToast } from '../config/api';
import Navbar from '../components/Navbar';
import Recorder from '../components/Recorder';
import SOAPNoteCard from '../components/SOAPNoteCard';

const Dashboard = () => {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentSOAP, setCurrentSOAP] = useState(null);
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [patientMetadata, setPatientMetadata] = useState({
    age: '',
    gender: '',
    chief_complaint: ''
  });
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [recentNotes, setRecentNotes] = useState([]);
  const [statistics, setStatistics] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    // Load recent statistics
    loadStatistics();
  }, [navigate]);

  const loadStatistics = async () => {
    try {
      const response = await soapAPI.getStatistics();
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleTranscriptionComplete = async (transcriptionData) => {
    const { transcript, confidence, metadata } = transcriptionData;
    
    setCurrentTranscript(transcript);
    setProcessingStatus('Transcription completed. Generating SOAP note...');
    
    // Auto-generate SOAP note with available metadata
    await generateSOAPNote(transcript, { ...patientMetadata, ...metadata });
  };

  const generateSOAPNote = async (transcript, metadata = {}) => {
    if (!transcript.trim()) {
      showToast('No transcript available for SOAP generation', 'error');
      return;
    }

    setIsGeneratingSOAP(true);
    setProcessingStatus('Generating SOAP note with AI...');

    try {
      const soapRequest = {
        transcript: transcript,
        patient_age: metadata.age ? parseInt(metadata.age) : null,
        patient_gender: metadata.gender || null,
        chief_complaint: metadata.chief_complaint || null,
        doctor_notes: metadata.doctor_notes || null
      };

      const response = await soapAPI.generateSOAP(soapRequest);
      const { soap_note, confidence_score, processing_time } = response.data;
      
      setCurrentSOAP({
        ...soap_note,
        confidence_score,
        processing_time
      });
      
      setProcessingStatus('SOAP note generated successfully!');
      showToast(`SOAP note generated in ${processing_time.toFixed(1)}s`, 'success');
      
      // Add to recent notes
      setRecentNotes(prev => [soap_note, ...prev.slice(0, 4)]);
      
      // Reload statistics
      loadStatistics();
      
    } catch (error) {
      console.error('SOAP generation failed:', error);
      const message = error.response?.data?.detail || 'Failed to generate SOAP note';
      showToast(message, 'error');
      setProcessingStatus('SOAP generation failed. Please try again.');
    } finally {
      setIsGeneratingSOAP(false);
    }
  };

  const handleSOAPRefine = (refinedSOAP) => {
    setCurrentSOAP(refinedSOAP);
    showToast('SOAP note refined successfully', 'success');
  };

  const handleSOAPExport = (exportData) => {
    showToast('SOAP note exported successfully', 'success');
    // Could update recent exports here
  };

  const clearCurrentSession = () => {
    setCurrentTranscript('');
    setCurrentSOAP(null);
    setProcessingStatus('');
    setPatientMetadata({ age: '', gender: '', chief_complaint: '' });
    showToast('Session cleared', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Medical Dashboard</h1>
              <p className="text-gray-400">Record patient conversations and generate SOAP notes with AI</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMetadataForm(!showMetadataForm)}
                className="btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span>Patient Info</span>
              </button>
              
              {(currentTranscript || currentSOAP) && (
                <button
                  onClick={clearCurrentSession}
                  className="btn-secondary px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>New Session</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Patient Metadata Form */}
        {showMetadataForm && (
          <div className="glass-card p-6 rounded-xl mb-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-4">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Age</label>
                <input
                  type="number"
                  value={patientMetadata.age}
                  onChange={(e) => setPatientMetadata(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="Patient age"
                  className="w-full input-glass"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                <select
                  value={patientMetadata.gender}
                  onChange={(e) => setPatientMetadata(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full input-glass"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Chief Complaint</label>
                <input
                  type="text"
                  value={patientMetadata.chief_complaint}
                  onChange={(e) => setPatientMetadata(prev => ({ ...prev, chief_complaint: e.target.value }))}
                  placeholder="Primary concern"
                  className="w-full input-glass"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowMetadataForm(false)}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                Save Patient Info
              </button>
            </div>
          </div>
        )}

        {/* Status Banner */}
        {processingStatus && (
          <div className="glass-card p-4 rounded-xl mb-6 animate-fade-in">
            <div className="flex items-center space-x-3">
              {isGeneratingSOAP ? (
                <svg className="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              <span className="text-white font-medium">{processingStatus}</span>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Recording & Transcript */}
          <div className="space-y-6">
            {/* Voice Recorder */}
            <Recorder
              onTranscriptionComplete={handleTranscriptionComplete}
              patientMetadata={patientMetadata}
            />

            {/* Transcript Display */}
            {currentTranscript && (
              <div className="glass-card p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Transcript</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(currentTranscript)}
                      className="text-primary-400 hover:text-primary-300 text-sm flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </button>
                    
                    {!currentSOAP && (
                      <button
                        onClick={() => generateSOAPNote(currentTranscript, patientMetadata)}
                        disabled={isGeneratingSOAP}
                        className="btn-primary px-3 py-1 rounded text-sm disabled:opacity-50"
                      >
                        Generate SOAP
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 max-h-64 overflow-y-auto">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {currentTranscript}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Statistics */}
            {statistics && (
              <div className="glass-card p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Your Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-400">{statistics.total_soap_notes}</div>
                    <div className="text-sm text-gray-400">SOAP Notes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-400">{statistics.total_transcriptions}</div>
                    <div className="text-sm text-gray-400">Transcriptions</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - SOAP Note */}
          <div>
            <SOAPNoteCard
              soapNote={currentSOAP}
              transcript={currentTranscript}
              onRefine={handleSOAPRefine}
              onExport={handleSOAPExport}
            />
          </div>
        </div>

        {/* Recent Notes Section */}
        {recentNotes.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Recent SOAP Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentNotes.map((note, index) => (
                <div key={index} className="glass-card p-4 rounded-xl hover:shadow-glass-hover transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-primary-400">
                      {new Date(note.generated_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setCurrentSOAP(note)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      View
                    </button>
                  </div>
                  <p className="text-white text-sm font-medium mb-1">
                    {note.patient_id || 'Unknown Patient'}
                  </p>
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {note.subjective?.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;