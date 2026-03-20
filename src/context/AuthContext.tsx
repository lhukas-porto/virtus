import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getPushToken } from '../services/notifications';

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
        // Whitelist de usuários com acesso liberado (Premium vitalício)
        // Lucas, atualizei para os e-mails exatos que você pediu!
        const whitelistEmails = [
            'lhukas@gmail.com',
            'lubontempo@gmail.com',
            'redpro.ia@gmail.com',
            'victorlllima@gmail.com',
            'levino@uol.com.br'
        ];

        const userEmail = session?.user?.email?.toLowerCase();

        const isWhitelisted = userEmail && whitelistEmails.some(email => userEmail.includes(email));

        if (prof.is_premium || isWhitelisted) {
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

    const lastAppState = useRef(AppState.currentState);
    const lastActiveTime = useRef(Date.now());
    const sessionRef = useRef(session);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
                // Salvar o Push Token para o pilar de cuidadores
                if (Platform.OS !== 'web') {
                    getPushToken().then(token => {
                        const updateData: any = {};
                        if (token) updateData.push_token = token;
                        if (session.user.email) updateData.email = session.user.email.toLowerCase();
                        
                        if (Object.keys(updateData).length > 0) {
                            supabase.from('profiles').update(updateData).eq('id', session.user.id);
                        }
                    });
                }
            }
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

        // Inactivity Logout (15 minutes)
        const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (
                lastAppState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                const now = Date.now();
                const diffMinutes = (now - lastActiveTime.current) / (1000 * 60);

                // Se passou mais de 15 minutos, desloga
                if (diffMinutes >= 15 && sessionRef.current) {
                    supabase.auth.signOut();
                }
            }

            if (nextAppState.match(/inactive|background/)) {
                lastActiveTime.current = Date.now();
            }

            lastAppState.current = nextAppState;
        });

        return () => {
            subscription.unsubscribe();
            appStateSubscription.remove();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, profile, loading, trialEnded, isPremium }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
