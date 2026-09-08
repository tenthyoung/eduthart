import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Populate the REAL Firestore database with placeholder artists and listings
 * for development, mirroring what /api/test/e2e-seed-demo does for the
 * file-backed e2e store.
 *
 * Everything this script creates is marked so the whole batch can be removed
 * without touching data created by hand:
 *   - every listing (and its public_artworks index entry) carries the "fake" tag
 *   - every seeded profile document has `fake: true` and a "fake-artist-" uid
 *
 *   npm run db:seed-fake          # create/refresh the fake data
 *   npm run db:delete-fake        # remove everything tagged fake
 */
const FAKE_TAG = "fake";
const FAKE_UID_PREFIX = "fake-artist-";

// --- credentials -----------------------------------------------------------

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(join(scriptDir, "..", ".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

function getDb() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (projectId && clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  return getFirestore();
}

// --- fake data -------------------------------------------------------------

function unsplash(id) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
}

const FAKE_ARTISTS = [
  {
    bio: "Abstract painter working in thin, layered washes. Studio practice built around tide charts and long walks on the Oregon coast.",
    firstName: "Maren",
    lastName: "Ellison",
    location: "Portland, OR",
    photoId: "photo-1494790108377-be9c29b29330",
    uid: `${FAKE_UID_PREFIX}maren-ellison`,
    username: "marenellison",
    address: {
      city: "Portland",
      country: "US",
      line1: "1200 SE Water Ave",
      line2: null,
      postalCode: "97214",
      region: "OR",
    },
    pieces: [
      {
        category: "Painting",
        description:
          "Layered acrylic washes in estuary blues and greys, sealed with a satin varnish. Painted on deep-edge canvas with finished sides.",
        height: "36",
        id: "fake-tidewater-no-4",
        imageId: "photo-1541961017774-22349e4a1262",
        medium: "Acrylic",
        mood: ["Peaceful", "Minimal"],
        orientation: "Portrait",
        price: "1850",
        style: "Abstract",
        subject: "Abstract",
        tags: [FAKE_TAG, "coastal", "blue"],
        title: "Tidewater No. 4",
        width: "24",
        yearCreated: "2025",
      },
      {
        category: "Painting",
        description:
          "Warm ochre fields broken by a single graphite line. Oil on linen, framed in raw oak.",
        height: "30",
        id: "fake-amber-field",
        imageId: "photo-1549289524-06cf8837ace5",
        medium: "Oil",
        mood: ["Peaceful"],
        orientation: "Landscape",
        price: "2400",
        style: "Color Field",
        subject: "Abstract",
        tags: [FAKE_TAG, "warm", "minimal"],
        title: "Amber Field",
        width: "40",
        yearCreated: "2024",
      },
      {
        category: "Painting",
        description:
          "A quiet watercolor study in greys and milk white, mounted on archival board.",
        height: "14",
        id: "fake-quiet-interval",
        imageId: "photo-1579783902614-a3fb3927b6a5",
        medium: "Watercolor",
        mood: ["Minimal", "Peaceful"],
        orientation: "Square",
        price: "480",
        style: "Minimalist",
        subject: "Abstract",
        tags: [FAKE_TAG, "works-on-paper", "grey"],
        title: "Quiet Interval",
        width: "14",
        yearCreated: "2026",
      },
    ],
  },
  {
    bio: "Documentary photographer shooting medium-format film. Editions printed by hand in a shared darkroom in Red Hook.",
    firstName: "Deshi",
    lastName: "Okafor",
    location: "Brooklyn, NY",
    photoId: "photo-1500648767791-00dcc994a43e",
    uid: `${FAKE_UID_PREFIX}deshi-okafor`,
    username: "deshiokafor",
    address: {
      city: "Brooklyn",
      country: "US",
      line1: "45 Van Brunt St",
      line2: null,
      postalCode: "11231",
      region: "NY",
    },
    pieces: [
      {
        category: "Photography",
        description:
          "Morning fog lifting off the water, shot on Portra 400. Archival pigment print, edition of 12, signed on the reverse.",
        height: "20",
        id: "fake-harbour-first-light",
        imageId: "photo-1507525428034-b723cf961d3e",
        medium: "Film",
        mood: ["Peaceful"],
        orientation: "Landscape",
        price: "650",
        style: "Documentary",
        subject: "Landscape",
        tags: [FAKE_TAG, "film", "ocean"],
        title: "Harbour at First Light",
        width: "30",
        yearCreated: "2024",
      },
      {
        category: "Photography",
        description:
          "Rooftops and water towers at dusk. Silver gelatin print with a subtle warm tone, edition of 8.",
        height: "24",
        id: "fake-crosstown",
        imageId: "photo-1477959858617-67f85cf4f1df",
        medium: "Film",
        mood: ["Dramatic", "Dark"],
        orientation: "Landscape",
        price: "820",
        style: "Documentary",
        subject: "Cityscape",
        tags: [FAKE_TAG, "black-and-white", "city"],
        title: "Crosstown",
        width: "36",
        yearCreated: "2023",
      },
      {
        category: "Photography",
        description:
          "Pines in coastal mist, printed large on cotton rag. The quietest image from a week on the northern shore.",
        height: "30",
        id: "fake-salt-air",
        imageId: "photo-1441974231531-c6227db76b6e",
        medium: "Film",
        mood: ["Peaceful", "Minimal"],
        orientation: "Landscape",
        price: "740",
        style: "Landscape",
        subject: "Nature",
        tags: [FAKE_TAG, "forest", "mist"],
        title: "Salt Air",
        width: "40",
        yearCreated: "2025",
      },
    ],
  },
  {
    bio: "Ceramicist and sculptor. Wheel-thrown stoneware fired in a wood kiln, plus small bronze editions cast at a local foundry.",
    firstName: "Ines",
    lastName: "Calloway",
    location: "Santa Fe, NM",
    photoId: "photo-1544005313-94ddf0286df2",
    uid: `${FAKE_UID_PREFIX}ines-calloway`,
    username: "inescalloway",
    address: {
      city: "Santa Fe",
      country: "US",
      line1: "830 Canyon Rd",
      line2: null,
      postalCode: "87501",
      region: "NM",
    },
    pieces: [
      {
        category: "Ceramic",
        description:
          "Wheel-thrown vessel with an ash glaze that breaks amber over the shoulder. Wood-fired over three days.",
        height: "12",
        id: "fake-vessel-ash-glaze",
        imageId: "photo-1610701596007-11502861dcfa",
        medium: "Mixed Media",
        mood: ["Minimal", "Peaceful"],
        orientation: "Portrait",
        price: "540",
        style: "Wabi-sabi",
        subject: "Abstract",
        tags: [FAKE_TAG, "stoneware", "wood-fired"],
        title: "Vessel with Ash Glaze",
        width: "8",
        yearCreated: "2025",
      },
      {
        category: "Ceramic",
        description:
          "A matched pair of stoneware forms in an unglazed, sanded finish. Sold together.",
        height: "9",
        id: "fake-stoneware-pair",
        imageId: "photo-1493106641515-6b5631de4bb9",
        medium: "Mixed Media",
        mood: ["Minimal"],
        orientation: "Square",
        price: "380",
        style: "Modern",
        subject: "Abstract",
        tags: [FAKE_TAG, "stoneware", "pair"],
        title: "Stoneware Pair",
        width: "9",
        yearCreated: "2026",
      },
      {
        category: "Sculpture",
        description:
          "Small bronze study of a folded form, cast in an edition of 5 with a dark patina. Numbered and stamped.",
        height: "10",
        id: "fake-bronze-study-ii",
        imageId: "photo-1554188248-986adbb73be4",
        medium: "Bronze",
        mood: ["Dramatic"],
        orientation: "Portrait",
        price: "2900",
        style: "Modern",
        subject: "Abstract",
        tags: [FAKE_TAG, "bronze", "edition"],
        title: "Bronze Study II",
        width: "6",
        yearCreated: "2024",
      },
    ],
  },
  {
    bio: "Plein-air landscape painter following the light through the Sierra foothills. Everything starts outside and is finished in the studio.",
    firstName: "Tomas",
    lastName: "Reyes",
    location: "Sacramento, CA",
    photoId: "photo-1506794778202-cad84cf45f1d",
    uid: `${FAKE_UID_PREFIX}tomas-reyes`,
    username: "tomasreyes",
    address: {
      city: "Sacramento",
      country: "US",
      line1: "2110 K St",
      line2: null,
      postalCode: "95816",
      region: "CA",
    },
    pieces: [
      {
        category: "Painting",
        description:
          "First light on granite above the treeline. Oil on panel with a floating walnut frame.",
        height: "18",
        id: "fake-sierra-morning",
        imageId: "photo-1506905925346-21bda4d32df4",
        medium: "Oil",
        mood: ["Dramatic", "Peaceful"],
        orientation: "Landscape",
        price: "1600",
        style: "Impressionist",
        subject: "Landscape",
        tags: [FAKE_TAG, "mountains", "plein-air"],
        title: "Sierra Morning",
        width: "24",
        yearCreated: "2025",
      },
      {
        category: "Painting",
        description:
          "The confluence in late spring, painted over two mornings on the bank. Oil on linen.",
        height: "24",
        id: "fake-two-rivers",
        imageId: "photo-1469474968028-56623f02e42e",
        medium: "Oil",
        mood: ["Peaceful", "Vibrant"],
        orientation: "Landscape",
        price: "2200",
        style: "Impressionist",
        subject: "Landscape",
        tags: [FAKE_TAG, "river", "spring"],
        title: "Two Rivers",
        width: "36",
        yearCreated: "2024",
      },
      {
        category: "Painting",
        description:
          "Low gold light across a fence line at dusk. A small oil sketch with a lot of air in it.",
        height: "12",
        id: "fake-evening-pasture",
        imageId: "photo-1470071459604-3b5ec3a7fe05",
        medium: "Oil",
        mood: ["Peaceful"],
        orientation: "Landscape",
        price: "700",
        style: "Impressionist",
        subject: "Nature",
        tags: [FAKE_TAG, "dusk", "study"],
        title: "Evening Pasture",
        width: "16",
        yearCreated: "2026",
      },
    ],
  },
  {
    bio: "Works across drawing, collage, and print. Interested in weather, migration, and the patterns both leave behind.",
    firstName: "Priya",
    lastName: "Anand",
    location: "Austin, TX",
    photoId: "photo-1534528741775-53994a69daeb",
    uid: `${FAKE_UID_PREFIX}priya-anand`,
    username: "priyaanand",
    address: {
      city: "Austin",
      country: "US",
      line1: "979 Springdale Rd",
      line2: null,
      postalCode: "78702",
      region: "TX",
    },
    pieces: [
      {
        category: "Digital",
        description:
          "Generative composition grown from a season of local weather data, printed as a one-off giclée on baryta paper.",
        height: "28",
        id: "fake-signal-garden",
        imageId: "photo-1550684848-fac1c5b4e853",
        medium: "Digital",
        mood: ["Dark", "Dramatic"],
        orientation: "Portrait",
        price: "560",
        style: "Generative",
        subject: "Abstract",
        tags: [FAKE_TAG, "generative", "print"],
        title: "Signal Garden",
        width: "20",
        yearCreated: "2026",
      },
      {
        category: "Painting",
        description:
          "Collaged monsoon clouds over a graphite portrait, unified with a thin acrylic glaze.",
        height: "24",
        id: "fake-monsoon-portrait",
        imageId: "photo-1536924940846-227afb31e2a5",
        medium: "Mixed Media",
        mood: ["Dramatic"],
        orientation: "Portrait",
        price: "1150",
        style: "Contemporary",
        subject: "Portrait",
        tags: [FAKE_TAG, "collage", "portrait"],
        title: "Monsoon Portrait",
        width: "18",
        yearCreated: "2025",
      },
      {
        category: "Drawing",
        description:
          "A flock rendered in ink and cut paper, pinned in loose formation under glass.",
        height: "16",
        id: "fake-paper-birds",
        imageId: "photo-1452570053594-1b985d6ea890",
        medium: "Mixed Media",
        mood: ["Joyful", "Minimal"],
        orientation: "Landscape",
        price: "420",
        style: "Contemporary",
        subject: "Animals",
        tags: [FAKE_TAG, "ink", "birds"],
        title: "Paper Birds",
        width: "20",
        yearCreated: "2024",
      },
    ],
  },
];

// --- document builders -----------------------------------------------------

// Mirrors createEmptyListingItem in src/lib/artists/listing-flow.ts. Reads go
// through normalizeListingStudio, which fills any field this misses.
function buildItem(piece, now) {
  return {
    artworkDetails: {
      aiDisclosure: "not_used",
      artistStatement: "",
      category: piece.category,
      collection: "",
      colorPalette: [],
      copyrightCommercialLicensingAvailable: false,
      copyrightLicensingAvailable: false,
      copyrightOriginalOnly: true,
      copyrightPrintsAllowed: false,
      description: piece.description,
      medium: piece.medium,
      mediumDetails: [],
      mood: piece.mood,
      orientation: piece.orientation,
      roomRecommendations: [],
      storyBehindPiece: "",
      style: piece.style,
      subject: piece.subject,
      surface: "",
      tags: piece.tags,
      theme: [],
      title: piece.title,
      yearCreated: piece.yearCreated,
    },
    dimensions: {
      depth: "",
      frameColor: "",
      frameIncluded: false,
      frameMaterial: "",
      framed: false,
      height: piece.height,
      readyToHang: true,
      rolledInTube: false,
      stretchedCanvas: false,
      unit: "in",
      weight: "",
      weightUnit: "lb",
      width: piece.width,
    },
    id: piece.id,
    media: {
      backImageUrl: null,
      detailImageUrls: [],
      framedImageUrl: null,
      galleryImageUrls: [],
      mainImageUrl: unsplash(piece.imageId),
      roomMockupImageUrl: null,
      sideProfileImageUrl: null,
      signatureImageUrl: null,
      videoUrl: null,
    },
    pricingInventory: {
      acceptOffers: false,
      artistProofsAvailable: false,
      availability: "original_available",
      currency: "USD",
      editionNumber: "",
      editionSize: "",
      limitedEdition: false,
      minimumOffer: "",
      negotiable: false,
      openEdition: false,
      price: piece.price,
      quantity: "1",
      reservePrice: "",
    },
    salesVisibility: {
      agreeCommissionRate: true,
      agreeSellerAgreement: true,
      aiDisclosureConfirmed: true,
      certifyAccurateInformation: true,
      commissionAvailable: false,
      createdArtwork: true,
      digitalDownload: false,
      draft: false,
      limitedPrints: false,
      metaDescription: "",
      metaTitle: "",
      noCopyrightedMaterial: true,
      original: true,
      ownsRights: true,
      prints: false,
      private: false,
      public: true,
      slug: "",
      understandShippingRequirements: true,
      unlisted: false,
    },
    updatedAt: now,
  };
}

function buildStudio(artist, now) {
  return {
    fake: true,
    items: artist.pieces.map((piece) => buildItem(piece, now)),
    shared: {
      shippingAuthentication: {
        certificateOfAuthenticityIncluded: true,
        domesticShipping: "50",
        finish: "",
        freeShipping: false,
        insuranceIncluded: true,
        internationalShipping: "150",
        localPickup: false,
        materialsUsed: [],
        numbered: false,
        processingTime: "3-5 business days",
        shippedFromSummary: `${artist.address.city}, ${artist.address.region}`,
        signatureRequired: false,
        signed: true,
        signedBack: true,
        signedCertificate: false,
        signedFront: false,
      },
      shippingOriginAddress: artist.address,
    },
    updatedAt: now,
  };
}

function buildProfile(artist, now) {
  return {
    authProviders: [],
    bio: artist.bio,
    createdAt: now,
    displayName: `${artist.firstName} ${artist.lastName}`,
    email: `${artist.username}@example.com`,
    fake: true,
    firstName: artist.firstName,
    lastName: artist.lastName,
    location: artist.location,
    photoURL: unsplash(artist.photoId),
    shippingOriginAddress: artist.address,
    uid: artist.uid,
    updatedAt: now,
    username: artist.username,
    usernameLower: artist.username.toLowerCase(),
  };
}

// Mirrors buildIndexEntry in src/lib/artists/artwork-index.ts (USD only here,
// so priceMinor is cents).
function buildIndexEntry(artist, piece, now) {
  return {
    artistName: `${artist.firstName} ${artist.lastName}`,
    artistUid: artist.uid,
    artistUsername: artist.username,
    availability: "original_available",
    category: piece.category,
    currency: "USD",
    fake: true,
    href: `/artists/${artist.username}/art/${piece.id}`,
    imageUrl: unsplash(piece.imageId),
    itemId: piece.id,
    medium: piece.medium,
    priceMinor: Math.round(Number(piece.price) * 100),
    style: piece.style,
    subject: piece.subject,
    tags: piece.tags,
    title: piece.title,
    updatedAt: now,
  };
}

// --- commands --------------------------------------------------------------

async function seed(db) {
  const now = new Date().toISOString();
  const batch = db.batch();

  for (const artist of FAKE_ARTISTS) {
    batch.set(db.collection("users").doc(artist.uid), buildProfile(artist, now));
    batch.set(
      db
        .collection("users")
        .doc(artist.uid)
        .collection("seller")
        .doc("listing_flow"),
      buildStudio(artist, now)
    );

    for (const piece of artist.pieces) {
      batch.set(
        db.collection("public_artworks").doc(`${artist.uid}__${piece.id}`),
        buildIndexEntry(artist, piece, now)
      );
    }
  }

  await batch.commit();

  for (const artist of FAKE_ARTISTS) {
    console.log(
      `seeded @${artist.username} (${artist.pieces.length} listings)`
    );
  }
  console.log(`\nDone. Every listing is tagged "${FAKE_TAG}".`);
  console.log("Remove it all with: npm run db:delete-fake");
}

async function remove(db) {
  const index = await db
    .collection("public_artworks")
    .where("tags", "array-contains", FAKE_TAG)
    .get();

  for (const doc of index.docs) {
    await doc.ref.delete();
  }
  console.log(`deleted ${index.size} public_artworks entries tagged "${FAKE_TAG}"`);

  const users = await db.collection("users").where("fake", "==", true).get();
  let removedUsers = 0;

  for (const doc of users.docs) {
    if (!doc.id.startsWith(FAKE_UID_PREFIX)) {
      console.warn(`skipping ${doc.id}: fake flag set but uid lacks prefix`);
      continue;
    }
    // Removes the profile document and every subcollection under it.
    await db.recursiveDelete(doc.ref);
    removedUsers += 1;
  }

  console.log(`deleted ${removedUsers} fake artist accounts`);
}

const db = getDb();

if (process.argv.includes("--delete")) {
  await remove(db);
} else {
  await seed(db);
}
