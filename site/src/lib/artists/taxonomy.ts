/**
 * The controlled vocabulary a listing is described with.
 *
 * The listing studio writes these values onto every artwork, and the public
 * browse and homepage surfaces read them back to build category tiles and
 * filters. Keeping the lists here means the two sides cannot drift into
 * offering categories nothing was ever listed under.
 */
export const CATEGORY_OPTIONS = [
  "Painting",
  "Drawing",
  "Sculpture",
  "Photography",
  "Digital",
  "Textile",
  "Ceramic",
];

export const MEDIUM_OPTIONS = [
  "Oil",
  "Acrylic",
  "Watercolor",
  "Mixed Media",
  "Digital",
  "Bronze",
  "Resin",
  "Film",
];

export const SUBJECT_OPTIONS = [
  "Landscape",
  "Portrait",
  "Animals",
  "Abstract",
  "Nature",
  "Cityscape",
  "Faith",
];

export const ORIENTATION_OPTIONS = ["Portrait", "Landscape", "Square"];

export const COLOR_OPTIONS = ["Blue", "White", "Gold", "Red", "Green", "Black"];

export const ROOM_OPTIONS = [
  "Living Room",
  "Bedroom",
  "Office",
  "Kitchen",
  "Hotel",
  "Restaurant",
];

export const MOOD_OPTIONS = [
  "Peaceful",
  "Dramatic",
  "Joyful",
  "Spiritual",
  "Dark",
  "Minimal",
  "Vibrant",
];

export const THEME_OPTIONS = [
  "Faith",
  "Nature",
  "Animals",
  "Travel",
  "Family",
  "Love",
  "Oceans",
  "Mountains",
];

export const MEDIUM_DETAIL_OPTIONS = [
  "Oil",
  "Acrylic",
  "Mixed Media",
  "Gouache",
  "Digital",
  "Film",
  "Giclee",
  "Wood",
  "Stone",
  "Resin",
];

export const FINISH_OPTIONS = ["Matte", "Satin", "Gloss", "Lustre"];

export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD"];
