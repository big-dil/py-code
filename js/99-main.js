// ==================================================
//      קובץ 9: אתחול ראשי (Main Initialization)
// ==================================================

// הגדרת משתנה גלובלי לבחירת תלמיד (במידה ולא הוגדר בקבצים הקודמים)
var selectedStudentId = null; 

/**
 * פונקציית הרענון הראשית
 * אחראית לצייר מחדש את העץ ואת הטבלה בהתאם לחיפושים ולשינויים
 * @param {number|null} scrollToId - מזהה מיטה לגלילה אוטומטית (אופציונלי)
 */
function refreshAll(scrollToId = null) {
  // קריאת ערכי החיפוש הנוכחיים
  const roomFilter = el('#search-rooms') ? el('#search-rooms').value : '';
  const studentFilter = el('#search-student') ? el('#search-student').value : '';

  // רינדור מחדש של הרכיבים
  if (typeof renderTree === 'function') renderTree(roomFilter); 
  if (typeof renderStudents === 'function') renderStudents(studentFilter); 
  if (typeof updateActionsPanel === 'function') updateActionsPanel(); 

  // גלילה למיטה ספציפית (למשל אחרי שיבוץ או לחיצה בהיסטוריה)
  if (scrollToId) {
    setTimeout(() => {
      const targetEl = el(`.bed-cell[data-id="${scrollToId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // הוספת אפקט הבהוב קטן להדגשה
        targetEl.style.transition = 'box-shadow 0.5s';
        targetEl.style.boxShadow = '0 0 15px var(--accent)';
        setTimeout(() => targetEl.style.boxShadow = '', 1000);
      }
    }, 100);
  }
}

// --------------------------------------------------
//               אתחול מאזינים (Event Listeners)
// --------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // --- כפתורי סרגל עליון (ניהול) ---
    el('#btn-add-building').addEventListener('click', promptAddFullBuilding);
    el('#btn-reset-data').addEventListener('click', promptResetOptions);
    
    // --- ייבוא וייצוא נתונים (JSON) ---
    el('#btn-export-db').addEventListener('click', promptExportType);
    el('#btn-import-db').addEventListener('click', () => {
        el('#json-file-input').click(); 
    });
    el('#json-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importDB(file);
        e.target.value = ''; // איפוס כדי לאפשר טעינה חוזרת של אותו קובץ
    });

    // --- ייבוא וייצוא תלמידים (CSV) ---
    el('#btn-import-students').addEventListener('click', () => {
        el('#csv-file-input').click();
    });
    el('#csv-file-input').addEventListener('change', handleCSVFile);
    el('#btn-export-students-csv').addEventListener('click', exportStudentsToCSV);

    // --- שדות חיפוש ---
    el('#search-rooms').addEventListener('input', (e) => {
        selectedNode = null; // איפוס בחירה בעת חיפוש
        renderTree(e.target.value); 
    });
    
    el('#search-student').addEventListener('input', (e) => {
         renderStudents(e.target.value);
    });

    // --- כפתורי ניהול בחורים ---
    el('#btn-add-student').addEventListener('click', promptAddStudent);
    el('#btn-edit-student').addEventListener('click', promptEditSelectedStudent);
    
    el('#btn-del-student').addEventListener('click', async () => {
      if (!selectedStudentId) { errorDialog('יש לבחור בחור מהרשימה תחילה.'); return; }
      if (!(await confirmDialog('האם אתה בטוח? פעולה זו תסיר את הבחור ותפנה את מיטתו אם משובץ.'))) return;
      
      deleteStudent(selectedStudentId);
      selectedStudentId = null; 
      // עדכון כפתורים
      el('#btn-edit-student').disabled = true;
      el('#btn-del-student').disabled = true;
      renderStudents(); 
      renderTree(el('#search-rooms').value); // עדכון גם בעץ אם הוא היה משובץ
    });

    // --- כפתור מחיקה ראשי (בפאנל הפעולות) ---
    el('#btn-delete').addEventListener('click', async () => {
      if (!selectedNode) return;
      const { type, id } = selectedNode;
      const confirmMsg = 'האם אתה בטוח שברצונך למחוק את הפריט הנבחר? פעולה זו הינה בלתי הפיכה.';
      if (!(await confirmDialog(confirmMsg))) return; 

      let result = [true];
      if (type === 'b') result = deleteBuilding(id);
      else if (type === 'f') result = deleteFloor(id);
      else if (type === 'r') result = deleteRoom(id);
      else if (type === 'bed') result = deleteBed(id); 

      if (result[0] === false) {
          errorDialog(result[1]); 
      } else {
          selectedNode = null; 
          refreshAll();
      }
    });

    // --- קיצורי מקלדת גלובליים ---
    document.addEventListener('keydown', (e) => {
      // מניעת מחיקה אם המשתמש מקליד בתוך שדה טקסט
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete') {
        // מחיקה במסך הניהול
        if (selectedNode && !el('#pane-manage').classList.contains('hidden') && el('#modal-backdrop').classList.contains('hidden')) { 
          el('#btn-delete').click();
        }
        // מחיקה במסך התלמידים
        else if (selectedStudentId && !el('#pane-students').classList.contains('hidden') && el('#modal-backdrop').classList.contains('hidden')) { 
          el('#btn-del-student').click();
        }
      }
    });

    // --- הפעלה ראשונית ---
    // המתנה קצרה לוודא שכל המודולים נטענו וAG Grid מוכן
    setTimeout(() => {
        refreshAll();
        console.log('System v5.4 Pro Max initialized successfully.');
    }, 100);
});
