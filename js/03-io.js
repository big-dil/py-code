// ==================================================
//      קובץ 3: ייבוא וייצוא (IO - Input/Output)
// ==================================================

import { getDB, setDB, saveDB, addStudent, getStudentBed } from './02-data-manager.js';
import { toHebrewDate } from './01-utils.js';
import { confirmDialog, errorDialog, showModal, setSelectedNode, setSelectedStudentId } from './04-ui-core.js';

// --------------------------------------------------
//               JSON (גיבוי מלא/חלקי)
// --------------------------------------------------

/**
 * פונקציית עזר להורדת אובייקט כקובץ JSON
 */
function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2); 
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click(); 
    URL.revokeObjectURL(url); 
}

/**
 * לוגיקת טעינת קובץ גיבוי (JSON)
 */
async function importDB(file) {
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            const type = importedData.exportType || 'full'; 
            const DB = getDB();

            if (type === 'full' && importedData.buildings && importedData.students && importedData.seq) {
                if (await confirmDialog('האם אתה בטוח שברצונך לטעון גיבוי מלא? **פעולה זו תחליף את כל הנתונים הנוכחיים.**')) {
                    // שחזור מבנה נתונים תקין
                    importedData.students = importedData.students.map(s => ({
                        ...s,
                        tags: s.tags || [],
                        status_data: s.status_data || {}
                    }));
                    setDB(importedData);
                    setSelectedNode(null);
                    setSelectedStudentId(null);
                    saveDB(); 
                    showModal('טעינה הושלמה', 'הנתונים נטענו בהצלחה מהקובץ.', null, 'סגור');
                }
            } 
            else if (type === 'structure_only' && importedData.buildings) {
                if (await confirmDialog('האם אתה בטוח שברצונך לטעון מבנה פנימייה? **פעולה זו תחליף את כל המבנים הקיימים ותאפס את כל השיבוצים.** רשימת הבחורים תישמר.')) {
                    DB.buildings = importedData.buildings;
                    DB.seq.building = importedData.seq.building;
                    DB.seq.floor = importedData.seq.floor;
                    DB.seq.room = importedData.seq.room;
                    DB.seq.bed = importedData.seq.bed;
                    setSelectedNode(null);
                    setSelectedStudentId(null);
                    saveDB();
                    showModal('טעינת מבנה הושלמה', 'מבנה הפנימייה נטען בהצלחה. כל השיבוצים אופסו.', null, 'סגור');
                }
            }
            else if (type === 'students_only' && importedData.students) {
                if (await confirmDialog('האם אתה בטוח שברצונך לטעון רשימת בחורים? **פעולה זו תחליף את כל רשימת הבחורים הקיימת ותאפס את כל השיבוצים.** מבנה הפנימייה יישמר.')) {
                    DB.students = importedData.students.map(s => ({
                        ...s,
                        tags: s.tags || [],
                        status_data: s.status_data || {}
                    }));
                    DB.seq.student = importedData.seq.student;
                    
                    for (const b of DB.buildings) {
                        for (const f of b.floors) {
                            for (const r of f.rooms) {
                                for (const bed of r.beds) {
                                   bed.student_id = null;
                                   bed.history = []; 
                                }
                            }
                        }
                    }
                    
                    setSelectedNode(null);
                    setSelectedStudentId(null);
                    saveDB();
                    showModal('טעינת בחורים הושלמה', 'רשימת הבחורים נטען בהצלחה. כל השיבוצים אופסו.', null, 'סגור');
                }
            } else {
                errorDialog('קובץ הגיבוי אינו תקין או שסוג הגיבוי אינו מזוהה.');
            }
        } catch (error) {
            errorDialog(`אירעה שגיאה בקריאת קובץ ה-JSON: ${error.message}`);
        }
    };
    reader.readAsText(file);
}

// --------------------------------------------------
//               CSV (ייבוא וייצוא אקסל)
// --------------------------------------------------

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];
    
    let dataLines = lines;
    
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('שם') || firstLine.includes('תעודה') || firstLine.includes('משפחה')) {
        dataLines = lines.slice(1); 
    }

    const students = [];
    dataLines.forEach((line) => {
        const values = line.split(/,(?=(?:(?:[^ "]*\"){2})*[^ "]*$)/).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')); 

        if (values.length >= 10) {
            const id_card = values[2] ? values[2].trim() : '';
            const passport = values[3] ? values[3].trim() : '';
            const firstName = values[1] ? values[1].trim() : '';
            const lastName = values[0] ? values[0].trim() : '';

            if ((!id_card && !passport) || !firstName || !lastName) {
                return; 
            }

            students.push({
                lastName: lastName,
                firstName: firstName,
                id_card: id_card, 
                passport: passport, 
                age: values[4] || '',
                className: values[5] || '', 
                groupName: '',
                street: values[6] || '', 
                houseNum: values[7] || '', 
                city: values[8] || '', 
                phone: values[9] || '', 
                tags: [], 
                status_data: {} 
            });
        }
    });
    return students;
}

function importStudentsFromCSV(studentData) {
    let importedCount = 0;
    let skippedCount = 0;
    let skippedList = [];

    studentData.forEach(data => {
        const [ok, msg] = addStudent(data, true); 
        if (ok) {
            importedCount++;
        } else {
            skippedCount++;
            skippedList.push(`${msg} (${data.firstName} ${data.lastName})`);
        }
    });
    
    if (importedCount > 0) {
        saveDB(); 
    } else {
        document.dispatchEvent(new CustomEvent('db-updated'));
    }
    
    return { importedCount, skippedCount, total: studentData.length, skippedList };
}

function exportStudentsToCSV() {
  const DB = getDB();
  const BOM = "\uFEFF";
  const header = "שם_משפחה,שם_פרטי,תעודת זהות,מס דרכון,גיל,כיתה_חדש,רחוב,מס בית ודירה,ישוב,נייד תלמיד,מיקום שיבוץ";
  
  const rows = DB.students.map(student => {
      let locationText = 'לא משובץ';
      const bedInfo = getStudentBed(student.id); 
      if (bedInfo) {
          const floorName = bedInfo.floor.displayName || `קומה ${bedInfo.floor.floor_number}`;
          locationText = `${bedInfo.building.name}, ${floorName}, חדר ${bedInfo.room.room_number}, מיטה ${bedInfo.bed.bed_number}`;
      }
      
      return [
          student.lastName,
          student.firstName,
          student.id_card, 
          student.passport, 
          student.age,
          student.className,
          student.street,
          student.houseNum,
          student.city,
          student.phone,
          locationText 
      ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','); 
  });

  const csvContent = [header, ...rows].join('\r\n');
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const hebrewDateStr = toHebrewDate(new Date().toISOString()).replace(/ /g, '_') || new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `Pnimia_Students_Export_${hebrewDateStr}.csv`);
  link.click();
  URL.revokeObjectURL(url);
}

function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const csvText = event.target.result;
            const studentData = parseCSV(csvText); 
            
            if (studentData.length === 0) {
                errorDialog('לא נמצאו נתונים תקינים לקריאה בקובץ ה-CSV. אנא ודא שהקובץ בפורמט התואם (10 עמודות: שם משפחה, שם פרטי, ת.ז...)');
                return;
            }
            
            const results = importStudentsFromCSV(studentData); 
            
            let summaryHtml = `
                <p><strong>סה"כ רשומות תקינות לקריאה:</strong> ${results.total}</p>
                <p style="color:var(--success)">✅ <strong>נוספו בהצלחה:</strong> ${results.importedCount}</p>
                <p style="color:var(--warn)">⚠️ <strong>דלגו (כפילות/נתונים חסרים):</strong> ${results.skippedCount}</p>
            `;

            if (results.skippedList.length > 0) {
                summaryHtml += `<div class="row" style="max-height: 150px; overflow: auto; border: 1px solid var(--border); padding: 8px; border-radius: 8px; margin-top: 10px;">
                    <label style="font-weight: 700;">פירוט הדלגות (מוגבל ל-50):</label>
                    <ul style="margin: 0; padding-right: 20px; font-size: 0.9rem;">
                        ${results.skippedList.slice(0, 50).map(s => `<li>${s}</li>`).join('')}
                        ${results.skippedList.length > 50 ? '<li>...ועוד...</li>' : ''}
                    </ul>
                </div>`;
            }

            showModal('סיכום ייבוא CSV', summaryHtml, null, 'סגור');
            
            e.target.value = ''; 

        } catch (error) {
            errorDialog(`אירעה שגיאה בקריאת הקובץ: ${error.message}`);
        }
    };
    reader.readAsText(file); 
}

export {
    downloadJSON,
    importDB,
    exportStudentsToCSV,
    handleCSVFile
};
