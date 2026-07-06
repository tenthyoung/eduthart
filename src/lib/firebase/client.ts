import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBDsgSijXXCtErTHFtJMtCUFV0ihjElWcE",
  appId: "1:897269181896:web:217e392aa664275778a4fd",
  messagingSenderId: "897269181896",
  projectId: "eduthart-d62de",
  authDomain: "eduthart-d62de.firebaseapp.com",
  storageBucket: "eduthart-d62de.firebasestorage.app",
  measurementId: "G-TC27M73DQS",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authPersistencePromise: Promise<Auth> | null = null;

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAuth() {
  const auth = getAuth(app);
  if (!authPersistencePromise) {
    authPersistencePromise = setPersistence(auth, browserLocalPersistence)
      .catch(() => undefined)
      .then(() => auth);
  }
  return authPersistencePromise;
}

export function getFirebaseFirestore() {
  return getFirestore(app);
}

export function getFirebaseFunctions() {
  return getFunctions(app);
}
