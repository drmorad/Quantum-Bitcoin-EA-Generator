import { useState, useEffect } from 'react';

// FIX: Declare gapi as a global variable to avoid TypeScript errors.
declare var gapi: any;

// Environment variables must be set for this to work.
// In a real app, these would be in a .env file.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.API_KEY; 

// The scope for Google Drive API. 'drive.file' limits access to
// only files created by this application for better security.
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const useGoogleAuth = () => {
    const [authInstance, setAuthInstance] = useState<gapi.auth2.GoogleAuth | null>(null);
    const [user, setUser] = useState<gapi.auth2.GoogleUser | null>(null);
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [gapiError, setGapiError] = useState<string | null>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            gapi.load('client:auth2', initClient);
        };
        document.body.appendChild(script);

        const initClient = () => {
             if (!CLIENT_ID || !API_KEY) {
                console.error("Google Client ID or API Key is not configured.");
                setGapiError("Google integration is not configured. Please check environment variables.");
                setIsGapiLoaded(true); // Mark as loaded, but with an error.
                return;
            }
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                scope: SCOPES,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            }).then(() => {
                const auth = gapi.auth2.getAuthInstance();
                setAuthInstance(auth);
                setIsGapiLoaded(true);

                // Listen for sign-in state changes.
                auth.isSignedIn.listen(updateUser);
                
                // Set the initial user object.
                updateUser(auth.isSignedIn.get());
            }).catch((error: any) => {
                console.error("Error initializing Google API client:", error);
                setGapiError("Could not initialize Google Sign-In. Check console for details.");
            });
        };

        const updateUser = (isSignedIn: boolean) => {
            if (isSignedIn) {
                setUser(authInstance?.currentUser.get() ?? null);
            } else {
                setUser(null);
            }
        };

        // Re-check user on authInstance change
        if (authInstance) {
            updateUser(authInstance.isSignedIn.get());
        }

    }, [authInstance]);

    const signIn = () => {
        if (authInstance) {
            authInstance.signIn();
        }
    };

    const signOut = () => {
        if (authInstance) {
            authInstance.signOut();
        }
    };

    return { user, signIn, signOut, isGapiLoaded, gapiError };
};