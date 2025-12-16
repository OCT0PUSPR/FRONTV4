import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('[AUTH_PROVIDER] AuthProvider initializing...')
    
    const [uid, setUID] = useState<string>('');
    const [partnerId, setPartnerId] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    console.log('[AUTH_PROVIDER] API_BASE_URL:', API_BASE_URL);

    // Load session from localStorage
    useEffect(() => {
        console.log('[AUTH_PROVIDER] Loading session from localStorage...')
        try {
            const storedSessionId = localStorage.getItem('sessionId');
            const storedUid = localStorage.getItem('uid');
            const storedPartnerId = localStorage.getItem('partnerId');
            const storedName = localStorage.getItem('name');
            
            console.log('[AUTH_PROVIDER] Stored values:', {
                hasSessionId: !!storedSessionId,
                hasUid: !!storedUid,
                hasPartnerId: !!storedPartnerId,
                hasName: !!storedName
            })
            
            if (storedSessionId && storedUid) {
                console.log('[AUTH_PROVIDER] Session found, setting authentication state...')
                setSessionId(storedSessionId);
                setUID(storedUid);
                setPartnerId(storedPartnerId || '');
                setName(storedName || '');
                setIsAuthenticated(true);
                // Validate session with the backend
                validateSession(storedSessionId);
            } else {
                console.log('[AUTH_PROVIDER] No session found, setting loading to false')
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[AUTH_PROVIDER] Error loading session:', error)
            setIsLoading(false);
        }
    }, []);

    const getOdooHeaders = async () => {
        // Fetch app setup from database
        try {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data?.success && data?.data) {
                    const rawBase = data.data.odoo_base_url;
                    const db = data.data.odoo_db;
                    const headers: Record<string, string> = {};
                    if (rawBase) headers['x-odoo-base'] = rawBase;
                    if (db) headers['x-odoo-db'] = db;
                    return headers;
                }
            }
        } catch (error) {
            console.error('Error fetching app setup:', error);
        }
        
        // Fallback: return empty headers (backend will handle missing setup)
        return {};
    };

    const signIn = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            const odooHeaders = await getOdooHeaders();
            
            // Get tenant ID from localStorage if available
            const tenantId = localStorage.getItem('current_tenant_id');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...odooHeaders,
            };
            
            // Include tenant ID header if available
            if (tenantId) {
                headers['X-Tenant-ID'] = tenantId;
            }
            
            const response = await fetch(`${API_BASE_URL}/auth/signin`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ email, password }),
            });
            
            const data = await response.json();
            
            if (response.ok && data.isAuthenticated) {
                console.log('Login successful:', data);
                setUID(data.uid?.toString() || '');
                setPartnerId(data.partner_id?.toString() || '');
                setName(data.name || '');
                setSessionId(data.sessionId || '');
                setIsAuthenticated(true);
                setIsLoading(false);
                // Store session in localStorage
                localStorage.setItem('sessionId', data.sessionId || '');
                localStorage.setItem('uid', data.uid?.toString() || '');
                localStorage.setItem('partnerId', data.partner_id?.toString() || '');
                localStorage.setItem('name', data.name || '');
                
                return { success: true };
            } else {
                setIsAuthenticated(false);
                setIsLoading(false);
                
                // Check if setup is required
                if (data.setupRequired || data.redirectTo === '/setup') {
                    return { 
                        success: false, 
                        error: data.message || 'App setup not configured.',
                        redirectTo: '/setup',
                        setupRequired: true
                    };
                }
                
                // Parse error message to provide user-friendly credentials error
                let errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                
                if (data.message) {
                    const msg = data.message.toLowerCase();
                    // If it's a credentials/auth error, use our friendly message
                    if (msg.includes('authentication') || msg.includes('invalid') || msg.includes('credentials') || 
                        msg.includes('login') || msg.includes('password') || msg.includes('user not found') ||
                        msg.includes('wrong password') || msg.includes('incorrect')) {
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    } else if (msg.includes('odoo server error') || msg.includes('server error')) {
                        // For server errors, still show credentials error to avoid exposing server issues
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    } else if (msg.includes('setup') || msg.includes('configure')) {
                        // Keep setup-related messages as-is
                        errorMessage = data.message;
                    } else {
                        // For other errors, default to credentials error
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    }
                }
                
                return { success: false, error: errorMessage };
            }
        } catch (error: any) {
            console.error('Authentication error:', error);
            setIsAuthenticated(false);
            setIsLoading(false);
            return { success: false, error: error.message || 'Network error. Please try again.' };
        }
    };

    const validateSession = async (sessionIdToValidate: string) => {
        try {
            const odooHeaders = await getOdooHeaders();
            
            // Get tenant ID from localStorage if available
            const tenantId = localStorage.getItem('current_tenant_id');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...odooHeaders,
            };
            
            // Include tenant ID header if available
            if (tenantId) {
                headers['X-Tenant-ID'] = tenantId;
            }
            
            const response = await fetch(`${API_BASE_URL}/auth/session`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ sessionId: sessionIdToValidate }),
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.isValid) {
                // If session is invalid -> sign out
                signOut();
            } else {
                // Session is valid, keep the authenticated state
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Session validation error:', error);
            // On error, keep the user logged in (optimistic approach)
            // The session might still be valid, just a network issue
            setIsLoading(false);
        }
    };

    const signOut = () => {
        setUID('');
        setPartnerId('');
        setName('');
        setSessionId('');
        setIsAuthenticated(false);
        localStorage.removeItem('sessionId');
        localStorage.removeItem('uid');
        localStorage.removeItem('partnerId');
        localStorage.removeItem('name');
    };

    return (
        <AuthContext.Provider value={{ uid, partnerId, name, sessionId, isAuthenticated, isLoading, signIn, signOut, validateSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};