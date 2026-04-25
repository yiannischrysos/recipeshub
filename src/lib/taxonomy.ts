export const ALLERGEN_EMOJI: Record<string, string> = {
  Nuts: "🌰",
  Gluten: "🌾",
  Dairy: "🥛",
  Eggs: "🥚",
  Seeds: "🌼",
  Peanuts: "🥜",
  Soy: "🌱",
  Lupin: "🌻",
  Celery: "🥬",
  Sulphites: "🍇",
  Fish: "🐟",
  PFAS: "🍑",
};

export const DIETARY_EMOJI: Record<string, string> = {
  Vegan: "🌿",
  Vegetarian: "🥕",
  "Lactose Free": "🧴",
  "Gluten Free": "🍞",
  "Nut Free": "🥜",
  None: "❌",
};

export const ALLERGENS = Object.keys(ALLERGEN_EMOJI);
export const DIETARY = Object.keys(DIETARY_EMOJI).filter((d) => d !== "None");
