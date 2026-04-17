# How to Add Your Logo

## Current Setup:

I've created a placeholder SVG logo (`logo.svg`) with your company initials "DLC" and a building icon. The logo appears on both the login page and dashboard.

## To replace with your own logo:

1. **Replace the logo file:**
   - Replace `public/logo.svg` with your own logo file
   - Keep the same filename: `logo.svg`

2. **Supported formats:**
   - SVG (recommended for scalability)
   - PNG (good for photos/transparency)
   - JPG (good for photos)
   - WebP (modern format with good compression)

3. **Logo sizes:**
   - **Login page**: 120x120px (`.logo` class)
   - **Dashboard header**: 60x60px (`.header-logo` class)

## Logo placement:

- **Login page**: Large logo above company name in centered section
- **Dashboard**: Smaller logo next to company name in header

## CSS Classes:

- `.logo`: Login page logo styling
- `.header-logo`: Dashboard header logo styling

Simply replace the `logo.svg` file with your actual logo and refresh the page!