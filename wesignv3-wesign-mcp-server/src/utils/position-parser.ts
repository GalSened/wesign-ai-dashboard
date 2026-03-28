/**
 * Natural Language Position Parser for PDF Field Positioning
 * Converts natural language descriptions to exact PDF coordinates
 */

export interface PositionResult {
  x: number;
  y: number;
  confidence: 'high' | 'medium' | 'low';
  explanation?: string;
}

export interface FieldDimensions {
  width: number;
  height: number;
}

export interface PageDimensions {
  width: number;
  height: number;
}

// Standard US Letter size in points (72 points = 1 inch)
const DEFAULT_PAGE = {
  width: 612,  // 8.5 inches
  height: 792  // 11 inches
};

// Standard field sizes
const FIELD_SIZES = {
  signature: { width: 200, height: 50 },
  initials: { width: 100, height: 30 },
  date: { width: 150, height: 30 },
  text: { width: 200, height: 30 },
  checkbox: { width: 20, height: 20 }
};

// Margin from edges
const MARGIN = {
  top: 50,
  bottom: 50,
  left: 50,
  right: 50
};

/**
 * Parse natural language position description and convert to coordinates
 */
export function parsePosition(
  description: string,
  fieldType: string = 'signature',
  pageDimensions: PageDimensions = DEFAULT_PAGE,
  referenceText?: string
): PositionResult {

  const desc = description.toLowerCase().trim();
  const fieldSize = FIELD_SIZES[fieldType as keyof typeof FIELD_SIZES] || FIELD_SIZES.signature;

  console.error(`[position-parser] Input: "${description}", type: ${fieldType}, page: ${pageDimensions.width}x${pageDimensions.height}, fieldSize: ${fieldSize.width}x${fieldSize.height}`);

  // 1. Check for absolute grid positions (highest confidence)
  const gridPosition = parseGridPosition(desc, pageDimensions, fieldSize);
  if (gridPosition) {
    console.error(`[position-parser] Grid match found: x=${gridPosition.x}, y=${gridPosition.y}`);
    return { ...gridPosition, confidence: 'high' };
  }

  // 2. Check for relative text positioning (medium-high confidence)
  if (referenceText) {
    const textPosition = parseRelativeToText(desc, referenceText, pageDimensions, fieldSize);
    if (textPosition) {
      return { ...textPosition, confidence: 'medium' };
    }
  }

  // 3. Check for directional positioning (medium confidence)
  const directionalPosition = parseDirectionalPosition(desc, pageDimensions, fieldSize);
  if (directionalPosition) {
    return { ...directionalPosition, confidence: 'medium' };
  }

  // 4. Default fallback: bottom center
  return {
    x: (pageDimensions.width - fieldSize.width) / 2,
    y: pageDimensions.height - MARGIN.bottom - fieldSize.height,
    confidence: 'low',
    explanation: 'Could not parse position, using default: bottom center'
  };
}

/**
 * Parse grid-based positions: "top-left", "bottom-center", "middle-right", etc.
 */
function parseGridPosition(
  desc: string,
  page: PageDimensions,
  field: FieldDimensions
): PositionResult | null {

  // Define grid positions
  const positions: { [key: string]: { x: number, y: number } } = {
    // Top row
    'top-left': { x: MARGIN.left, y: MARGIN.top },
    'top-center': { x: (page.width - field.width) / 2, y: MARGIN.top },
    'top-centre': { x: (page.width - field.width) / 2, y: MARGIN.top },
    'top-middle': { x: (page.width - field.width) / 2, y: MARGIN.top },
    'top-right': { x: page.width - MARGIN.right - field.width, y: MARGIN.top },
    'upper-left': { x: MARGIN.left, y: MARGIN.top },
    'upper-center': { x: (page.width - field.width) / 2, y: MARGIN.top },
    'upper-right': { x: page.width - MARGIN.right - field.width, y: MARGIN.top },

    // Middle row
    'middle-left': { x: MARGIN.left, y: (page.height - field.height) / 2 },
    'middle-center': { x: (page.width - field.width) / 2, y: (page.height - field.height) / 2 },
    'middle-centre': { x: (page.width - field.width) / 2, y: (page.height - field.height) / 2 },
    'middle-right': { x: page.width - MARGIN.right - field.width, y: (page.height - field.height) / 2 },
    'center-left': { x: MARGIN.left, y: (page.height - field.height) / 2 },
    'center-center': { x: (page.width - field.width) / 2, y: (page.height - field.height) / 2 },
    'center-right': { x: page.width - MARGIN.right - field.width, y: (page.height - field.height) / 2 },
    'centre': { x: (page.width - field.width) / 2, y: (page.height - field.height) / 2 },
    'center': { x: (page.width - field.width) / 2, y: (page.height - field.height) / 2 },

    // Bottom row
    'bottom-left': { x: MARGIN.left, y: page.height - MARGIN.bottom - field.height },
    'bottom-center': { x: (page.width - field.width) / 2, y: page.height - MARGIN.bottom - field.height },
    'bottom-centre': { x: (page.width - field.width) / 2, y: page.height - MARGIN.bottom - field.height },
    'bottom-middle': { x: (page.width - field.width) / 2, y: page.height - MARGIN.bottom - field.height },
    'bottom-right': { x: page.width - MARGIN.right - field.width, y: page.height - MARGIN.bottom - field.height },
    'lower-left': { x: MARGIN.left, y: page.height - MARGIN.bottom - field.height },
    'lower-center': { x: (page.width - field.width) / 2, y: page.height - MARGIN.bottom - field.height },
    'lower-right': { x: page.width - MARGIN.right - field.width, y: page.height - MARGIN.bottom - field.height },

    // Single word positions
    'top': { x: (page.width - field.width) / 2, y: MARGIN.top },
    'bottom': { x: (page.width - field.width) / 2, y: page.height - MARGIN.bottom - field.height },
    'left': { x: MARGIN.left, y: (page.height - field.height) / 2 },
    'right': { x: page.width - MARGIN.right - field.width, y: (page.height - field.height) / 2 }
  };

  // Normalize description for matching
  const normalized = desc
    .replace(/\s+/g, '-')
    .replace(/at\s+the\s+/g, '')
    .replace(/in\s+the\s+/g, '')
    .replace(/on\s+the\s+/g, '');

  // Sort keys by length (longest first) to match "bottom-center" before "center"
  const sortedKeys = Object.keys(positions).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      const pos = positions[key];
      return {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        confidence: 'high',
        explanation: `Positioned at ${key.replace('-', ' ')}`
      };
    }
  }

  return null;
}

/**
 * Parse relative positioning to text: "above", "below", "left of", "right of", "in line with"
 */
function parseRelativeToText(
  desc: string,
  referenceText: string,
  page: PageDimensions,
  field: FieldDimensions
): PositionResult | null {

  // This is a placeholder - in real implementation, you would:
  // 1. Extract text from PDF to find reference text coordinates
  // 2. Calculate position relative to that text

  // For now, we'll use estimated positions based on common document structure
  const textY = page.height * 0.3; // Assume text is in upper third
  const textX = MARGIN.left; // Assume text starts at left margin
  const textWidth = page.width - MARGIN.left - MARGIN.right;

  // Check for positioning keywords
  if (desc.includes('below') || desc.includes('under') || desc.includes('beneath')) {
    return {
      x: textX,
      y: textY + 40, // 40 points below text
      confidence: 'medium',
      explanation: `Positioned below "${referenceText}"`
    };
  }

  if (desc.includes('above') || desc.includes('over')) {
    return {
      x: textX,
      y: textY - field.height - 20, // 20 points above text
      confidence: 'medium',
      explanation: `Positioned above "${referenceText}"`
    };
  }

  if (desc.includes('left of') || desc.includes('to the left')) {
    return {
      x: textX - field.width - 20,
      y: textY,
      confidence: 'medium',
      explanation: `Positioned to the left of "${referenceText}"`
    };
  }

  if (desc.includes('right of') || desc.includes('to the right')) {
    return {
      x: textX + textWidth + 20,
      y: textY,
      confidence: 'medium',
      explanation: `Positioned to the right of "${referenceText}"`
    };
  }

  if (desc.includes('in line with') || desc.includes('inline') || desc.includes('same line')) {
    return {
      x: textX + textWidth + 10,
      y: textY,
      confidence: 'medium',
      explanation: `Positioned in line with "${referenceText}"`
    };
  }

  return null;
}

/**
 * Parse directional descriptions: "on the left side", "near the top", etc.
 */
function parseDirectionalPosition(
  desc: string,
  page: PageDimensions,
  field: FieldDimensions
): PositionResult | null {

  let x = (page.width - field.width) / 2; // Default to center
  let y = (page.height - field.height) / 2; // Default to middle
  let matched = false;

  // Vertical positioning
  if (desc.includes('top') || desc.includes('upper') || desc.includes('above')) {
    y = MARGIN.top;
    matched = true;
  } else if (desc.includes('bottom') || desc.includes('lower') || desc.includes('below')) {
    y = page.height - MARGIN.bottom - field.height;
    matched = true;
  } else if (desc.includes('middle') || desc.includes('center') || desc.includes('centre')) {
    y = (page.height - field.height) / 2;
    matched = true;
  }

  // Horizontal positioning
  if (desc.includes('left')) {
    x = MARGIN.left;
    matched = true;
  } else if (desc.includes('right')) {
    x = page.width - MARGIN.right - field.width;
    matched = true;
  } else if (desc.includes('center') || desc.includes('centre') || desc.includes('middle')) {
    x = (page.width - field.width) / 2;
    matched = true;
  }

  if (matched) {
    return {
      x: Math.round(x),
      y: Math.round(y),
      confidence: 'medium',
      explanation: 'Positioned using directional keywords'
    };
  }

  return null;
}

/**
 * Get standard field size for a field type
 */
export function getFieldSize(fieldType: string): FieldDimensions {
  return FIELD_SIZES[fieldType as keyof typeof FIELD_SIZES] || FIELD_SIZES.signature;
}

/**
 * Validate that coordinates are within page bounds
 */
export function validateCoordinates(
  x: number,
  y: number,
  fieldSize: FieldDimensions,
  page: PageDimensions = DEFAULT_PAGE
): boolean {
  return (
    x >= 0 &&
    y >= 0 &&
    x + fieldSize.width <= page.width &&
    y + fieldSize.height <= page.height
  );
}

/**
 * Parse all common natural language variations
 */
export function parseNaturalLanguage(description: string): {
  position: string;
  confidence: string;
  alternatives: string[];
} {
  const desc = description.toLowerCase();
  const alternatives: string[] = [];

  // Extract all possible position interpretations
  if (desc.includes('bottom') && desc.includes('left')) {
    return { position: 'bottom-left', confidence: 'high', alternatives: ['lower-left'] };
  }
  if (desc.includes('bottom') && desc.includes('right')) {
    return { position: 'bottom-right', confidence: 'high', alternatives: ['lower-right'] };
  }
  if (desc.includes('bottom') && (desc.includes('center') || desc.includes('middle'))) {
    return { position: 'bottom-center', confidence: 'high', alternatives: ['bottom-middle'] };
  }
  if (desc.includes('top') && desc.includes('left')) {
    return { position: 'top-left', confidence: 'high', alternatives: ['upper-left'] };
  }
  if (desc.includes('top') && desc.includes('right')) {
    return { position: 'top-right', confidence: 'high', alternatives: ['upper-right'] };
  }
  if (desc.includes('top') && (desc.includes('center') || desc.includes('middle'))) {
    return { position: 'top-center', confidence: 'high', alternatives: ['top-middle', 'upper-center'] };
  }

  // Single direction
  if (desc.includes('bottom')) {
    return { position: 'bottom-center', confidence: 'medium', alternatives: ['bottom'] };
  }
  if (desc.includes('top')) {
    return { position: 'top-center', confidence: 'medium', alternatives: ['top'] };
  }
  if (desc.includes('left')) {
    return { position: 'middle-left', confidence: 'medium', alternatives: ['left'] };
  }
  if (desc.includes('right')) {
    return { position: 'middle-right', confidence: 'medium', alternatives: ['right'] };
  }
  if (desc.includes('center') || desc.includes('centre') || desc.includes('middle')) {
    return { position: 'center', confidence: 'medium', alternatives: ['middle-center'] };
  }

  return { position: 'bottom-center', confidence: 'low', alternatives: [] };
}