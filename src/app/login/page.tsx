
// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation'; // Removed useSearchParams
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Music } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // Auth state change will handle initial data loading via AuthProvider logic.
      // Always redirect to the root path after successful login from the login page.
      router.push('/');
      // Force a reload after successful login and navigation
      // This ensures all context and states are correctly initialized based on the new auth state.
      window.location.reload();
    } catch (err: any) {
      console.error('Login failed:', err);
      // More specific error messages for Firebase v9+
      let errorMessage = 'An unexpected error occurred.';
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found': // Still handle just in case, though invalid-credential is more common
        case 'auth/wrong-password': // Still handle just in case
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format.';
          break;
        case 'auth/too-many-requests':
             errorMessage = 'Access temporarily disabled due to too many failed login attempts. Please try again later.';
             break;
        case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
        default:
          errorMessage = 'Login failed. Please try again.';
          break;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Ensure this container doesn't conflict with RootLayout styles if login is standalone
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="flex justify-center items-center mb-4">
               <Music className="w-8 h-8 text-accent" />
           </div>
          <CardTitle className="text-2xl font-bold">Welcome to VibeVerse</CardTitle>
          <CardDescription>Sign in to access your music universe</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                 <Alert variant="destructive">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Login Failed</AlertTitle>
                   <AlertDescription>{error}</AlertDescription>
                 </Alert>
               )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground justify-center">
             <p>Login access only. No registration available.</p>
         </CardFooter>
      </Card>
    </div>
  );
}
