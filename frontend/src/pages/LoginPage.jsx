import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, showToast, isAuthenticated } from '../config/api';
import OTPForm from '../components/OTPForm';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const navigate = useNavigate();

  const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'hhamedicine.com';

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      return `Only ${ALLOWED_DOMAIN} email addresses are allowed`;
    }
    return null;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      showToast(emailError, 'error');
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendOTP(email.toLowerCase().trim());
      showToast('Verification code sent to your email', 'success');
      setShowOTP(true);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      const message = error.response?.data?.detail || 'Failed to send verification code';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (userData) => {
    // Navigation will be handled by the authentication change
    navigate('/dashboard');
  };

  const handleBackToEmail = () => {
    setShowOTP(false);
    setEmail('');
  };

  if (showOTP) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <OTPForm 
          email={email} 
          onSuccess={handleOTPSuccess}
          onBack={handleBackToEmail}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="glass-card p-8 rounded-2xl max-w-md w-full animate-fade-in relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 medical-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 text-shadow">
            AGENT-ELEKTRON
          </h1>
          <p className="text-gray-400 text-sm mb-2">Medical SOAP AI System</p>
          <p className="text-xs text-primary-400 font-medium">
            Restricted to {ALLOWED_DOMAIN} physicians
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`doctor@${ALLOWED_DOMAIN}`}
                className="w-full input-glass pl-4 pr-12 py-3 rounded-xl"
                disabled={loading}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full btn-primary py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Send Verification Code</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Secure Access</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                This system is restricted to authorized medical professionals only. 
                All access attempts are logged and monitored for security compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © 2024 AGENT-ELEKTRON • HHAMedicine Medical AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;