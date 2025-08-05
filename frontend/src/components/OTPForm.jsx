import { useState, useRef, useEffect } from 'react';
import { authAPI, showToast } from '../config/api';

const OTPForm = ({ email, onSuccess, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Countdown timer for resend button
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && value) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(otp.join(''));
    }
  };

  const handleSubmit = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      showToast('Please enter all 6 digits', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyOTP(email, otpCode);
      const { access_token, user_email, role } = response.data;
      
      // Store authentication data
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('user_data', JSON.stringify({
        email: user_email,
        role: role
      }));

      showToast('Login successful!', 'success');
      onSuccess({ email: user_email, role, token: access_token });
    } catch (error) {
      console.error('OTP verification failed:', error);
      const message = error.response?.data?.detail || 'Invalid or expired OTP';
      showToast(message, 'error');
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      await authAPI.sendOTP(email);
      showToast('New OTP sent to your email', 'success');
      setCountdown(60); // 60 second cooldown
      
      // Clear current OTP
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      showToast('Failed to resend OTP. Please try again.', 'error');
    } finally {
      setResending(false);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      handleSubmit(pastedData);
    }
  };

  return (
    <div className="glass-card p-8 rounded-2xl max-w-md w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 medical-gradient rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Enter Verification Code</h2>
        <p className="text-gray-400 text-sm">
          We've sent a 6-digit code to<br />
          <span className="text-primary-400 font-medium">{email}</span>
        </p>
      </div>

      {/* OTP Inputs */}
      <div className="flex justify-center space-x-3 mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-12 h-12 text-center text-xl font-bold input-glass rounded-xl focus:ring-2 focus:ring-primary-500 transition-all duration-200"
            disabled={loading}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <button
          onClick={() => handleSubmit()}
          disabled={loading || otp.some(digit => !digit)}
          className="w-full btn-primary py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify Code</span>
          )}
        </button>

        {/* Resend OTP */}
        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-gray-400 text-sm">
              Resend code in <span className="text-primary-400 font-medium">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResendOTP}
              disabled={resending}
              className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {resending ? 'Sending...' : "Didn't receive the code? Resend"}
            </button>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="w-full btn-secondary py-3 rounded-xl font-medium flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Email</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Code expires in 5 minutes for security
        </p>
      </div>
    </div>
  );
};

export default OTPForm;