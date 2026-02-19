import { useUser } from '@clerk/clerk-react';
import { useMemo } from 'react';

export const useAdminAccess = () => {
  const { user, isLoaded } = useUser();

  const isAdmin = useMemo(() => {
    if (!isLoaded || !user) return false;

    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((email: string) => email.trim()) || [];
    const userEmail = user.primaryEmailAddress?.emailAddress;

    if (!userEmail) return false;

    // Check if user email is in admin list
    return adminEmails.includes(userEmail);
  }, [user, isLoaded]);

  return { isAdmin, isLoaded };
};

