/**
 * @template {{ id: string, data: { draft?: boolean, date: Date } }} T
 * @param {T[]} posts
 * @returns {T[]}
 */
export function publishedPosts(posts) {
  return posts.filter(post => !post.data.draft).sort((a, b) =>
    b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}
