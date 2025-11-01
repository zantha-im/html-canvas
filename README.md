# Shopify Announcements Page Project

A clean, modular announcements page designed for Shopify's HTML editor with consistent styling, anchor-based navigation, and responsive design.

## Features

- **Consistent Design**: Uniform typography, colors, and spacing throughout
- **Anchor Navigation**: Deep-linkable sections via Shopify menu integration 
- **Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **Modular Components**: Easy to add new announcements using the card component
- **Smooth Scrolling**: Anchor links land with proper offset below sticky headers
- **Accessible**: Proper semantic HTML and keyboard navigation support
- **Shopify-Integrated**: Title supplied by Shopify; snippet provides content only

## File Structure

```
announcements/
├── announcements-page.html    # Main page file (copy this to Shopify)
├── README.md                  # This documentation
└── templates/                 # Announcement templates
    ├── standard-announcement.html
    ├── product-update.html
    └── shipping-alert.html
```

## How to Use

1. **Copy to Shopify**: Copy the entire content of `announcements-page.html` and paste it into your Shopify page editor
2. **Add New Announcements**: Use the template structure below to add new announcements
3. **Update Shopify Navigation**: Add new announcement links to your Shopify menu using the nav links provided in the current announcements list
4. **Generate Nav Links**: For each new announcement, create a short nav label and corresponding jump link (see Current Announcements section)

## Adding New Announcements

### Standard Announcement Template

**Important**: Follow these rules for consistency:

1. **Section ID**: Use a slugified version of the main headline (e.g., `important-update-on-us-tariffs-and-duties`)
2. **Date Format**: Use "Day, Month Date, Year" (e.g., "Sunday, October 26, 2025")
3. **Headline Casing**: Use sentence case (capitalize first word and proper nouns only)
4. **Banner Color**: Choose based on content type (see Banner Color Options below)
5. **Nav Link**: Create a short label (2–4 words) and generate the jump link

```html
<section id="announcement-unique-id" class="announcement-section">
    <div class="announcement-date">Day, Month Date, Year</div>
    <div class="announcement-card">
        <div class="card-banner banner-primary">
            <h2>Headline in sentence case</h2>
            <p>Subtitle or brief description</p>
        </div>
        <p>Introduction paragraph...</p>
        <h3>Section heading in sentence case</h3>
        <ul>
            <li><strong>Key point:</strong> Description</li>
            <li><strong>Another point:</strong> Description</li>
        </ul>
        <p>Conclusion paragraph...</p>
    </div>
</section>
```

**After adding the announcement:**
1. Generate a short nav label (2–4 words, sentence case)
2. Create the jump link: `/pages/announcements#announcement-unique-id`
3. Add to Shopify menu navigation

### Banner Color Options

Choose based on announcement type:

- `banner-primary` — Blue (normal news, updates)
- `banner-success` — Green (all-good, resolved issues)
- `banner-danger` — Red (urgent, system down, critical)
- `banner-warning` — Orange/Yellow (caution, temporary issues)
- `banner-secondary` — Darker blue (alternative accent)

### Current Announcements & Nav Links

Use these links in your Shopify menu. Update this list when adding new announcements.

| Nav Label | Full Link |
|-----------|-----------|
| US tariffs & duties | `/pages/announcements#important-update-on-us-tariffs-and-duties` |
| Canada shipping resumes | `/pages/announcements#canada-shipping-service-resumes` |
| Check spam folder | `/pages/announcements#action-required-check-your-spam-folder` |
| Warehouse relocation | `/pages/announcements#warehouse-relocation` |
| Service suspension | `/pages/announcements#urgent-service-suspension-canada` |
| Backlog cleared | `/pages/announcements#backlog-cleared-were-back-on-track` |
| Shipping costs | `/pages/announcements#a-note-on-shipping-costs` |
| Back in stock | `/pages/announcements#theyre-back` |
| Shipping crisis story | `/pages/announcements#navigating-the-storm` |

## Styling Guidelines

### Typography Hierarchy
- **Page Title**: `text-4xl md:text-5xl font-black`
- **Card Banner Title**: `font-size: 1.5rem; font-weight: 800`
- **Card Main Title**: `font-size: 1.875rem; font-weight: 800`
- **Section Headings**: `font-size: 1.25rem; font-weight: 700`
- **Body Text**: `font-size: 1rem;` with `color: var(--text-secondary)`

### Color Variables
- `--bg-primary`: Main background (#1E2128)
- `--bg-secondary`: Card background (#252831)
- `--bg-tertiary`: Tertiary background (#2D3039)
- `--border-color`: Borders (#343741)
- `--text-primary`: Main text (#FFFFFF)
- `--text-secondary`: Body text (#D1D5DB)
- `--text-muted`: Muted text (#9CA3AF)
- `--accent-primary`: Primary accent blue (#4471BA)
- `--accent-secondary`: Secondary accent blue (#4471BA)
- `--success`: Green (#469B3B)
- `--warning`: Orange (#F59E0B)
- `--danger`: Red (#EF4444)

## Anchor Navigation Features

- **Deep Linking**: All announcements are anchor-linkable via section IDs
- **Smooth Scrolling**: Automatic smooth scroll to announcement
- **Scroll Offset**: Anchors land 96px below the viewport top (adjustable for header height)
- **Shopify Integration**: Links are added to your Shopify menu for easy access
- **Responsive**: Works on all devices and screen sizes
- **No Custom Nav**: Uses Shopify's native menu system

## Best Practices

1. **Section IDs**: Use slugified headline text (lowercase, hyphens, no special chars)
2. **Headline Casing**: Always use sentence case (capitalize first word and proper nouns only)
3. **Date Format**: Consistent format: "Day, Month Date, Year" (e.g., "Sunday, October 26, 2025")
4. **Banner Colors**: Choose based on content type (see Banner Color Options)
5. **Nav Labels**: Keep short (2–4 words) for Shopify menu fit
6. **Navigation Updates**: Add new nav links to Shopify menu and update README.md table
7. **Mobile Testing**: Always test on mobile devices
8. **Anchor Offset**: Verify 96px scroll offset works with your Shopify header height

## Customization

### Changing Colors
Update the CSS variables in the `:root` section:

```css
:root {
    --accent-primary: #your-color;
    --bg-primary: #your-bg-color;
    /* etc... */
}
```

### Adjusting Scroll Offset
If your Shopify header height differs from 96px, update the CSS:

```css
.announcement-section {
    scroll-margin-top: 96px; /* Change to your header height */
}
```

### Adjusting Date Styling
The announcement date now has a subtle divider. To modify:

```css
.announcement-date {
    font-size: 0.95rem;
    font-weight: 600;
    color: #E5E7EB;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--border-color);
}
```

### Adjusting Banner Padding
To balance top/bottom spacing in card banners:

```css
.card-banner {
    padding: 1.25rem 1.5rem 0.75rem 1.5rem; /* top right bottom left */
    gap: 0.25rem; /* space between title and subtitle */
}
```

## Support

This page is designed to work within Shopify's HTML editor constraints while providing a professional, modern user experience. All styles are self-contained and don't require external dependencies beyond Tailwind CSS (loaded via CDN).

For questions or customizations, refer to the commented sections in the HTML file or create a new announcement using the templates provided.
