# Beautiful Todo - Chrome Extension

A beautiful and functional todo list that replaces your new tab page.

## Features

- Add, edit, delete, and complete tasks
- Filter tasks by all, active, or completed
- Clear all completed tasks at once
- Data persistence using Chrome storage
- Beautiful gradient design with smooth animations
- Responsive and pixel-perfect UI

## Installation

### Step 1: Generate Icons

1. Open `generate-icons.html` in your browser
2. Three icon files will automatically download:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`
3. Move these icon files to the extension folder (same directory as manifest.json)

### Step 2: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked"
4. Select the folder containing the extension files
5. The extension should now be installed!

### Step 3: Test It

1. Open a new tab in Chrome
2. You should see your beautiful todo list!

## Usage

- **Add a task**: Type in the input field and press Enter or click the + button
- **Complete a task**: Click the checkbox next to the task
- **Edit a task**: Hover over a task and click the edit icon (pencil)
- **Delete a task**: Hover over a task and click the delete icon (trash)
- **Filter tasks**: Use the All/Active/Completed tabs
- **Clear completed**: Click "Clear completed" at the bottom

## Technologies Used

- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript
- Chrome Extension API (Manifest V3)
- Google Fonts (Inter)

## Design

The design features:
- Modern gradient background (purple to violet)
- Clean white card with rounded corners
- Smooth animations and transitions
- Hover effects for better UX
- Custom checkboxes with gradient fill
- SVG icons for actions
- Responsive layout

Enjoy your beautiful new todo list! 🎉
