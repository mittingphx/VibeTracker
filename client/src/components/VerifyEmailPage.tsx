import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Parse token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setStatus('error');
          setErrorMessage('No verification token found in URL');
          return;
        }

        // Call API to verify token
        const response = await apiRequest('GET', `/api/verify-email?token=${token}`, null);
        if (response.ok) {
          // Invalidate user query to refresh the user data
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          setStatus('success');
        } else {
          const errorData = await response.json();
          setStatus('error');
          setErrorMessage(errorData.message || 'Failed to verify email address');
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
      }
    };

    verifyToken();
  }, []);

  const goHome = () => {
    setLocation('/');
    
    if (status === 'success') {
      toast({
        title: 'Email Verified',
        description: 'Your email has been successfully verified.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-4 animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              <h1 className="text-xl font-bold mb-2 dark:text-white">Verifying Your Email</h1>
              <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h1 className="text-xl font-bold mb-2 dark:text-white">Email Verified!</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your email address has been successfully verified. You can now access all features of VibeTracker.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h1 className="text-xl font-bold mb-2 dark:text-white">Verification Failed</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {errorMessage || 'We could not verify your email address. The link may have expired or is invalid.'}
              </p>
            </>
          )}

          <Button onClick={goHome} className="mt-4">
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}