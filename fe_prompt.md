You are a senior frontend engineer and UX expert specializing in accessibility, 
readability, and visual design. Audit all HTML/CSS pages in this project and 
produce a detailed report + fixes.

## Tasks:

### 1. COLOR & CONTRAST AUDIT
- Check every text/background color combination
- Flag any with contrast ratio below 4.5:1 (WCAG AA)
- Flag pure black (#000000) on pure white (#ffffff) as "harsh" 
- Suggest replacements using these approved palettes:
  * Light: bg #FAFAF9, text #1C1C1E, accent #2563EB
  * Dark: bg #0F172A, text #E2E8F0, accent #38BDF8
  * Warm: bg #FDF6EC, text #2D2A26, accent #D97706

### 2. READABILITY AUDIT  
- Check font sizes (body should be min 16px, never below 14px)
- Check line-height (ideal: 1.5–1.7 for body text)
- Check line length (max 65–75 characters per line)
- Check letter-spacing on headings (slightly loose = more readable)
- Flag walls of text with no visual breaks
- Check font choices — flag Arial, Times New Roman, generic system fonts

### 3. ZOOM FUNCTIONALITY
Add a floating zoom control widget to every HTML page:
- A small pill-shaped control (bottom-right corner, fixed position)
- Buttons: [ A- ] [ 100% ] [ A+ ]
- Font size range: 12px to 24px base, in 2px steps
- Persist zoom level in localStorage
- Smooth CSS transition on zoom change
- Keyboard shortcuts: Ctrl+= to zoom in, Ctrl+- to zoom out, Ctrl+0 to reset
- Code:
```javascript
// Inject this zoom widget into every page
const zoomWidget = `
<div id="zoom-control" style="
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  display: flex; align-items: center; gap: 8px;
  background: #1C1C1E; color: #FAFAF9; border-radius: 999px;
  padding: 8px 16px; font-family: monospace; font-size: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3); user-select: none;
">
  <button onclick="zoom(-1)" style="background:none;border:none;color:inherit;cursor:pointer;font-size:16px;">A−</button>
  <span id="zoom-label">100%</span>
  <button onclick="zoom(1)" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px;">A+</button>
</div>`;

let baseSize = parseInt(localStorage.getItem('zoomSize') || 16);
document.documentElement.style.fontSize = baseSize + 'px';
document.body.insertAdjacentHTML('beforeend', zoomWidget);
document.getElementById('zoom-label').textContent = 
  Math.round((baseSize/16)*100) + '%';

function zoom(dir) {
  baseSize = Math.min(24, Math.max(12, baseSize + dir * 2));
  document.documentElement.style.fontSize = baseSize + 'px';
  document.getElementById('zoom-label').textContent = 
    Math.round((baseSize/16)*100) + '%';
  localStorage.setItem('zoomSize', baseSize);
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === '=') { e.preventDefault(); zoom(1); }
  if (e.ctrlKey && e.key === '-') { e.preventDefault(); zoom(-1); }
  if (e.ctrlKey && e.key === '0') { e.preventDefault(); baseSize=16; zoom(0); }
});
```

### 4. OUTPUT FORMAT
For each page file found:
- File name
- Issues found (color, readability, missing zoom)
- Specific CSS fixes with before/after values
- Overall score: A / B / C / F

### 5. AUTO-FIX
After reporting, ask: "Apply all fixes automatically? (yes/no)"
If yes — edit the files directly with the corrections.

Start by scanning all .html, .css, and .jsx/.tsx files in the project root and subdirectories.