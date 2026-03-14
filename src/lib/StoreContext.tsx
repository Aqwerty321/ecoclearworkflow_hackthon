"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User, UserRole, Application, ApplicationStatus, Document, Sector, EDSComment, MeetingGist, Template, MinutesOfMeeting, Payment } from './types';
import { isValidTransition } from './types';
import { auth, db, firebaseConfigured } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, where, setDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';

// ---- Firestore collection names ----
const USERS = 'users';
const APPLICATIONS = 'applications';
const DOCUMENTS = 'documents';
const SECTORS = 'sectors';
const COMMENTS = 'edsComments';
const GISTS = 'meetingGists';
const TEMPLATES = 'templates';
const PAYMENTS = 'payments';
const MINUTES = 'minutesOfMeeting';

// ---- Initial seed data (used only when Firestore is empty or unavailable) ----
// Kept in sync with scripts/seed-firestore.mjs SEED_SECTORS
const INITIAL_SECTORS: Sector[] = [
  { id: 'mining',     name: 'Mining & Quarrying',    description: 'Coal, iron ore, limestone, and other mineral extraction activities.' },
  { id: 'thermal',    name: 'Thermal Power Plants',  description: 'Coal/gas-based electricity generation facilities (≥25 MW).' },
  { id: 'coal-wash',  name: 'Coal Washeries',        description: 'Coal beneficiation and washing plants.' },
  { id: 'iron-steel', name: 'Iron & Steel',          description: 'Integrated steel plants, sponge iron, ferro-alloy units.' },
  { id: 'cement',     name: 'Cement',                description: 'Clinker grinding, rotary kiln, and cement manufacturing.' },
  { id: 'chemical',   name: 'Chemical Industries',   description: 'Bulk chemicals, pesticides, dyes, and intermediates.' },
  { id: 'petroleum',  name: 'Petroleum Products',    description: 'Refineries, storage depots, and petrochemical complexes.' },
  { id: 'distillery', name: 'Distilleries',          description: 'Molasses, grain, and other alcohol distillation units.' },
  { id: 'sugar',      name: 'Sugar',                 description: 'Cane crushing and sugar manufacturing plants.' },
  { id: 'paper',      name: 'Paper & Pulp',          description: 'Wood/agro-based paper and pulp manufacturing.' },
  { id: 'textile',    name: 'Textile & Dyeing',      description: 'Spinning, weaving, processing, and effluent-generating units.' },
  { id: 'infra',      name: 'Infrastructure',        description: 'Highways, bridges, industrial parks, and area development.' },
  { id: 'river',      name: 'River Valley Projects', description: 'Dams, barrages, hydro-power, and irrigation projects.' },
  { id: 'food',       name: 'Food Processing',       description: 'Slaughterhouses, fish processing, and food manufacturing.' },
];

// Kept in sync with scripts/seed-firestore.mjs SEED_USERS (offline/demo fallback only)
const INITIAL_USERS: User[] = [
  { id: '8aW77bzQ7Rg2fot3LA3ZxQQSXlp2', name: 'Admin CECB',    email: 'admin@ecoclear.gov', role: 'Admin',             assignedState: 'Chhattisgarh', createdAt: new Date().toISOString() },
  { id: 'lGq7LGzDRUfFWd4gMfSOMXmEBMa2', name: 'John Builder', email: 'john@builder.com',   role: 'Project Proponent', assignedState: 'Chhattisgarh', createdAt: new Date().toISOString() },
  { id: 'KKAVuZWN7Dha3luXBDH1jGgmnDH3', name: 'Sarah EDS',     email: 'sarah@ecoclear.gov', role: 'Scrutiny Team',     assignedState: 'Chhattisgarh', assignedDistrict: 'Raipur',   assignedSectors: ['Mining & Quarrying', 'Thermal Power Plants', 'Iron & Steel', 'Coal Washeries'], createdAt: new Date().toISOString() },
  { id: 'CbgMHuKw1QPhaDcRYdpCAmy3km63', name: 'Mike MoM',      email: 'mike@ecoclear.gov',  role: 'MoM Team',          assignedState: 'Chhattisgarh', assignedDistrict: 'Bilaspur', assignedSectors: ['Chemical Industries', 'Cement', 'Distilleries', 'Thermal Power Plants'], createdAt: new Date().toISOString() },
];

const STORAGE_KEY = 'ecoclear_storage';

// ---- Store shape ----
interface StoreData {
  users: User[];
  applications: Application[];
  documents: Document[];
  sectors: Sector[];
  comments: EDSComment[];
  gists: MeetingGist[];
  templates: Template[];
  payments: Payment[];
  minutes: MinutesOfMeeting[];
  currentUser: User | null;
}

interface StoreActions {
  hydrated: boolean;
  firebaseConnected: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ user: User | null; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  addApplication: (app: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'paymentStatus'>) => Promise<Application>;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void;
  updatePaymentStatus: (id: string, status: 'paid' | 'pending') => void;
  addDocument: (doc: Omit<Document, 'id' | 'uploadedAt'>) => void;
  addComment: (comment: Omit<EDSComment, 'id' | 'createdAt'>) => void;
  upsertGist: (gist: MeetingGist) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  addSector: (sector: Omit<Sector, 'id'>) => void;
  updateSector: (id: string, updates: Partial<Omit<Sector, 'id'>>) => void;
  deleteSector: (id: string) => void;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>) => void;
  deleteTemplate: (id: string) => void;
  saveMinutes: (minutes: Omit<MinutesOfMeeting, 'id'>) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateApplication: (id: string, updates: Partial<Omit<Application, 'id' | 'createdAt'>>) => void;
}

type StoreContextType = StoreData & StoreActions;

const StoreContext = createContext<StoreContextType | null>(null);

export function useAppStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore must be used within StoreProvider');
  return ctx;
}

// ---- Helper: detect if Firebase is configured ----
function isFirebaseConfigured(): boolean {
  return firebaseConfigured && !!db && !!auth;
}

// ---- Provider ----
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>({
    users: INITIAL_USERS,
    applications: [],
    documents: [],
    sectors: INITIAL_SECTORS,
    comments: [],
    gists: [],
    templates: [],
    payments: [],
    minutes: [],
    currentUser: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const useFirebase = isFirebaseConfigured();

  // ---- LocalStorage fallback helpers ----
  const loadLocal = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(prev => ({
          ...prev,
          ...parsed,
          // Ensure new fields have defaults
          templates: parsed.templates || [],
          payments: parsed.payments || [],
          minutes: parsed.minutes || [],
        }));
      } catch { /* ignore corrupt storage */ }
    }
  }, []);

  const saveLocal = useCallback((newData: StoreData) => {
    setData(newData);
    if (!useFirebase) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }
  }, [useFirebase]);

  // ---- Firebase real-time listeners ----
  useEffect(() => {
    if (!useFirebase) {
      loadLocal();
      setHydrated(true);
      return;
    }

    setFirebaseConnected(true);
    const unsubscribers: (() => void)[] = [];
    // Non-null: useFirebase guard ensures db/auth are non-null
    const fbDb = db!;
    const fbAuth = auth!;

    // Listen to applications
    unsubscribers.push(
      onSnapshot(collection(fbDb, APPLICATIONS), (snap) => {
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
        setData(prev => ({ ...prev, applications: apps }));
      })
    );

    // Listen to documents
    unsubscribers.push(
      onSnapshot(collection(db!, DOCUMENTS), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Document));
        setData(prev => ({ ...prev, documents: docs }));
      })
    );

    // Listen to sectors
    unsubscribers.push(
      onSnapshot(collection(db!, SECTORS), (snap) => {
        const sectors = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sector));
        setData(prev => ({ ...prev, sectors: sectors.length > 0 ? sectors : INITIAL_SECTORS }));
      })
    );

    // Listen to users
    unsubscribers.push(
      onSnapshot(collection(db!, USERS), (snap) => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
        setData(prev => ({ ...prev, users: users.length > 0 ? users : INITIAL_USERS }));
      })
    );

    // Listen to comments
    unsubscribers.push(
      onSnapshot(collection(db!, COMMENTS), (snap) => {
        const comments = snap.docs.map(d => ({ id: d.id, ...d.data() } as EDSComment));
        setData(prev => ({ ...prev, comments }));
      })
    );

    // Listen to gists
    unsubscribers.push(
      onSnapshot(collection(db!, GISTS), (snap) => {
        const gists = snap.docs.map(d => ({ ...d.data() } as MeetingGist));
        setData(prev => ({ ...prev, gists }));
      })
    );

    // Listen to templates
    unsubscribers.push(
      onSnapshot(collection(db!, TEMPLATES), (snap) => {
        const templates = snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
        setData(prev => ({ ...prev, templates }));
      })
    );

    // Listen to minutes of meeting
    unsubscribers.push(
      onSnapshot(collection(db!, MINUTES), (snap) => {
        const minutesList = snap.docs.map(d => ({ id: d.id, ...d.data() } as MinutesOfMeeting));
        setData(prev => ({ ...prev, minutes: minutesList }));
      })
    );

    // Listen to payments — filtered by the current user's uid so the
    // rule (resource.data.userId == request.auth.uid || isAdmin()) is
    // satisfied for ALL documents returned, preventing permission-denied.
    // Admins also only see their own payments here; cross-user payment
    // lookup happens per-application in the detail view (getDoc).
    const paymentsQuery = fbAuth.currentUser
      ? query(collection(fbDb, PAYMENTS), where("userId", "==", fbAuth.currentUser.uid))
      : null;
    if (paymentsQuery) {
      unsubscribers.push(
        onSnapshot(paymentsQuery, (snap) => {
          const paymentsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
          setData(prev => ({ ...prev, payments: paymentsList }));
        })
      );
    }

    // Auth state listener
    unsubscribers.push(
      onAuthStateChanged(auth!, async (firebaseUser) => {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db!, USERS, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setData(prev => ({ ...prev, currentUser: userData }));
          }
        } else {
          setData(prev => ({ ...prev, currentUser: null }));
        }
        setHydrated(true);
      })
    );

    return () => unsubscribers.forEach(u => u());
  }, [useFirebase, loadLocal]);

  // ---- Actions ----

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    if (useFirebase) {
      try {
        const cred = await signInWithEmailAndPassword(auth!, email, password);
        const userDoc = await getDoc(doc(db!, USERS, cred.user.uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setData(prev => {
            const nd = { ...prev, currentUser: userData };
            return nd;
          });
          return userData;
        }
        return null;
      } catch {
        return null;
      }
    } else {
      // LocalStorage demo mode
      const user = data.users.find(u => u.email === email);
      if (user) {
        saveLocal({ ...data, currentUser: user });
        return user;
      }
      return null;
    }
  }, [useFirebase, data, saveLocal]);

  const logout = useCallback(async () => {
    if (useFirebase) {
      await signOut(auth!);
    }
    saveLocal({ ...data, currentUser: null });
  }, [useFirebase, data, saveLocal]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<{ user: User | null; error?: string }> => {
    if (useFirebase) {
      try {
        const cred = await createUserWithEmailAndPassword(auth!, email, password);
        const newUser: User = {
          id: cred.user.uid,
          name,
          email,
          role: 'Project Proponent',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db!, USERS, cred.user.uid), {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
        });
        setData(prev => ({ ...prev, currentUser: newUser }));
        return { user: newUser };
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? '';
        let message = 'Registration failed. Please try again.';
        if (code === 'auth/email-already-in-use') message = 'This email is already registered. Try signing in or use Forgot Password.';
        else if (code === 'auth/invalid-email') message = 'Invalid email address format.';
        else if (code === 'auth/weak-password') message = 'Password is too weak. Use at least 6 characters.';
        else if (code === 'auth/operation-not-allowed') message = 'Email/password sign-up is not enabled. Contact your administrator.';
        else if (code === 'auth/network-request-failed') message = 'Network error. Please check your connection.';
        return { user: null, error: message };
      }
    } else {
      const existing = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) return { user: null, error: 'This email is already registered. Try signing in.' };
      const newUser: User = {
        id: crypto.randomUUID(),
        name,
        email,
        role: 'Project Proponent',
        createdAt: new Date().toISOString(),
      };
      saveLocal({ ...data, users: [...data.users, newUser], currentUser: newUser });
      return { user: newUser };
    }
  }, [useFirebase, data, saveLocal]);

  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (useFirebase) {
      try {
        await sendPasswordResetEmail(auth!, email);
        return { success: true };
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? '';
        let message = 'Failed to send reset email. Please try again.';
        if (code === 'auth/user-not-found') message = 'No account found with that email address.';
        else if (code === 'auth/invalid-email') message = 'Invalid email address format.';
        else if (code === 'auth/too-many-requests') message = 'Too many requests. Please wait before trying again.';
        return { success: false, error: message };
      }
    } else {
      // Demo mode — simulate success
      const found = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!found) return { success: false, error: 'No account found with that email address.' };
      return { success: true };
    }
  }, [useFirebase, data]);

  const addApplication = useCallback(async (app: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'paymentStatus'>): Promise<Application> => {
    const now = new Date().toISOString();
    if (useFirebase) {
      const docRef = await addDoc(collection(db!, APPLICATIONS), {
        ...app,
        status: 'Draft' as ApplicationStatus,
        paymentStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      return { id: docRef.id, ...app, status: 'Draft', paymentStatus: 'pending', createdAt: now, updatedAt: now };
    } else {
      const newApp: Application = {
        ...app,
        id: crypto.randomUUID(),
        status: 'Draft',
        paymentStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      saveLocal({ ...data, applications: [...data.applications, newApp] });
      return newApp;
    }
  }, [useFirebase, data, saveLocal]);

  const updateApplicationStatus = useCallback((id: string, status: ApplicationStatus) => {
    const app = data.applications.find(a => a.id === id);
    if (app && !isValidTransition(app.status, status)) {
      console.warn(`Invalid status transition: ${app.status} → ${status}`);
      return;
    }

    if (useFirebase) {
      updateDoc(doc(db!, APPLICATIONS, id), { status, updatedAt: new Date().toISOString() });
    } else {
      const apps = data.applications.map(a =>
        a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
      );
      saveLocal({ ...data, applications: apps });
    }
  }, [useFirebase, data, saveLocal]);

  const updatePaymentStatus = useCallback((id: string, status: 'paid' | 'pending') => {
    if (useFirebase) {
      updateDoc(doc(db!, APPLICATIONS, id), { paymentStatus: status, updatedAt: new Date().toISOString() });
    } else {
      const apps = data.applications.map(a =>
        a.id === id ? { ...a, paymentStatus: status, updatedAt: new Date().toISOString() } : a
      );
      saveLocal({ ...data, applications: apps });
    }
  }, [useFirebase, data, saveLocal]);

  const addDocument = useCallback((docData: Omit<Document, 'id' | 'uploadedAt'>) => {
    const now = new Date().toISOString();
    if (useFirebase) {
      addDoc(collection(db!, DOCUMENTS), { ...docData, uploadedAt: now });
    } else {
      const newDoc: Document = {
        ...docData,
        id: crypto.randomUUID(),
        uploadedAt: now,
      };
      saveLocal({ ...data, documents: [...data.documents, newDoc] });
    }
  }, [useFirebase, data, saveLocal]);

  const addComment = useCallback((comment: Omit<EDSComment, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    if (useFirebase) {
      addDoc(collection(db!, COMMENTS), { ...comment, createdAt: now });
    } else {
      const newComment: EDSComment = {
        ...comment,
        id: crypto.randomUUID(),
        createdAt: now,
      };
      saveLocal({ ...data, comments: [...data.comments, newComment] });
    }
  }, [useFirebase, data, saveLocal]);

  const upsertGist = useCallback((gist: MeetingGist) => {
    if (useFirebase) {
      setDoc(doc(db!, GISTS, gist.applicationId), gist);
    } else {
      const existingIndex = data.gists.findIndex(g => g.applicationId === gist.applicationId);
      const newGists = [...data.gists];
      if (existingIndex > -1) {
        newGists[existingIndex] = gist;
      } else {
        newGists.push(gist);
      }
      saveLocal({ ...data, gists: newGists });
    }
  }, [useFirebase, data, saveLocal]);

  const updateUserRole = useCallback((userId: string, role: UserRole) => {
    if (useFirebase) {
      updateDoc(doc(db!, USERS, userId), { role });
    } else {
      const users = data.users.map(u => u.id === userId ? { ...u, role } : u);
      saveLocal({ ...data, users });
    }
  }, [useFirebase, data, saveLocal]);

  const addSector = useCallback((sector: Omit<Sector, 'id'>) => {
    if (useFirebase) {
      addDoc(collection(db!, SECTORS), sector);
    } else {
      const newSector: Sector = { ...sector, id: crypto.randomUUID() };
      saveLocal({ ...data, sectors: [...data.sectors, newSector] });
    }
  }, [useFirebase, data, saveLocal]);

  const updateSector = useCallback((id: string, updates: Partial<Omit<Sector, 'id'>>) => {
    if (useFirebase) {
      updateDoc(doc(db!, SECTORS, id), updates);
    } else {
      const sectors = data.sectors.map(s => s.id === id ? { ...s, ...updates } : s);
      saveLocal({ ...data, sectors });
    }
  }, [useFirebase, data, saveLocal]);

  const deleteSector = useCallback((id: string) => {
    if (useFirebase) {
      deleteDoc(doc(db!, SECTORS, id));
    } else {
      saveLocal({ ...data, sectors: data.sectors.filter(s => s.id !== id) });
    }
  }, [useFirebase, data, saveLocal]);

  const addTemplate = useCallback((template: Omit<Template, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    if (useFirebase) {
      addDoc(collection(db!, TEMPLATES), { ...template, createdAt: now });
    } else {
      const newTemplate: Template = { ...template, id: crypto.randomUUID(), createdAt: now };
      saveLocal({ ...data, templates: [...data.templates, newTemplate] });
    }
  }, [useFirebase, data, saveLocal]);

  const updateTemplate = useCallback((id: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>) => {
    if (useFirebase) {
      updateDoc(doc(db!, TEMPLATES, id), { ...updates, updatedAt: new Date().toISOString() });
    } else {
      const templates = data.templates.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
      saveLocal({ ...data, templates });
    }
  }, [useFirebase, data, saveLocal]);

  const deleteTemplate = useCallback((id: string) => {
    if (useFirebase) {
      deleteDoc(doc(db!, TEMPLATES, id));
    } else {
      saveLocal({ ...data, templates: data.templates.filter(t => t.id !== id) });
    }
  }, [useFirebase, data, saveLocal]);

  const saveMinutes = useCallback((minutes: Omit<MinutesOfMeeting, 'id'>) => {
    if (useFirebase) {
      setDoc(doc(db!, MINUTES, minutes.applicationId), minutes);
    } else {
      const existing = data.minutes.findIndex(m => m.applicationId === minutes.applicationId);
      const newMinutes = [...data.minutes];
      const entry = { ...minutes, id: minutes.applicationId };
      if (existing > -1) {
        newMinutes[existing] = entry;
      } else {
        newMinutes.push(entry);
      }
      saveLocal({ ...data, minutes: newMinutes });
    }
  }, [useFirebase, data, saveLocal]);

  const addUser = useCallback((user: Omit<User, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    if (useFirebase) {
      addDoc(collection(db!, USERS), { ...user, createdAt: now });
    } else {
      const newUser: User = { ...user, id: crypto.randomUUID(), createdAt: now };
      saveLocal({ ...data, users: [...data.users, newUser] });
    }
  }, [useFirebase, data, saveLocal]);

  const updateApplication = useCallback((id: string, updates: Partial<Omit<Application, 'id' | 'createdAt'>>) => {
    const now = new Date().toISOString();
    if (useFirebase) {
      updateDoc(doc(db!, APPLICATIONS, id), { ...updates, updatedAt: now });
    } else {
      const applications = data.applications.map(a => a.id === id ? { ...a, ...updates, updatedAt: now } : a);
      saveLocal({ ...data, applications });
    }
  }, [useFirebase, data, saveLocal]);

  const value: StoreContextType = {
    ...data,
    hydrated,
    firebaseConnected,
    login,
    logout,
    register,
    addApplication,
    updateApplicationStatus,
    updatePaymentStatus,
    addDocument,
    addComment,
    upsertGist,
    updateUserRole,
    addSector,
    updateSector,
    deleteSector,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    saveMinutes,
    addUser,
    updateApplication,
    forgotPassword,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
