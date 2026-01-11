/**
 * Markdown Utilities - Parse markdown to HTML for label subtitles
 * Uses 'marked' library with sanitization for safe HTML output
 */
import { marked } from 'marked';

// Configure marked for label-friendly output
marked.setOptions({
	breaks: true, // Convert \n to <br>
	gfm: true // GitHub Flavored Markdown (tables, strikethrough, etc.)
});

/**
 * Parse markdown string to HTML
 * Configured for label subtitles: compact output, line breaks preserved
 */
export function parseMarkdown(text: string): string {
	if (!text || text.trim() === '') {
		return '';
	}

	// Parse markdown to HTML
	const html = marked.parse(text, { async: false }) as string;

	// Clean up: remove wrapping <p> tags for inline content
	// Keep them for multi-paragraph content
	const trimmed = html.trim();

	return trimmed;
}

/**
 * Escape HTML special characters (for non-markdown content)
 */
export function escapeHtml(text: string): string {
	const htmlEscapes: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};

	return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}
