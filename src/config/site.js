export const site = {
  origin: "https://bioassaycraft.com",
  name: "BioassayCraft",
};

export const canonicalUrl = (path) => new URL(path, site.origin).href;
