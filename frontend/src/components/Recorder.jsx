import { useState, useRef, useEffect } from 'react';
import { transcriptionAPI, showToast } from '../config/api';

const Recorder = ({ onTranscriptionComplete, patientMetadata = {} }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 44100 }
        } 
      });
      
      streamRef.current = stream;
      
      // Setup audio context for waveform visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Start waveform animation
      const updateWaveform = () => {
        if (!isRecording) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const waveform = Array.from(dataArray).slice(0, 20).map(value => value / 255);
        setWaveformData(waveform);
        animationRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        chunksRef.current = [];
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      showToast('Recording started', 'success');
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast('Failed to start recording. Please check microphone permissions.', 'error');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        intervalRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
        setIsPaused(false);
        showToast('Recording resumed', 'info');
      } else {
        mediaRecorderRef.current.pause();
        clearInterval(intervalRef.current);
        setIsPaused(true);
        showToast('Recording paused', 'info');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(intervalRef.current);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setWaveformData([]);
      showToast('Recording stopped', 'info');
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setDuration(0);
    showToast('Recording discarded', 'info');
  };

  const uploadAndTranscribe = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    try {
      // Convert blob to File object
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
      
      const response = await transcriptionAPI.uploadAudio(audioFile, patientMetadata);
      const { transcript, duration: audioDuration, confidence } = response.data;
      
      if (onTranscriptionComplete) {
        onTranscriptionComplete({
          transcript,
          duration: audioDuration,
          confidence,
          audioBlob,
          metadata: patientMetadata
        });
      }
      
      showToast('Transcription completed successfully!', 'success');
      
      // Reset state
      setAudioBlob(null);
      setDuration(0);
    } catch (error) {
      console.error('Transcription failed:', error);
      const message = error.response?.data?.detail || 'Transcription failed. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-6">Voice Recorder</h3>
        
        {/* Recording Status */}
        <div className="mb-6">
          {isRecording && (
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="recording-indicator"></div>
              <span className="text-red-400 font-medium">
                {isPaused ? 'PAUSED' : 'RECORDING'}
              </span>
            </div>
          )}
          
          <div className="text-2xl font-mono text-primary-400 font-bold">
            {formatTime(duration)}
          </div>
        </div>

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="waveform-container mb-6 p-4">
            <div className="flex items-end justify-center space-x-1 h-8">
              {waveformData.map((amplitude, index) => (
                <div
                  key={index}
                  className="bg-primary-500 rounded-t transition-all duration-75"
                  style={{
                    width: '3px',
                    height: `${Math.max(2, amplitude * 32)}px`,
                    opacity: 0.7 + amplitude * 0.3
                  }}
                />
              ))}
              {waveformData.length === 0 && (
                <div className="text-gray-400 text-sm">Initializing audio...</div>
              )}
            </div>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {!isRecording && !audioBlob && (
            <button
              onClick={startRecording}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg"
            >
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/>
                <path d="M19 10v1a7 7 0 01-14 0v-1a1 1 0 112 0v1a5 5 0 0010 0v-1a1 1 0 112 0z"/>
              </svg>
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={pauseRecording}
                className="w-12 h-12 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center transition-all duration-300"
              >
                {isPaused ? (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                )}
              </button>
              
              <button
                onClick={stopRecording}
                className="w-12 h-12 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center transition-all duration-300"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Audio Playback & Actions */}
        {audioBlob && !isRecording && (
          <div className="space-y-4">
            <audio 
              controls 
              src={URL.createObjectURL(audioBlob)}
              className="w-full"
            />
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={uploadAndTranscribe}
                disabled={isTranscribing}
                className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                {isTranscribing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Transcribing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7H7z"/>
                    </svg>
                    <span>Transcribe</span>
                  </>
                )}
              </button>
              
              <button
                onClick={discardRecording}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Discard
              </button>
              
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setDuration(0);
                }}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                New Recording
              </button>
            </div>
          </div>
        )}

        {/* Recording Tips */}
        {!isRecording && !audioBlob && (
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-2">Recording Tips</h4>
            <ul className="text-xs text-gray-400 space-y-1 text-left">
              <li>• Ensure quiet environment for best results</li>
              <li>• Speak clearly and at normal pace</li>
              <li>• Medical terminology is optimized</li>
              <li>• Maximum recording time: 10 minutes</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recorder;