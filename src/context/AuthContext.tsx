import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface Profile {
    id: string;
    name: string | null;
    trial_started_at: string;
    is_premium: boolean;
}

interface AuthContextType {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    trialEnded: boolean;
    isPremium: boolean;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    trialEnded: false,
    isPremium: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [trialEnded, setTrialEnded] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    const checkTrial = (prof: Profile) => {
        if (prof.is_premium) {
            setTrialEnded(false);
            setIsPremium(true);
            return;
        }

        const start = new Date(prof.trial_started_at);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        setTrialEnded(diffDays > 7);
        setIsPremium(false);
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setProfile(data);
                checkTrial(data);
            }
        } catch (e) {
            console.error('Erro ao buscar perfil:', e);
        }
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) fetchProfile(session.user.id);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) fetchProfile(session.user.id);
            else {
                setProfile(null);
                setTrialEnded(false);
                setIsPremium(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, profile, loading, trialEnded, isPremium }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
