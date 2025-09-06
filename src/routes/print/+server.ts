/**
 * Print Server Route - Generate HTML for printing a single label
 * Simplified for single-label architecture
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PrintData, Label, LabelFormat } from '$lib/utils/types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: PrintData = await request.json();
    const { label, format, formatConfig } = data;

    if (!formatConfig) {
      return json({ error: 'Format configuration required' }, { status: 400 });
    }

    // Create grid with the single label at the specified position
    const fullGrid: (Label | null)[] = Array(formatConfig.grid.total).fill(null);
    if (format.position < formatConfig.grid.total) {
      fullGrid[format.position] = label;
    }

    // Generate the HTML
    const html = generatePrintHTML(fullGrid, format, formatConfig);
    
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
  const paperSizes = {
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
 */
function getGridCSS(formatConfig: LabelFormat): string {
  const { columns, rows } = formatConfig.grid;
  const { width, height } = formatConfig.dimensions;
  const paperDims = getPaperDimensions(formatConfig);
  
  return `
    grid-template-columns: repeat(${columns}, ${width}mm);
    grid-template-rows: repeat(${rows}, ${height}mm);
    width: ${paperDims.width};
    height: ${paperDims.height};
  `;
}

function generatePrintHTML(labels: (Label | null)[], format: any, formatConfig: LabelFormat): string {
  const gridClass = `grid-${format.size.replace(/[x.]/g, '-')}`;
  const paperDims = getPaperDimensions(formatConfig);
  const gridCSS = getGridCSS(formatConfig);
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Beyer Labels - Drucken (Strg+P / Cmd+P zum Drucken)</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400&family=Noto+Sans:wght@400&display=swap" rel="stylesheet">
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
      font-family: "Noto Sans", sans-serif;
      color: #3E342E;
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
      padding: ${formatConfig.id === '105x74' ? '4mm' : '6mm'};
      display: flex;
      align-items: flex-start;
      gap: ${formatConfig.id === '105x74' ? '3.2mm' : '4.8mm'};
      box-sizing: border-box;
    }
    
    .label-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding-top: ${formatConfig.id === '105x74' ? '4mm' : '2mm'};
    }
    
    .label-main {
      font-family: "Sora", sans-serif;
      font-size: ${formatConfig.typography.mainSize};
      font-weight: 400;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #3E342E;
      margin-bottom: 6px;
      line-height: 1.2;
    }
    
    .label-sub {
      font-family: "Noto Sans", sans-serif;
      font-size: ${formatConfig.typography.subSize};
      color: #7D6B5D;
      line-height: 1.4;
    }
    
    .label-pictogram {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      width: ${formatConfig.pictogram.width || 35}mm;
      height: ${formatConfig.pictogram.maxHeight || 67}mm;
    }
    
    .label-pictogram img {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top center;
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
      ${labels.map((label, index) => `
        <div class="label-cell">
          ${label ? `
            <div class="label-content">
              ${label.pictogram?.position === 'left' && label.pictogram?.imageUrl ? `
                <div class="label-pictogram">
                  <img src="${label.pictogram.imageUrl}" alt="">
                </div>
              ` : ''}
              <div class="label-text">
                <div class="label-main">${label.mainText || ''}</div>
                ${label.subText ? `<div class="label-sub">${label.subText}</div>` : ''}
              </div>
              ${label.pictogram?.position === 'right' && label.pictogram?.imageUrl ? `
                <div class="label-pictogram">
                  <img src="${label.pictogram.imageUrl}" alt="">
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
}