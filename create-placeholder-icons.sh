#!/bin/bash

# Create placeholder icons for the Firefox extension
# This script creates simple placeholder icons if ImageMagick is not available

echo "Creating placeholder icons for YouTube Watch Later Cleaner..."

# Create icons directory if it doesn't exist
mkdir -p icons

# Check if ImageMagick's convert command is available
if command -v convert &> /dev/null; then
    echo "ImageMagick found. Creating high-quality icons..."
    
    # Create a blue square with white play triangle for each size
    for size in 16 32 48 96; do
        convert -size ${size}x${size} xc:#1a73e8 \
            -fill white \
            -draw "polygon $((size/3)),$((size/4)) $((size/3)),$((3*size/4)) $((2*size/3)),$((size/2))" \
            icons/icon-${size}.png
        echo "Created icons/icon-${size}.png"
    done
    
else
    echo "ImageMagick not found. Creating basic placeholder icons..."
    echo "You can replace these with proper icons later or use the create-icons.html file."
    
    # Create a simple base64 encoded 1x1 blue pixel PNG for each size
    # This is a fallback method that creates minimal valid PNG files
    
    # Base64 for a 1x1 blue pixel PNG
    BLUE_PIXEL="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77DQAAAABJRU5ErkJggg=="
    
    for size in 16 32 48 96; do
        echo $BLUE_PIXEL | base64 -d > icons/icon-${size}.png
        echo "Created placeholder icons/icon-${size}.png (1x1 blue pixel - replace with proper ${size}x${size} icon)"
    done
fi

echo ""
echo "Icon creation complete!"
echo ""
echo "Next steps:"
echo "1. If you have ImageMagick installed, the icons should be ready to use"
echo "2. If not, open create-icons.html in a browser to generate proper icons"
echo "3. Or replace the placeholder files in the icons/ directory with your own ${16}x${16}, ${32}x${32}, ${48}x${48}, and ${96}x${96} PNG files"
echo ""
echo "Extension is ready for testing in Firefox!" 