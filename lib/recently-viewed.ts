const RECENTLY_VIEWED_KEY = 'oneposters-recently-viewed'
const RECENTLY_VIEWED_LIMIT = 8

export function readRecentlyViewed(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === 'string') : []
  } catch {
    return []
  }
}

export function trackRecentlyViewed(slug: string) {
  const next = [slug, ...readRecentlyViewed().filter(item => item !== slug)].slice(0, RECENTLY_VIEWED_LIMIT)
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('recently-viewed-updated'))
}
