import { NextResponse } from "next/server";

import { syncArtworkIndex } from "@/lib/artists/artwork-index";
import {
  createEmptyListingItem,
  createEmptyListingStudio,
  type ListingItemDraft,
} from "@/lib/artists/listing-flow";
import { loadListingStudio } from "@/lib/artists/listing-store";
import {
  deleteE2EAccountProfile,
  deleteE2EListingFlow,
  isE2EAuthEnabled,
  seedE2EAccountProfile,
  updateE2EListingFlow,
} from "@/lib/auth/e2e-store";
import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import {
  buildProfileDisplayName,
  loadAccountProfile,
} from "@/lib/auth/profile-store";

/**
 * Populate the site with placeholder artists and listings for development.
 *
 * Every seeded listing carries the TEMP_TAG tag, so the whole batch can be
 * removed later without touching anything created by hand:
 *
 *   curl -X POST http://localhost:<port>/api/test/e2e-seed-demo
 *   curl -X DELETE http://localhost:<port>/api/test/e2e-seed-demo
 *
 * DELETE strips tagged items out of every studio (and removes the seeded
 * demo-artist accounts once they have nothing left), then re-syncs the
 * public artwork index, so it is safe even after real listings exist.
 */
const TEMP_TAG = "temporary_listing";
const DEMO_UID_PREFIX = "demo-artist-";

function unsplash(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
}

type DemoPiece = {
  category: string;
  description: string;
  height: string;
  imageId: string;
  medium: string;
  mood: string[];
  orientation: string;
  price: string;
  style: string;
  subject: string;
  tags: string[];
  title: string;
  width: string;
  yearCreated: string;
};

type DemoArtist = {
  bio: string;
  firstName: string;
  lastName: string;
  location: string;
  pieces: DemoPiece[];
  uid: string;
  username: string;
};

const DEMO_ARTISTS: DemoArtist[] = [
  {
    bio: "Abstract painter working in thin, layered washes. Studio practice built around tide charts and long walks on the Oregon coast.",
    firstName: "Maren",
    lastName: "Ellison",
    location: "Portland, OR",
    uid: `${DEMO_UID_PREFIX}maren-ellison`,
    username: "marenellison",
    pieces: [
      {
        category: "Painting",
        description:
          "Layered acrylic washes in estuary blues and greys, sealed with a satin varnish. Painted on deep-edge canvas with finished sides.",
        height: "36",
        imageId: "photo-1541961017774-22349e4a1262",
        medium: "Acrylic",
        mood: ["Peaceful", "Minimal"],
        orientation: "Portrait",
        price: "1850",
        style: "Abstract",
        subject: "Abstract",
        tags: [TEMP_TAG, "coastal", "blue"],
        title: "Tidewater No. 4",
        width: "24",
        yearCreated: "2025",
      },
      {
        category: "Painting",
        description:
          "Warm ochre fields broken by a single graphite line. Oil on linen, framed in raw oak.",
        height: "30",
        imageId: "photo-1549289524-06cf8837ace5",
        medium: "Oil",
        mood: ["Peaceful"],
        orientation: "Landscape",
        price: "2400",
        style: "Color Field",
        subject: "Abstract",
        tags: [TEMP_TAG, "warm", "minimal"],
        title: "Amber Field",
        width: "40",
        yearCreated: "2024",
      },
      {
        category: "Painting",
        description:
          "A quiet watercolor study in greys and milk white, mounted on archival board.",
        height: "14",
        imageId: "photo-1579783902614-a3fb3927b6a5",
        medium: "Watercolor",
        mood: ["Minimal", "Peaceful"],
        orientation: "Square",
        price: "480",
        style: "Minimalist",
        subject: "Abstract",
        tags: [TEMP_TAG, "works-on-paper", "grey"],
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
    uid: `${DEMO_UID_PREFIX}deshi-okafor`,
    username: "deshiokafor",
    pieces: [
      {
        category: "Photography",
        description:
          "Morning fog lifting off the water, shot on Portra 400. Archival pigment print, edition of 12, signed on the reverse.",
        height: "20",
        imageId: "photo-1507525428034-b723cf961d3e",
        medium: "Film",
        mood: ["Peaceful"],
        orientation: "Landscape",
        price: "650",
        style: "Documentary",
        subject: "Landscape",
        tags: [TEMP_TAG, "film", "ocean"],
        title: "Harbour at First Light",
        width: "30",
        yearCreated: "2024",
      },
      {
        category: "Photography",
        description:
          "Rooftops and water towers at dusk. Silver gelatin print with a subtle warm tone, edition of 8.",
        height: "24",
        imageId: "photo-1477959858617-67f85cf4f1df",
        medium: "Film",
        mood: ["Dramatic", "Dark"],
        orientation: "Landscape",
        price: "820",
        style: "Documentary",
        subject: "Cityscape",
        tags: [TEMP_TAG, "black-and-white", "city"],
        title: "Crosstown",
        width: "36",
        yearCreated: "2023",
      },
      {
        category: "Photography",
        description:
          "Pines in coastal mist, printed large on cotton rag. The quietest image from a week on the northern shore.",
        height: "30",
        imageId: "photo-1441974231531-c6227db76b6e",
        medium: "Film",
        mood: ["Peaceful", "Minimal"],
        orientation: "Landscape",
        price: "740",
        style: "Landscape",
        subject: "Nature",
        tags: [TEMP_TAG, "forest", "mist"],
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
    uid: `${DEMO_UID_PREFIX}ines-calloway`,
    username: "inescalloway",
    pieces: [
      {
        category: "Ceramic",
        description:
          "Wheel-thrown vessel with an ash glaze that breaks amber over the shoulder. Wood-fired over three days.",
        height: "12",
        imageId: "photo-1610701596007-11502861dcfa",
        medium: "Mixed Media",
        mood: ["Minimal", "Peaceful"],
        orientation: "Portrait",
        price: "540",
        style: "Wabi-sabi",
        subject: "Abstract",
        tags: [TEMP_TAG, "stoneware", "wood-fired"],
        title: "Vessel with Ash Glaze",
        width: "8",
        yearCreated: "2025",
      },
      {
        category: "Ceramic",
        description:
          "A matched pair of stoneware forms in an unglazed, sanded finish. Sold together.",
        height: "9",
        imageId: "photo-1493106641515-6b5631de4bb9",
        medium: "Mixed Media",
        mood: ["Minimal"],
        orientation: "Square",
        price: "380",
        style: "Modern",
        subject: "Abstract",
        tags: [TEMP_TAG, "stoneware", "pair"],
        title: "Stoneware Pair",
        width: "9",
        yearCreated: "2026",
      },
      {
        category: "Sculpture",
        description:
          "Small bronze study of a folded form, cast in an edition of 5 with a dark patina. Numbered and stamped.",
        height: "10",
        imageId: "photo-1554188248-986adbb73be4",
        medium: "Bronze",
        mood: ["Dramatic"],
        orientation: "Portrait",
        price: "2900",
        style: "Modern",
        subject: "Abstract",
        tags: [TEMP_TAG, "bronze", "edition"],
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
    uid: `${DEMO_UID_PREFIX}tomas-reyes`,
    username: "tomasreyes",
    pieces: [
      {
        category: "Painting",
        description:
          "First light on granite above the treeline. Oil on panel with a floating walnut frame.",
        height: "18",
        imageId: "photo-1506905925346-21bda4d32df4",
        medium: "Oil",
        mood: ["Dramatic", "Peaceful"],
        orientation: "Landscape",
        price: "1600",
        style: "Impressionist",
        subject: "Landscape",
        tags: [TEMP_TAG, "mountains", "plein-air"],
        title: "Sierra Morning",
        width: "24",
        yearCreated: "2025",
      },
      {
        category: "Painting",
        description:
          "The confluence in late spring, painted over two mornings on the bank. Oil on linen.",
        height: "24",
        imageId: "photo-1469474968028-56623f02e42e",
        medium: "Oil",
        mood: ["Peaceful", "Vibrant"],
        orientation: "Landscape",
        price: "2200",
        style: "Impressionist",
        subject: "Landscape",
        tags: [TEMP_TAG, "river", "spring"],
        title: "Two Rivers",
        width: "36",
        yearCreated: "2024",
      },
      {
        category: "Painting",
        description:
          "Low gold light across a fence line at dusk. A small oil sketch with a lot of air in it.",
        height: "12",
        imageId: "photo-1470071459604-3b5ec3a7fe05",
        medium: "Oil",
        mood: ["Peaceful"],
        orientation: "Landscape",
        price: "700",
        style: "Impressionist",
        subject: "Nature",
        tags: [TEMP_TAG, "dusk", "study"],
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
    uid: `${DEMO_UID_PREFIX}priya-anand`,
    username: "priyaanand",
    pieces: [
      {
        category: "Digital",
        description:
          "Generative composition grown from a season of local weather data, printed as a one-off giclée on baryta paper.",
        height: "28",
        imageId: "photo-1550684848-fac1c5b4e853",
        medium: "Digital",
        mood: ["Dark", "Dramatic"],
        orientation: "Portrait",
        price: "560",
        style: "Generative",
        subject: "Abstract",
        tags: [TEMP_TAG, "generative", "print"],
        title: "Signal Garden",
        width: "20",
        yearCreated: "2026",
      },
      {
        category: "Painting",
        description:
          "Collaged monsoon clouds over a graphite portrait, unified with a thin acrylic glaze.",
        height: "24",
        imageId: "photo-1536924940846-227afb31e2a5",
        medium: "Mixed Media",
        mood: ["Dramatic"],
        orientation: "Portrait",
        price: "1150",
        style: "Contemporary",
        subject: "Portrait",
        tags: [TEMP_TAG, "collage", "portrait"],
        title: "Monsoon Portrait",
        width: "18",
        yearCreated: "2025",
      },
      {
        category: "Drawing",
        description:
          "A flock rendered in ink and cut paper, pinned in loose formation under glass.",
        height: "16",
        imageId: "photo-1452570053594-1b985d6ea890",
        medium: "Mixed Media",
        mood: ["Joyful", "Minimal"],
        orientation: "Landscape",
        price: "420",
        style: "Contemporary",
        subject: "Animals",
        tags: [TEMP_TAG, "ink", "birds"],
        title: "Paper Birds",
        width: "20",
        yearCreated: "2024",
      },
    ],
  },
];

function buildItem(piece: DemoPiece): ListingItemDraft {
  const item = createEmptyListingItem();
  item.artworkDetails.title = piece.title;
  item.artworkDetails.description = piece.description;
  item.artworkDetails.category = piece.category;
  item.artworkDetails.medium = piece.medium;
  item.artworkDetails.style = piece.style;
  item.artworkDetails.subject = piece.subject;
  item.artworkDetails.mood = piece.mood;
  item.artworkDetails.orientation = piece.orientation;
  item.artworkDetails.tags = piece.tags;
  item.artworkDetails.yearCreated = piece.yearCreated;
  item.dimensions.width = piece.width;
  item.dimensions.height = piece.height;
  item.media.mainImageUrl = unsplash(piece.imageId);
  item.pricingInventory.availability = "original_available";
  item.pricingInventory.price = piece.price;
  item.salesVisibility.public = true;
  item.salesVisibility.draft = false;
  item.updatedAt = new Date().toISOString();
  return item;
}

function ensureE2EEnabled() {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json(
      { error: { code: "not-found", message: "Not found." } },
      { status: 404 }
    );
  }

  return null;
}

export async function POST() {
  const disabledResponse = ensureE2EEnabled();

  if (disabledResponse) {
    return disabledResponse;
  }

  const seeded: { listings: number; username: string }[] = [];

  for (const artist of DEMO_ARTISTS) {
    const profile = await seedE2EAccountProfile({
      bio: artist.bio,
      email: `${artist.username}@example.com`,
      firstName: artist.firstName,
      lastName: artist.lastName,
      location: artist.location,
      uid: artist.uid,
      username: artist.username,
    });

    const studio = createEmptyListingStudio({ includeStarterItem: false });
    studio.items = artist.pieces.map(buildItem);
    studio.shared.shippingAuthentication.processingTime = "3-5 business days";
    studio.shared.shippingAuthentication.domesticShipping = "50";
    studio.shared.shippingAuthentication.internationalShipping = "150";
    studio.updatedAt = new Date().toISOString();

    await updateE2EListingFlow(artist.uid, studio);
    await syncArtworkIndex(
      {
        artistName: buildProfileDisplayName(profile),
        artistUid: artist.uid,
        artistUsername: artist.username,
      },
      studio
    );

    seeded.push({ listings: studio.items.length, username: artist.username });
  }

  return NextResponse.json({ seeded, tag: TEMP_TAG });
}

/** Remove every listing tagged TEMP_TAG, wherever it lives. */
export async function DELETE() {
  const disabledResponse = ensureE2EEnabled();

  if (disabledResponse) {
    return disabledResponse;
  }

  const index = await listIndexedArtworks();
  const artistUids = new Set(
    index
      .filter((entry) => entry.tags.includes(TEMP_TAG))
      .map((entry) => entry.artistUid)
  );

  const removed: { remainingListings: number; uid: string }[] = [];

  for (const uid of artistUids) {
    const studio = await loadListingStudio(uid);

    if (!studio) {
      continue;
    }

    const remaining = studio.items.filter(
      (item) => !item.artworkDetails.tags.includes(TEMP_TAG)
    );
    studio.items = remaining;
    studio.updatedAt = new Date().toISOString();

    const profile = await loadAccountProfile(uid);
    const username = profile?.username ?? "";

    if (remaining.length > 0) {
      await updateE2EListingFlow(uid, studio);
    } else {
      await deleteE2EListingFlow(uid);
    }

    // Sync the (possibly empty) studio so the tagged entries leave the index.
    await syncArtworkIndex(
      {
        artistName: profile ? buildProfileDisplayName(profile) : "",
        artistUid: uid,
        artistUsername: username,
      },
      studio
    );

    // A seeded account with nothing left has no reason to stick around.
    if (remaining.length === 0 && uid.startsWith(DEMO_UID_PREFIX)) {
      await deleteE2EAccountProfile(uid);
    }

    removed.push({ remainingListings: remaining.length, uid });
  }

  return NextResponse.json({ removed, tag: TEMP_TAG });
}
