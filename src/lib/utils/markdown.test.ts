import { describe, it, expect } from 'vitest';
import { parseMarkdown, escapeHtml } from './markdown';

describe('markdown utilities', () => {
	describe('parseMarkdown', () => {
		it('should return empty string for empty input', () => {
			expect(parseMarkdown('')).toBe('');
			expect(parseMarkdown('   ')).toBe('');
		});

		it('should parse plain text', () => {
			const result = parseMarkdown('Hello World');
			expect(result).toContain('Hello World');
		});

		it('should parse bold text', () => {
			const result = parseMarkdown('**bold text**');
			expect(result).toContain('<strong>bold text</strong>');
		});

		it('should parse italic text', () => {
			const result = parseMarkdown('*italic text*');
			expect(result).toContain('<em>italic text</em>');
		});

		it('should parse unordered lists', () => {
			const result = parseMarkdown('- Item 1\n- Item 2');
			expect(result).toContain('<ul>');
			expect(result).toContain('<li>Item 1</li>');
			expect(result).toContain('<li>Item 2</li>');
			expect(result).toContain('</ul>');
		});

		it('should parse ordered lists', () => {
			const result = parseMarkdown('1. First\n2. Second');
			expect(result).toContain('<ol>');
			expect(result).toContain('<li>First</li>');
			expect(result).toContain('<li>Second</li>');
			expect(result).toContain('</ol>');
		});

		it('should convert line breaks with breaks option', () => {
			const result = parseMarkdown('Line 1\nLine 2');
			expect(result).toContain('<br');
		});

		it('should handle mixed formatting', () => {
			const result = parseMarkdown('**bold** and *italic*');
			expect(result).toContain('<strong>bold</strong>');
			expect(result).toContain('<em>italic</em>');
		});
	});

	describe('escapeHtml', () => {
		it('should escape ampersand', () => {
			expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
		});

		it('should escape less than', () => {
			expect(escapeHtml('a < b')).toBe('a &lt; b');
		});

		it('should escape greater than', () => {
			expect(escapeHtml('a > b')).toBe('a &gt; b');
		});

		it('should escape double quotes', () => {
			expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
		});

		it('should escape single quotes', () => {
			expect(escapeHtml("it's")).toBe('it&#39;s');
		});

		it('should escape multiple special characters', () => {
			expect(escapeHtml('<script>alert("xss")</script>')).toBe(
				'&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
			);
		});

		it('should return unchanged text with no special characters', () => {
			expect(escapeHtml('Hello World')).toBe('Hello World');
		});
	});
});
