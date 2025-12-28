// עזרים כלליים ל-DOM
const el = (q, root=document) => root.querySelector(q);
const els = (q, root=document) => Array.from(root.querySelectorAll(q));
const byId = id => (n) => n.id === id;

function escapeHtml(s) {
    return String(s).replace(/[&<>"]+/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

// ניהול צבעים
function getColorForClass(str) {
    if (!str) return 'transparent';
    const colors = [
      '#303F9F', '#F57C00', '#C2185B', '#0288D1', '#7B1FA2', 
      '#5D4037', '#00796B', '#AFB42B', '#D32F2F', '#388E3C'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; 
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// ניהול תאריכים וטווחים
function parseRange(input, isNumeric = true) {
    const parts = input.split(',').map(p => p.trim()).filter(p => p);
    const results = new Set();
    for (const part of parts) {
      if (part.includes('-') || part.includes('–') || part.includes('—')) {
        const [startStr, endStr] = part.split(/[-–—]/);
        const start = Number(startStr);
        const end = Number(endStr);
        if (Number.isFinite(start) && Number.isFinite(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            results.add(isNumeric ? i : String(i));
          }
          continue;
        }
      }
      const val = isNumeric ? Number(part) : part;
      if (isNumeric) {
        if (Number.isFinite(val) && val > 0) results.add(val);
      } else if (val) {
        results.add(val);
      }
    }
    return Array.from(results);
}

function toHebrewDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('he-IL', {
            calendar: 'hebrew',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch (e) { return isoString; }
}

function formatDate(isoString) {
    if (!isoString) return 'לא ידוע';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'תאריך לא תקין';
      const hebrewDateStr = toHebrewDate(isoString); 
      const timeStr = date.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' });
      return `${hebrewDateStr}, ${timeStr}`;
    } catch (e) { return 'שגיאת תאריך'; }
}

function toHtmlDate(isoString) {
    if (!isoString) return '';
    if (isoString.match(/^\d{4}-\d{2}-\d{2}$/)) return isoString; 
    try { return new Date(isoString).toISOString().split('T')[0]; } 
    catch { return ''; }
}
