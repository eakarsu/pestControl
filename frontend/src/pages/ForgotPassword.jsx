import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authService.forgotPassword({ email });
      toast.success('Reset token generated');
      // For demo: auto-fill the token
      if (response.data.resetToken) {
        setToken(response.data.resetToken);
      }
      setStep('reset');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      toast.success('Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 'request' ? 'Forgot Password' : 'Reset Password'}
            </h1>
            <p className="text-gray-500 mt-2">
              {step === 'request'
                ? 'Enter your email to receive a reset token'
                : 'Enter the reset token and your new password'}
            </p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full btn btn-primary py-3">
                {loading ? 'Sending...' : 'Send Reset Token'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="label">Reset Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input font-mono text-sm"
                  placeholder="Paste your reset token"
                  required
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm your password"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full btn btn-primary py-3">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
