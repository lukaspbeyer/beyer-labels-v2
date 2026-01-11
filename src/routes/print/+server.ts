/**
 * Print Server Route - Generate HTML for printing a single label
 * Supports multiple styles (Ghibli, Berlin) and portrait/landscape orientations
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PrintData, Label, LabelFormat, LabelStyle } from '$lib/utils/types';
import { getStyle, getFontSizeForFormat } from '$lib/utils/labelStyles';
import { needsContentRotation, getPhysicalDimensions } from '$lib/utils/labelFormats';
import { parseMarkdown, escapeHtml } from '$lib/utils/markdown';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: PrintData = await request.json();
		const { label, format, formatConfig, styleId } = data;

		if (!formatConfig) {
			return json({ error: 'Format configuration required' }, { status: 400 });
		}

		// Create grid with the single label at the specified position
		const fullGrid: (Label | null)[] = Array(formatConfig.grid.total).fill(null);
		if (format.position < formatConfig.grid.total) {
			fullGrid[format.position] = label;
		}

		// Generate the HTML with style support
		const html = generatePrintHTML(fullGrid, format, formatConfig, styleId);

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html'
			}
		});
	} catch (error) {
		console.error('Error generating print HTML:', error);
		return json({ error: 'Failed to generate print view' }, { status: 500 });
	}
};

/**
 * Get paper dimensions based on format configuration
 */
function getPaperDimensions(formatConfig: LabelFormat): { width: string; height: string } {
	const { size, orientation } = formatConfig.paper;

	// Standard ISO 216 paper sizes in mm
	const paperSizes: Record<string, { width: number; height: number }> = {
		A4: { width: 210, height: 297 },
		A5: { width: 148, height: 210 },
		A3: { width: 297, height: 420 },
		A6: { width: 105, height: 148 }
	};

	const dimensions = paperSizes[size];
	if (orientation === 'landscape') {
		return {
			width: `${dimensions.height}mm`,
			height: `${dimensions.width}mm`
		};
	}

	return {
		width: `${dimensions.width}mm`,
		height: `${dimensions.height}mm`
	};
}

/**
 * Generate CSS grid properties based on format configuration
 * For portrait formats, uses physical label dimensions
 */
function getGridCSS(formatConfig: LabelFormat): string {
	const { columns, rows } = formatConfig.grid;
	const paperDims = getPaperDimensions(formatConfig);

	// Use physical dimensions for grid (portrait content is rotated inside the cell)
	const physicalDims = getPhysicalDimensions(formatConfig.id);

	return `
    grid-template-columns: repeat(${columns}, ${physicalDims.width}mm);
    grid-template-rows: repeat(${rows}, ${physicalDims.height}mm);
    width: ${paperDims.width};
    height: ${paperDims.height};
  `;
}

/**
 * Build CSS styles from a LabelStyle object
 */
function buildStyleCSS(style: LabelStyle, formatConfig: LabelFormat) {
	const isSmallLabel = formatConfig.isSmallLabel || false;
	const headlineFontSize = getFontSizeForFormat(style, 'headline', isSmallLabel);
	const bodyFontSize = getFontSizeForFormat(style, 'body', isSmallLabel);

	return {
		headline: {
			fontFamily: style.fonts.headline.family,
			fontWeight: style.fonts.headline.weight,
			fontSize: headlineFontSize,
			lineHeight: style.fonts.headline.lineHeight,
			letterSpacing: style.fonts.headline.letterSpacing,
			textTransform: style.fonts.headline.textTransform,
			color: style.colors.headline
		},
		body: {
			fontFamily: style.fonts.body.family,
			fontWeight: style.fonts.body.weight,
			fontSize: bodyFontSize,
			lineHeight: style.fonts.body.lineHeight,
			letterSpacing: style.fonts.body.letterSpacing,
			color: style.colors.body,
			marginTop: style.typography.bodyMarginTop
		},
		container: {
			padding: style.typography.containerPadding,
			textAlign: style.typography.containerTextAlign
		},
		pictogram: {
			height: style.typography.pictogramHeight,
			marginBottom: style.typography.pictogramMarginBottom
		},
		markdown: {
			paragraphMargin: style.typography.markdownParagraphMargin
		}
	};
}

/**
 * Generate portrait rotation CSS if needed
 */
function getPortraitRotationCSS(formatConfig: LabelFormat): string {
	if (!needsContentRotation(formatConfig.id)) {
		return '';
	}

	const physicalDims = getPhysicalDimensions(formatConfig.id);

	// Rotate content 90° and swap dimensions
	return `
    .label-content {
      transform: rotate(90deg);
      transform-origin: center center;
      width: ${physicalDims.height}mm;
      height: ${physicalDims.width}mm;
    }
  `;
}

function generatePrintHTML(
	labels: (Label | null)[],
	format: { size: string; position: number },
	formatConfig: LabelFormat,
	styleId?: string
): string {
	const gridClass = `grid-${format.size.replace(/[x.]/g, '-')}`;
	const paperDims = getPaperDimensions(formatConfig);
	const gridCSS = getGridCSS(formatConfig);

	// Get style from registry
	const style = getStyle(styleId || 'ghibli');
	const styles = buildStyleCSS(style, formatConfig);

	// Get rotation CSS for portrait formats
	const rotationCSS = getPortraitRotationCSS(formatConfig);

	return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Beyer Labels - Drucken (Strg+P / Cmd+P zum Drucken)</title>
  <link href="${style.googleFontsUrl}" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: ${formatConfig.paper.size} ${formatConfig.paper.orientation};
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: ${style.fonts.body.family};
      color: ${style.colors.body};
    }

    .print-page {
      width: ${paperDims.width};
      height: ${paperDims.height};
      padding: 0;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .label-grid {
      display: grid;
      gap: 0;
      padding: 0;
      margin: 0;
    }

    .${gridClass} {${gridCSS}
    }

    .label-cell {
      border: 0.1mm dashed #e0e0e0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .label-content {
      width: 100%;
      height: 100%;
      padding: ${styles.container.padding};
      display: flex;
      flex-direction: column;
      align-items: ${styles.container.textAlign === 'left' ? 'flex-start' : styles.container.textAlign === 'right' ? 'flex-end' : 'center'};
      justify-content: center;
      gap: 0;
      box-sizing: border-box;
      text-align: ${styles.container.textAlign};
    }

    ${rotationCSS}

    .label-text {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: ${styles.container.textAlign};
    }

    .label-main {
      font-family: ${styles.headline.fontFamily};
      font-weight: ${styles.headline.fontWeight};
      font-size: ${styles.headline.fontSize};
      line-height: ${styles.headline.lineHeight};
      letter-spacing: ${styles.headline.letterSpacing};
      text-transform: ${styles.headline.textTransform};
      color: ${styles.headline.color};
      margin-bottom: 0;
    }

    .label-sub {
      font-family: ${styles.body.fontFamily};
      font-weight: ${styles.body.fontWeight};
      font-size: ${styles.body.fontSize};
      line-height: ${styles.body.lineHeight};
      letter-spacing: ${styles.body.letterSpacing};
      color: ${styles.body.color};
      margin-top: ${styles.body.marginTop};
    }

    /* Markdown styles for subtitle */
    .label-sub p {
      margin: 0 0 ${styles.markdown.paragraphMargin} 0;
    }

    .label-sub p:last-child {
      margin-bottom: 0;
    }

    .label-sub ul, .label-sub ol {
      margin: 0.5em 0;
      padding-left: 1.2em;
    }

    /* Avoid double spacing: list doesn't add top margin after paragraph */
    .label-sub p + ul,
    .label-sub p + ol {
      margin-top: 0;
    }

    .label-sub li {
      margin: 0.1em 0;
    }

    /* Full paragraph margin after list */
    .label-sub ul + p,
    .label-sub ol + p {
      margin-top: ${styles.markdown.paragraphMargin};
    }

    .label-sub strong {
      font-weight: 700;
    }

    .label-sub em {
      font-style: italic;
    }

    .label-pictogram {
      display: flex;
      align-items: center;
      justify-content: ${styles.container.textAlign === 'left' ? 'flex-start' : styles.container.textAlign === 'right' ? 'flex-end' : 'center'};
      flex-shrink: 0;
      overflow: hidden;
      width: ${formatConfig.pictogram.width || 35}mm;
      height: ${styles.pictogram.height};
      margin-bottom: ${styles.pictogram.marginBottom};
    }

    .label-pictogram img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      filter: grayscale(1) contrast(1.2);
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .print-page {
        margin: 0;
        padding: 0;
        page-break-after: avoid;
        page-break-inside: avoid;
      }

      .label-cell {
        border: none;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-inside: avoid;
      }

      .label-grid {
        margin: 0;
        padding: 0;
      }
    }

    @media screen {
      body {
        background: #f0f0f0;
        display: flex;
        justify-content: center;
        padding: 20px;
      }

      .print-page {
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
  <div class="print-page">
    <div class="label-grid ${gridClass}">
      ${labels
				.map(
					(label) => `
        <div class="label-cell">
          ${
						label
							? `
            <div class="label-content">
              ${
								label.pictogram?.position === 'left' && label.pictogram?.imageUrl
									? `
                <div class="label-pictogram">
                  <img src="${label.pictogram.imageUrl}" alt="">
                </div>
              `
									: ''
							}
              <div class="label-text">
                <div class="label-main">${escapeHtml(label.mainText || '')}</div>
                ${label.subText ? `<div class="label-sub">${parseMarkdown(label.subText)}</div>` : ''}
              </div>
              ${
								label.pictogram?.position === 'right' && label.pictogram?.imageUrl
									? `
                <div class="label-pictogram">
                  <img src="${label.pictogram.imageUrl}" alt="">
                </div>
              `
									: ''
							}
            </div>
          `
							: ''
					}
        </div>
      `
				)
				.join('')}
    </div>
  </div>
</body>
</html>`;
}
