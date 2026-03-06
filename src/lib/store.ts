
"use client";

import { useEffect, useState } from 'react';
import type { User, UserRole, Application, ApplicationStatus, Document, Sector, EDSComment, MeetingGist } from './types';

// Mock Initial Data
const INITIAL_SECTORS: Sector[] = [
  { id: '1', name: 'Mining', description: 'Mineral extraction and processing' },
  { id: '2', name: 'Infrastructure', description: 'Roads, bridges, and public works' },
  { id: '3', name: 'Energy', description: 'Power plants and renewable energy' },
];

const INITIAL_USERS: User[] = [
  { id: 'admin-1', name: 'System Admin', email: 'admin@ecoclear.gov', role: 'Admin', createdAt: new Date().toISOString() },
  { id: 'proponent-1', name: 'John Developer', email: 'john@builder.com', role: 'Project Proponent', createdAt: new Date().toISOString() },
  { id: 'scrutiny-1', name: 'Sarah Scrutiny', email: 'sarah@ecoclear.gov', role: 'Scrutiny Team', createdAt: new Date().toISOString() },
  { id: 'mom-1', name: 'Mike Meeting', email: 'mike@ecoclear.gov', role: 'MoM Team', createdAt: new Date().toISOString() },
];

const STORAGE_KEY = 'ecoclear_storage';

interface StoreData {
  users: User[];
  applications: Application[];
  documents: Document[];
  sectors: Sector[];
  comments: EDSComment[];
  gists: MeetingGist[];
  currentUser: User | null;
}

export const useAppStore = () => {
  const [data, setData] = useState<StoreData>({
    users: INITIAL_USERS,
    applications: [],
    documents: [],
    sectors: INITIAL_SECTORS,
    comments: [],
    gists: [],
    currentUser: null,
  });

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setData(JSON.parse(saved));
    }
    setHydrated(true);
  }, []);

  const save = (newData: StoreData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  const login = (email: string) => {
    const user = data.users.find(u => u.email === email);
    if (user) {
      save({ ...data, currentUser: user });
      return user;
    }
    return null;
  };

  const logout = () => {
    save({ ...data, currentUser: null });
  };

  const addApplication = (app: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'paymentStatus'>) => {
    const newApp: Application = {
      ...app,
      id: Math.random().toString(36).substr(2, 9),
      status: 'Draft',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    save({ ...data, applications: [...data.applications, newApp] });
    return newApp;
  };

  const updateApplicationStatus = (id: string, status: ApplicationStatus) => {
    const apps = data.applications.map(app => 
      app.id === id ? { ...app, status, updatedAt: new Date().toISOString() } : app
    );
    save({ ...data, applications: apps });
  };

  const updatePaymentStatus = (id: string, status: 'paid' | 'pending') => {
    const apps = data.applications.map(app => 
      app.id === id ? { ...app, paymentStatus: status, updatedAt: new Date().toISOString() } : app
    );
    save({ ...data, applications: apps });
  };

  const addDocument = (doc: Omit<Document, 'id' | 'uploadedAt'>) => {
    const newDoc: Document = {
      ...doc,
      id: Math.random().toString(36).substr(2, 9),
      uploadedAt: new Date().toISOString(),
    };
    save({ ...data, documents: [...data.documents, newDoc] });
  };

  const addComment = (comment: Omit<EDSComment, 'id' | 'createdAt'>) => {
    const newComment: EDSComment = {
      ...comment,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    save({ ...data, comments: [...data.comments, newComment] });
  };

  const upsertGist = (gist: MeetingGist) => {
    const existingIndex = data.gists.findIndex(g => g.applicationId === gist.applicationId);
    const newGists = [...data.gists];
    if (existingIndex > -1) {
      newGists[existingIndex] = gist;
    } else {
      newGists.push(gist);
    }
    save({ ...data, gists: newGists });
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const users = data.users.map(u => u.id === userId ? { ...u, role } : u);
    save({ ...data, users });
  };

  return {
    ...data,
    hydrated,
    login,
    logout,
    addApplication,
    updateApplicationStatus,
    updatePaymentStatus,
    addDocument,
    addComment,
    upsertGist,
    updateUserRole,
  };
};
