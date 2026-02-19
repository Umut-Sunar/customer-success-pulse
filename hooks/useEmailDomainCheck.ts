import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

const ALLOWED_EMAIL_DOMAINS = ['@alo-tech.com', '@callcenterstudio.com'];

export const useEmailDomainCheck = () => {
  const { user, isLoaded, signOut } = useUser();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress || '';
      if (email) {
        const emailDomain = email.substring(email.indexOf('@'));
        const allowed = ALLOWED_EMAIL_DOMAINS.includes(emailDomain);
        setIsAllowed(allowed);
        
        if (!allowed) {
          // User doesn't have allowed email domain, sign them out
          signOut();
        }
      } else {
        setIsAllowed(false);
      }
    } else if (isLoaded && !user) {
      setIsAllowed(false);
    }
  }, [user, isLoaded, signOut]);

  const isEmailAllowed = () => {
    if (!user?.primaryEmailAddress?.emailAddress) return false;
    const email = user.primaryEmailAddress.emailAddress;
    const emailDomain = email.substring(email.indexOf('@'));
    return ALLOWED_EMAIL_DOMAINS.includes(emailDomain);
  };

  return { isEmailAllowed, isAllowed, user, isLoaded };
};

