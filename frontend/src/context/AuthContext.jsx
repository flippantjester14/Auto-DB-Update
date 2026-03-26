import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useToast } from '../components/shared/Toast';
import { ROLES } from '../constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const addToast = useToast();

    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (firebaseUser) {
                // Enforce domain restriction
                if (!firebaseUser.email.endsWith('@redwinglabs.in')) {
                    await signOut(auth);
                    setUser(null);
                    setLoading(false);
                    return;
                }

                try {
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    
                    // First, ensure the document exists. If not, create it.
                    const initialDoc = await getDoc(userRef);
                    if (!initialDoc.exists()) {
                        await setDoc(userRef, {
                            role: ROLES.OPERATOR,
                            display_name: firebaseUser.displayName,
                            email: firebaseUser.email,
                            created_at: serverTimestamp(),
                            last_login: serverTimestamp()
                        });
                    } else {
                        // Update last_login
                        await updateDoc(userRef, {
                            last_login: serverTimestamp()
                        });
                    }

                    // Now set up real-time listener for role updates
                    unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                        let currentRole = ROLES.OPERATOR;
                        if (docSnap.exists() && docSnap.data().role) {
                            currentRole = docSnap.data().role;
                        }

                        setUser(prev => {
                            // Only update if we already had a user (to avoid weird race conditions)
                            // or if it's our first pass
                            if (prev && prev.uid === firebaseUser.uid) {
                                return { ...prev, role: currentRole };
                            }
                            return {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                displayName: firebaseUser.displayName,
                                photoURL: firebaseUser.photoURL,
                                role: currentRole
                            };
                        });
                    }, (err) => {
                        console.error('Failed to listen to user profile immediately:', err.code, err.message);
                        addToast(`Firestore listener error: ${err.message}`);
                        setUser(prev => prev ? { ...prev, role: ROLES.OPERATOR } : null);
                    });

                } catch (err) {
                    console.error('Failed to handle user profile init:', err);
                    addToast(`Profile initialization error: ${err.message}`);
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        role: ROLES.OPERATOR
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            if (!result.user.email.endsWith('@redwinglabs.in')) {
                await signOut(auth);
                addToast('Access denied: Must use a @redwinglabs.in account');
                throw new Error('Invalid domain');
            }
        } catch (err) {
            console.error('Login failed:', err);
            throw err;
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const value = { user, loading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
