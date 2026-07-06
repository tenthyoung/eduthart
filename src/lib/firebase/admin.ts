import { getApp, getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const adminClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const adminPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  if (adminProjectId && adminClientEmail && adminPrivateKey) {
    return initializeApp({
      credential: cert({
        projectId: adminProjectId,
        clientEmail: adminClientEmail,
        privateKey: adminPrivateKey,
      }),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: adminProjectId,
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
