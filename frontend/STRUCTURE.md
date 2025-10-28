# Frontend Structure

## 📁 Directory Organization

```
frontend/
├── index.html              # Homepage
├── auth.html              # Login/Register page
├── admin.html             # Admin main page
│
├── assets/                # All frontend assets
│   ├── images/           # Images and icons
│   │
│   ├── styles/           # CSS files organized by purpose
│   │   ├── core/         # Core/global styles
│   │   │   └── main.css  # Base styles, variables, resets
│   │   │
│   │   ├── components/   # Reusable component styles
│   │   │   ├── header.css
│   │   │   ├── footer.css
│   │   │   └── toast.css  # Toast notifications & modals
│   │   │
│   │   ├── pages/        # Page-specific styles
│   │   │   ├── hero.css
│   │   │   ├── intro.css
│   │   │   └── sections.css
│   │   │
│   │   └── features/     # Feature-specific styles
│   │       ├── auth.css   # Login/register forms
│   │       ├── booking.css
│   │       └── admin.css
│   │
│   └── scripts/          # JavaScript files organized by purpose
│       ├── core/         # Core functionality
│       │   ├── toast.js   # Toast notification system
│       │   └── main.js    # Main site logic, navigation
│       │
│       ├── components/   # Reusable components (future)
│       │
│       ├── pages/        # Page-specific scripts (future)
│       │
│       └── features/     # Feature-specific scripts
│           ├── auth.js    # Registration/login handlers
│           └── admin.js   # Admin functionality
│
└── admin/                # Admin panel
    ├── index.html
    │
    ├── pages/           # Admin sub-pages
    │   ├── dashboard.html
    │   ├── customers.html
    │   ├── schedules.html
    │   ├── staff.html
    │   └── tickets.html
    │
    └── assets/          # Admin-specific assets
        ├── scripts/
        │   ├── admin.js
        │   └── dashboard.js
        │
        └── styles/
            ├── admin.css
            └── dashboard.css
```

## 🎨 CSS Organization

### Core (`assets/styles/core/`)
- **main.css**: CSS variables, resets, base typography, global utilities

### Components (`assets/styles/components/`)
- **header.css**: Header navigation, user account dropdown
- **footer.css**: Footer layout and styles
- **toast.css**: Toast notifications and modal popups (animations, colors)

### Pages (`assets/styles/pages/`)
- **hero.css**: Hero section with booking form
- **intro.css**: Introduction section
- **sections.css**: General page sections

### Features (`assets/styles/features/`)
- **auth.css**: Login/register forms, multi-step registration
- **booking.css**: Booking form and ticket selection
- **admin.css**: Admin panel styles

## 📜 JavaScript Organization

### Core (`assets/scripts/core/`)
- **toast.js**: 
  - `ToastManager` class (4 types: success/error/warning/info)
  - `ModalManager` class (promise-based confirm/alert)
  - Auto-dismiss, progress bars, stacking

- **main.js**:
  - Check login status
  - Account dropdown toggle
  - Logout with confirmation
  - Booking form validation
  - Navigation handling

### Features (`assets/scripts/features/`)
- **auth.js**:
  - Registration flow handlers (4 steps)
  - Login form handler
  - OTP input auto-formatting
  - Toast notifications for feedback

- **admin.js**: Admin panel functionality

## 🔗 HTML Import Structure

### index.html
```html
<!-- Styles -->
<link rel="stylesheet" href="assets/styles/core/main.css">
<link rel="stylesheet" href="assets/styles/components/header.css">
<link rel="stylesheet" href="assets/styles/components/footer.css">
<link rel="stylesheet" href="assets/styles/components/toast.css">
<link rel="stylesheet" href="assets/styles/pages/hero.css">
<link rel="stylesheet" href="assets/styles/pages/intro.css">
<link rel="stylesheet" href="assets/styles/pages/sections.css">
<link rel="stylesheet" href="assets/styles/features/booking.css">

<!-- Scripts (order matters!) -->
<script src="assets/scripts/core/toast.js"></script>
<script src="assets/scripts/core/main.js"></script>
```

### auth.html
```html
<!-- Styles -->
<link rel="stylesheet" href="assets/styles/core/main.css">
<link rel="stylesheet" href="assets/styles/components/header.css">
<link rel="stylesheet" href="assets/styles/components/footer.css">
<link rel="stylesheet" href="assets/styles/components/toast.css">
<link rel="stylesheet" href="assets/styles/features/auth.css">

<!-- Scripts (toast.js must load before auth.js) -->
<script src="assets/scripts/core/toast.js"></script>
<script src="assets/scripts/core/main.js"></script>
<script src="assets/scripts/features/auth.js"></script>
```

## ✨ Key Features

### Toast Notification System
- 4 types: success (green), error (red), warning (orange), info (blue)
- Auto-dismiss with progress bar
- Stack multiple notifications
- Smooth animations (slideIn/slideOut)
- Mobile responsive

### Modal Dialog System
- Promise-based API
- `Modal.confirm()` for yes/no dialogs
- `Modal.alert()` for simple alerts
- Backdrop blur effect
- Keyboard support (Enter/Escape)

### Account Management
- Login status detection (localStorage)
- Account dropdown menu when logged in
- Logout with confirmation modal
- JWT token storage

## 🚀 Best Practices

1. **Load Order**: Always load `toast.js` before feature scripts that use it
2. **Helper Function**: Use `showToast()` with fallback to `alert()`
3. **Modular CSS**: Keep styles organized by purpose (core/components/pages/features)
4. **DRY JavaScript**: Shared utilities in `core/`, specific logic in `features/`
5. **Responsive Design**: Mobile-first approach in all CSS files

## 📱 Responsive Design

- Desktop: Full navigation, side-by-side layouts
- Tablet: Adjusted spacing, simplified navigation
- Mobile: Stacked layouts, hamburger menu, full-width toasts
