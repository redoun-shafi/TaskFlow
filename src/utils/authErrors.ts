export interface FriendlyAuthError {
  title: string;
  message: string;
  isOperationNotAllowed: boolean;
  code?: string;
}

export function getFriendlyAuthErrorMessage(err: any): FriendlyAuthError {
  const code = err?.code || '';
  const rawMsg = err?.message || '';

  if (
    code === 'auth/operation-not-allowed' ||
    rawMsg.includes('operation-not-allowed') ||
    rawMsg.includes('OPERATION_NOT_ALLOWED')
  ) {
    return {
      title: 'Sign-in Assistance',
      message:
        'Standard email/password sign-in is momentarily unavailable. You can use Google Sign-In or continue with one-click Instant Access below.',
      isOperationNotAllowed: true,
      code,
    };
  }

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      title: 'Sign-in Window Closed',
      message: 'The sign-in window was closed before completing. Please try again when ready.',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      title: 'Email Already In Use',
      message: 'An account with this email address already exists. Please sign in instead.',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/invalid-email') {
    return {
      title: 'Invalid Email Address',
      message: 'Please enter a valid email format (e.g. name@example.com).',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/weak-password') {
    return {
      title: 'Password Too Short',
      message: 'Your password should be at least 6 characters long.',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/user-not-found') {
    return {
      title: 'Account Not Found',
      message: 'We could not find an account with this email. Please check for typos or create an account.',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return {
      title: 'Incorrect Credentials',
      message: 'The email or password you entered does not match our records. Please try again.',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/too-many-requests') {
    return {
      title: 'Too Many Attempts',
      message: 'Too many attempts were detected. Please wait a few moments and try again.',
      isOperationNotAllowed: false,
      code,
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      title: 'Connection Issue',
      message: 'Please check your internet connection and try again.',
      isOperationNotAllowed: false,
      code,
    };
  }

  // Generic cleanup of internal error strings
  const cleaned = rawMsg
    .replace(/^Firebase:\s*Error\s*\((auth\/[^)]+)\)\.?/i, '')
    .replace(/^FirebaseError:\s*/i, '')
    .trim();

  return {
    title: 'Sign-in Notice',
    message: cleaned || 'Unable to complete sign-in right now. Please try again.',
    isOperationNotAllowed: false,
    code,
  };
}
