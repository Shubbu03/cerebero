"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  default: "An error occurred during authentication.",
  configuration: "There is a problem with the server configuration.",
  accessdenied: "You do not have permission to sign in.",
  verification: "The verification link may have expired or was already used.",
  credentialssignin: "The email or password you entered is incorrect.",
  oauthsignin: "There was a problem with the OAuth provider.",
  oauthcallback: "There was a problem with the OAuth callback.",
  oauthcreateaccount:
    "There was a problem creating an account with the OAuth provider.",
  emailcreateaccount: "There was a problem creating your account.",
  callback: "There was a problem with the authentication callback.",
  sessionrequired: "You must be signed in to access this page.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("default");
  const [errorDescription, setErrorDescription] = useState<string | null>(null);

  useEffect(() => {
    const errorType = searchParams.get("error") || "default";
    setError(errorType);

    const description = searchParams.get("error_description");
    if (description) {
      setErrorDescription(description);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {errorMessages[error] || errorMessages.default}
                  </h3>
                  {errorDescription && (
                    <div className="mt-2 text-sm text-red-700">
                      <p>{errorDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Return to sign in
              </Link>
              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Return to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthErrorContent />
    </Suspense>
  );
}
