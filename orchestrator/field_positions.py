"""
WeSign AI - Signature Field Position Helper
Provides predefined field positions for easy signature placement
"""

from typing import Dict, List, Optional
from enum import Enum

class FieldPosition(str, Enum):
    """Predefined field positions on a document"""
    TOP_LEFT = "top-left"
    CENTER_LEFT = "center-left"
    BOTTOM_LEFT = "bottom-left"
    TOP_RIGHT = "top-right"
    CENTER_RIGHT = "center-right"
    BOTTOM_RIGHT = "bottom-right"

class FieldType(int, Enum):
    """WeSign field types"""
    SIGNATURE = 1
    INITIAL = 2
    TEXT = 3
    DATE = 4
    CHECKBOX = 5

# Standard field dimensions
STANDARD_FIELD_WIDTH = 200
STANDARD_FIELD_HEIGHT = 50

# Predefined position coordinates (for standard letter size: 612x792 points)
FIELD_POSITION_COORDS = {
    FieldPosition.TOP_LEFT: {"x": 50, "y": 100},
    FieldPosition.CENTER_LEFT: {"x": 50, "y": 370},
    FieldPosition.BOTTOM_LEFT: {"x": 50, "y": 650},
    FieldPosition.TOP_RIGHT: {"x": 350, "y": 100},
    FieldPosition.CENTER_RIGHT: {"x": 350, "y": 370},
    FieldPosition.BOTTOM_RIGHT: {"x": 350, "y": 650},
}

POSITION_LABELS = {
    FieldPosition.TOP_LEFT: "Top Left",
    FieldPosition.CENTER_LEFT: "Center Left",
    FieldPosition.BOTTOM_LEFT: "Bottom Left",
    FieldPosition.TOP_RIGHT: "Top Right",
    FieldPosition.CENTER_RIGHT: "Center Right",
    FieldPosition.BOTTOM_RIGHT: "Bottom Right",
}


def create_field(
    position: str,
    page_number: int = 1,
    field_type: int = FieldType.SIGNATURE,
    width: Optional[int] = None,
    height: Optional[int] = None
) -> Dict:
    """
    Create a signature field object from a position name

    Args:
        position: Position name (e.g., "top-left", "bottom-right")
        page_number: Page number (1-based)
        field_type: Type of field (1=Signature, 2=Initial, 3=Text, 4=Date, 5=Checkbox)
        width: Custom field width (default: 200)
        height: Custom field height (default: 50)

    Returns:
        Dictionary with field coordinates and properties

    Example:
        >>> field = create_field("bottom-right", page_number=1)
        >>> print(field)
        {'x': 350, 'y': 650, 'width': 200, 'height': 50, 'pageNumber': 1, 'fieldType': 1}
    """
    # Normalize position name
    position = position.lower().replace("_", "-").replace(" ", "-")

    # Get coordinates
    if position not in FIELD_POSITION_COORDS:
        raise ValueError(
            f"Invalid position: {position}. "
            f"Valid positions: {', '.join(FIELD_POSITION_COORDS.keys())}"
        )

    coords = FIELD_POSITION_COORDS[position].copy()

    # Add dimensions
    coords["width"] = width or STANDARD_FIELD_WIDTH
    coords["height"] = height or STANDARD_FIELD_HEIGHT
    coords["pageNumber"] = page_number
    coords["fieldType"] = field_type

    return coords


def create_fields_for_pages(
    position: str,
    num_pages: int,
    field_type: int = FieldType.SIGNATURE
) -> List[Dict]:
    """
    Create signature fields for multiple pages at the same position

    Args:
        position: Position name (e.g., "bottom-right")
        num_pages: Number of pages
        field_type: Type of field (default: SIGNATURE)

    Returns:
        List of field dictionaries, one per page

    Example:
        >>> fields = create_fields_for_pages("bottom-right", 3)
        >>> len(fields)
        3
        >>> fields[0]['pageNumber']
        1
        >>> fields[2]['pageNumber']
        3
    """
    return [
        create_field(position, page_number=page, field_type=field_type)
        for page in range(1, num_pages + 1)
    ]


def get_position_description(position: str) -> str:
    """
    Get human-readable description of a position

    Args:
        position: Position name

    Returns:
        Descriptive label

    Example:
        >>> get_position_description("top-left")
        'Top Left'
    """
    position = position.lower().replace("_", "-").replace(" ", "-")
    return POSITION_LABELS.get(position, position.title())


def list_available_positions() -> Dict[str, Dict]:
    """
    Get all available positions with their coordinates

    Returns:
        Dictionary mapping position names to coordinate info

    Example:
        >>> positions = list_available_positions()
        >>> positions['top-left']
        {'x': 50, 'y': 100, 'label': 'Top Left'}
    """
    return {
        pos: {
            **coords,
            "label": POSITION_LABELS[pos]
        }
        for pos, coords in FIELD_POSITION_COORDS.items()
    }


# Natural language position parsing
POSITION_ALIASES = {
    # Top
    "top left": FieldPosition.TOP_LEFT,
    "upper left": FieldPosition.TOP_LEFT,
    "top-left": FieldPosition.TOP_LEFT,
    "topleft": FieldPosition.TOP_LEFT,

    "top right": FieldPosition.TOP_RIGHT,
    "upper right": FieldPosition.TOP_RIGHT,
    "top-right": FieldPosition.TOP_RIGHT,
    "topright": FieldPosition.TOP_RIGHT,

    # Center
    "center left": FieldPosition.CENTER_LEFT,
    "middle left": FieldPosition.CENTER_LEFT,
    "center-left": FieldPosition.CENTER_LEFT,
    "centerleft": FieldPosition.CENTER_LEFT,
    "left center": FieldPosition.CENTER_LEFT,

    "center right": FieldPosition.CENTER_RIGHT,
    "middle right": FieldPosition.CENTER_RIGHT,
    "center-right": FieldPosition.CENTER_RIGHT,
    "centerright": FieldPosition.CENTER_RIGHT,
    "right center": FieldPosition.CENTER_RIGHT,

    # Bottom
    "bottom left": FieldPosition.BOTTOM_LEFT,
    "lower left": FieldPosition.BOTTOM_LEFT,
    "bottom-left": FieldPosition.BOTTOM_LEFT,
    "bottomleft": FieldPosition.BOTTOM_LEFT,

    "bottom right": FieldPosition.BOTTOM_RIGHT,
    "lower right": FieldPosition.BOTTOM_RIGHT,
    "bottom-right": FieldPosition.BOTTOM_RIGHT,
    "bottomright": FieldPosition.BOTTOM_RIGHT,
}


def parse_position_from_text(text: str) -> Optional[str]:
    """
    Extract position from natural language text

    Args:
        text: User input text

    Returns:
        Normalized position name or None if not found

    Example:
        >>> parse_position_from_text("I want it at the top left")
        'top-left'
        >>> parse_position_from_text("place signature bottom right corner")
        'bottom-right'
    """
    text_lower = text.lower()

    for alias, position in POSITION_ALIASES.items():
        if alias in text_lower:
            return position

    return None


if __name__ == "__main__":
    # Demo usage
    print("=== WeSign Field Position Helper ===\n")

    print("1. Create a single field:")
    field = create_field("bottom-right", page_number=1)
    print(f"   {field}\n")

    print("2. Create fields for 3 pages:")
    fields = create_fields_for_pages("bottom-left", 3)
    for i, f in enumerate(fields, 1):
        print(f"   Page {i}: x={f['x']}, y={f['y']}")
    print()

    print("3. List all available positions:")
    positions = list_available_positions()
    for pos, info in positions.items():
        print(f"   {info['label']}: x={info['x']}, y={info['y']}")
    print()

    print("4. Parse natural language:")
    test_phrases = [
        "Add signature at bottom right",
        "I want it top left corner",
        "Place in the middle left side"
    ]
    for phrase in test_phrases:
        position = parse_position_from_text(phrase)
        if position:
            label = get_position_description(position)
            coords = FIELD_POSITION_COORDS[position]
            print(f"   '{phrase}' → {label} (x={coords['x']}, y={coords['y']})")
