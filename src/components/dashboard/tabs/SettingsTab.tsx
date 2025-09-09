import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Key, UserPlus, Copy, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const SettingsTab: React.FC = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isProvisioningUser, setIsProvisioningUser] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<PasswordForm>();

  const newPassword = watch('newPassword');

  const handlePasswordChange = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password mismatch",
        description: "New password and confirmation password do not match.",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // First verify current password by attempting a silent sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.currentPassword,
      });

      if (verifyError) {
        toast({
          variant: "destructive",
          title: "Invalid current password",
          description: "Please check your current password and try again.",
        });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        toast({
          variant: "destructive",
          title: "Error updating password",
          description: updateError.message,
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been successfully changed.",
        });
        reset();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProvisionUser = async () => {
    setIsProvisioningUser(true);
    setTemporaryPassword(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please sign in again to perform this action.",
        });
        return;
      }

      const response = await supabase.functions.invoke('provision_user', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (response.error) {
        throw response.error;
      }

      const { temporaryPassword: tempPass, created } = response.data;
      setTemporaryPassword(tempPass);

      toast({
        title: created ? "User created" : "Password reset",
        description: `Temporary password generated for robmerivale@gmail.com. ${created ? 'User account has been created.' : 'Password has been reset.'}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to provision user access.",
      });
    } finally {
      setIsProvisioningUser(false);
    }
  };

  const copyToClipboard = async () => {
    if (temporaryPassword) {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Temporary password has been copied.",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and user access</p>
      </div>

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your account password. Password must be at least 8 characters long.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handlePasswordChange)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                className="input-primary"
                {...register('currentPassword', { 
                  required: 'Current password is required' 
                })}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                className="input-primary"
                {...register('newPassword', { 
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters long'
                  }
                })}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="input-primary"
                {...register('confirmPassword', { 
                  required: 'Please confirm your new password',
                  validate: (value) => value === newPassword || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isChangingPassword}
              className="btn-primary"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Additional User Access Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <CardTitle>Additional User Access</CardTitle>
          </div>
          <CardDescription>
            Manage access for robmerivale@gmail.com. Generate or reset temporary password for the additional user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Button 
              onClick={handleProvisionUser}
              disabled={isProvisioningUser}
              className="btn-accent"
            >
              {isProvisioningUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Generate/Reset Password for robmerivale@gmail.com
                </>
              )}
            </Button>
          </div>

          {temporaryPassword && (
            <Card className="bg-surface border-accent/20">
              <CardHeader>
                <CardTitle className="text-lg text-accent">Temporary Password Generated</CardTitle>
                <CardDescription>
                  Share this password securely with robmerivale@gmail.com. This password will be shown only once.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                  <code className="flex-1 font-mono text-sm bg-transparent">{temporaryPassword}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  The user can sign in with email: <strong>robmerivale@gmail.com</strong> and the password above.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};