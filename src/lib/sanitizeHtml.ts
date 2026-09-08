import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize third-party HTML (Google Books / Open Library descriptions)
 * before rendering via dangerouslySetInnerHTML.
 *
 * Google Books `volumeInfo.description` contains publisher-supplied HTML
 * (<p>, <br>, <b>, <i>, ...). Open Library descriptions are also
 * external strings. Rendering them unsanitized allows stored XSS if an
 * upstream record contains <script>, <img onerror>, <svg onload>,
 * javascript: URIs, etc.
 *
 * isomorphic-dompurify works during both SSR prerender and client render
 * (plain `dompurify` requires `window` and breaks server components).
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty);
}
