"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase/client";

const E2E_AUTH_ENABLED = process.env.NEXT_PUBLIC_E2E_AUTH === "1";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected image."));
    };

    reader.onerror = () =>
      reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

/**
 * Store a cropped profile image and return the URL to save on the profile.
 *
 * The Playwright suite has no Firebase Storage bucket, so under E2E the image
 * becomes a data URL and the rest of the flow is unchanged.
 */
export async function uploadProfileImage({
  file,
  folder,
  uid,
}: {
  file: File;
  folder: string;
  uid: string;
}) {
  if (E2E_AUTH_ENABLED) {
    return readFileAsDataUrl(file);
  }

  const storage = getFirebaseStorage();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storageRef = ref(storage, `${folder}/${uid}/${Date.now()}-${safeName}`);

  await uploadBytes(storageRef, file, {
    cacheControl: "public,max-age=31536000,immutable",
    contentType: file.type,
  });

  return getDownloadURL(storageRef);
}
