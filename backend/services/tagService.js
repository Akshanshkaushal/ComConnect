const normalizeTags = (tags = []) =>
  [...new Set(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag).trim().replace(/^#/, "").toLowerCase())
      .filter(Boolean)
      .slice(0, 12)
  )];

const extractTags = (text = "") =>
  normalizeTags(
    [...String(text).matchAll(/#([a-z0-9][a-z0-9_-]{1,39})/gi)].map(
      (match) => match[1]
    )
  );

module.exports = { extractTags, normalizeTags };
