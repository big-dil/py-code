// ==================================================
//      קובץ 4: ליבת ממשק המשתמש (UI Core)
// ==================================================

// --------------------------------------------------
//               ניהול מודאלים (Modals)
// --------------------------------------------------

/**
 * הצגת חלון קופץ (Modal)
 * @param {string} title - כותרת החלון
 * @param {string} html - תוכן ה-HTML של גוף החלון
 * @param {function} onOk - פונקציה שתופעל בלחיצה על אישור (אופציונלי)
 * @param {function|string} onCancel - פונקציה לביטול, או מחרוזת לשינוי טקסט כפתור הביטול
 */
function showModal(title, html, onOk, onCancel) {
  const modal = el('#modal-backdrop .modal');
  modal.scrollTo(0, 0); 
  el('#modal-title').textContent = title;
  el('#modal-body').innerHTML = html;
  
  const back = el('#modal-backdrop');
  back.classList.remove('hidden');
  back.setAttribute('aria-hidden', 'false');
  
  const ok = el('#modal-ok');
  const cancel = el('#modal-cancel');
  
  // הצגה או הסתרה של כפתור האישור בהתאם לקיום callback
  ok.style.display = onOk ? 'inline-block' : 'none';
  
  // קביעת טקסט כפתור הביטול (אם הועברה מחרוזת, או ברירת מחדל)
  cancel.textContent = (typeof onCancel === 'string') ? onCancel : (onOk ? 'ביטול' : 'סגור');

  // פונקציית ניקוי - מסירה מאזינים וסוגרת את החלון
  const cleanup = () => {
    if (document.activeElement) document.activeElement.blur(); 
    ok.onclick = null; 
    cancel.onclick = null;
    back.classList.add('hidden'); 
    back.setAttribute('aria-hidden', 'true');
  };
  
  ok.onclick = () => { cleanup(); onOk && onOk(); };
  cancel.onclick = () => { 
    cleanup(); 
    if (typeof onCancel === 'function') onCancel(); 
  };
}

/**
 * דיאלוג אישור (Promise-based)
 * מחזיר Promise שמתבצע כ-true אם המשתמש אישר, ו-false אחרת.
 */
function confirmDialog(message) {
  return new Promise((resolve) => {
    showModal(
      'אישור פעולה',
      `<div class="row">${escapeHtml(message)}</div>`,
      () => resolve(true), 
      () => resolve(false) 
    );
  });
}

/**
 * דיאלוג שגיאה
 * מציג הודעה אדומה ונסגר בלחיצה על כפתור יחיד.
 */
function errorDialog(message) {
  showModal('שגיאה', `<div class="row"><p class="error-msg" style="font-size:1.1rem; text-align:center">${escapeHtml(message)}</p></div>`, () => {}, null);
}


// --------------------------------------------------
//               ניווט וטאבים (Tabs)
// --------------------------------------------------

/**
 * החלפת מסכים בין "ניהול ושיבוצים" לבין "ניהול בחורים"
 * @param {string} key - 'manage' או 'students'
 */
function switchTab(key) {
  const isManage = key === 'manage';
  
  // עדכון סטטוס כפתורי התפריט
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  
  if (isManage) {
      document.querySelector('#menu-manage').classList.add('active');
      document.querySelector('header h1').textContent = 'לוח בקרה ראשי'; 
  } else {
      document.querySelector('#menu-students').classList.add('active');
      document.querySelector('header h1').textContent = 'ניהול בחורים'; 
  }
  
  // הצגה/הסתרה של אזורי התוכן
  document.querySelector('#pane-manage').classList.toggle('hidden', !isManage);
  document.querySelector('#pane-students').classList.toggle('hidden', isManage);
  
  // איפוס בחירה אם יוצאים ממסך הניהול
  if (!isManage) {
      if (typeof selectedNode !== 'undefined') selectedNode = null; 
  }
  
  // רענון הנתונים והתאמת רוחב עמודות הטבלה (AG Grid)
  setTimeout(() => {
      if (typeof refreshAll === 'function') refreshAll();
      
      if (!isManage && typeof gridApi !== 'undefined' && gridApi) {
          gridApi.sizeColumnsToFit();
      }
  }, 50);
}
