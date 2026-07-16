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
  apiKey: "AIzaSyCB2Ge7pUybR4FMrXns_1sf13pzeVbAURI",
  appId: "1:49689291728:web:c86ddbec87bd248a7567d5",
  messagingSenderId: "49689291728",
  projectId: "eduthart-5dd68",
  authDomain: "eduthart-5dd68.firebaseapp.com",
  storageBucket: "eduthart-5dd68.firebasestorage.app",
  measurementId: "G-JQCYPFYX4F",
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
