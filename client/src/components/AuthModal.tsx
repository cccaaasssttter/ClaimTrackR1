import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authManager } from '@/lib/auth';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
}

export function AuthModal({ isOpen, onAuthenticated }: AuthModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      const remaining = Math.floor(authManager.getTimeRemaining() / 1000);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    try {
      const success = await authManager.authenticate(password);
      if (success) {
        setPassword('');
        onAuthenticated();
        toast({
          title: "Welcome",
          description: "Successfully authenticated",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Authentication error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>
          <VisuallyHidden>Admin Authentication</VisuallyHidden>
        </DialogTitle>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-2xl text-primary"></i>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Admin Access Required</h2>
          <p className="text-gray-600 mt-2">Enter your admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="pr-10"
                disabled={loading}
                autoFocus
              />
              <i className="fas fa-lock absolute right-3 top-3 text-gray-400"></i>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
            {loading ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Authenticating...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>
                Access Dashboard
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">
            <i className="fas fa-clock mr-1"></i>
            Auto-lock after 5 minutes of inactivity
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
