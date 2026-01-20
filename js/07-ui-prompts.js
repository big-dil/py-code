// ==================================================
//      קובץ 7: חלונות קלט וטפסים (UI Prompts)
// ==================================================

import { el, els, escapeHtml, toHtmlDate, toHebrewDate } from './01-utils.js';
import { getDB, setDB, saveDB, addFloor, addRoom, addBed, updateBuilding, updateFloor, updateRoom, addStudent, updateStudent, getUnassignedStudents, assignStudentToBed, findStudent } from './02-data-manager.js';
import { showModal, errorDialog, confirmDialog, selectedStudentId, setSelectedNode, setSelectedStudentId } from './04-ui-core.js';
import { downloadJSON } from './03-io.js';

// All functions are defined here as they were before...

function addFullBuilding(name, numFloors, numRoomsPerFloor, numBedsPerRoom) {
    name = name.trim();
    const DB = getDB();
    if (!name) return [false, 'שם המבנה לא יכול להיות ריק.'];
    if (DB.buildings.some(b => b.name === name)) return [false, `מבנה בשם "${name}" כבר קיים.`];
    const floors = Number(numFloors);
    const rooms = Number(numRoomsPerFloor);
    const beds = Number(numBedsPerRoom);
    if (!Number.isInteger(floors) || floors <= 0) return [false, 'מספר הקומות חייב להיות מספר שלם וחיובי.'];
    if (!Number.isInteger(rooms) || rooms <= 0) return [false, 'מספר החדרים בכל קומה חייב להיות מספר שלם וחיובי.'];
    if (!Number.isInteger(beds) || beds <= 0) return [false, 'מספר המיטות בכל חדר חייב להיות מספר שלם וחיובי.'];
    const newBuilding = { id: DB.seq.building++, name, floors: [], type: 'b' };
    for (let i = 1; i <= floors; i++) {
        const newFloor = { id: DB.seq.floor++, floor_number: i, displayName: ``, rooms: [], type: 'f' };
        for (let j = 1; j <= rooms; j++) {
            const roomNumber = `${i}${String(j).padStart(2, '0')}`; 
            const newRoom = { id: DB.seq.room++, room_number: roomNumber, beds: [], type: 'r' };
            for (let k = 1; k <= beds; k++) {
                newRoom.beds.push({ id: DB.seq.bed++, bed_number: k, student_id: null, type: 'bed', history: [] });
            }
            newFloor.rooms.push(newRoom);
        }
        newBuilding.floors.push(newFloor);
    }
    DB.buildings.push(newBuilding);
    saveDB();
    return [true, `המבנה "${name}" נוצר בהצלחה עם ${floors} קומות, ${rooms} חדרים בכל קומה ו-${beds} מיטות בכל חדר.`];
}

function promptAddFullBuilding() {
    const modalHtml = `
        <div class="row"><label>שם המבנה (חובה):</label><input id="in-b-name" /></div>
        <div class="row-grid">
            <div class="row"><label>מספר קומות:</label><input id="in-b-floors" type="number" min="1" value="1" /></div>
            <div class="row"><label>מספר חדרים בכל קומה:</label><input id="in-b-rooms" type="number" min="1" value="4" /></div>
        </div>
        <div class="row"><label>מספר מיטות בכל חדר:</label><input id="in-b-beds" type="number" min="1" value="2" /></div>
    `;
    showModal('הוספת מבנה חדש (אוטומטי)', modalHtml, () => {
        const name = el('#in-b-name').value;
        const floors = el('#in-b-floors').value;
        const rooms = el('#in-b-rooms').value;
        const beds = el('#in-b-beds').value;
        const [ok, msg] = addFullBuilding(name, floors, rooms, beds);
        if (ok) { showModal('הצלחה', msg, null, 'סגור'); } 
        else { errorDialog(msg); }
    });
    el('#in-b-name').focus();
}

function promptResetOptions() {
    const modalHtml = `
        <p><strong>אזהרה:</strong> פעולה זו הינה בלתי הפיכה. בחר את סוג האיפוס הרצוי:</p>
        <div style="display: grid; gap: 10px; margin-top: 15px;">
            <button class="btn danger" id="reset-option-structures">איפוס מבנים ושיבוצים</button>
            <button class="btn danger" id="reset-option-students">איפוס בחורים ושיבוצים</button>
            <button class="btn danger" id="reset-option-all">איפוס כללי (מחיקת הכל)</button>
        </div>
    `;
    showModal('איפוס נתונים', modalHtml, null, 'ביטול');
    el('#modal-ok').style.display = 'none'; 
    el('#reset-option-structures').onclick = async () => {
        if (await confirmDialog('האם אתה בטוח? כל המבנים ימחקו וכל השיבוצים יבוטלו.')) {
            const DB = getDB();
            DB.buildings = [];
            DB.seq.building = 1; DB.seq.floor = 1; DB.seq.room = 1; DB.seq.bed = 1;
            saveDB();
            el('#modal-cancel').click();
        }
    };
    el('#reset-option-students').onclick = async () => {
        if (await confirmDialog('האם אתה בטוח? כל הבחורים ימחקו וכל השיבוצים יבוטלו.')) {
            const DB = getDB();
            DB.students = [];
            for (const b of DB.buildings) for (const f of b.floors) for (const r of f.rooms) {
                for (const bed of r.beds) { bed.student_id = null; bed.history = []; }
            }
            saveDB();
            el('#modal-cancel').click();
        }
    };
    el('#reset-option-all').onclick = async () => {
        if (await confirmDialog('האם אתה בטוח? **כל הנתונים יימחקו לצמיתות!**')) {
            setDB({ seq: {building:1, floor:1, room:1, bed:1, student:1}, buildings: [], students: [], auditLog: [] }); 
            setSelectedNode(null);
            setSelectedStudentId(null);
            saveDB();
            el('#modal-cancel').click();
        }
    };
}

function promptInput(title, label, defaultValue, onOk, inputId, inputType='text') {
    showModal(title, `
        <div class="row"><label>${label}</label><input id="${inputId}" type="${inputType}" value="${escapeHtml(defaultValue)}" /></div>`, 
        () => onOk(el(`#${inputId}`).value), () => {});
    el(`#${inputId}`).focus();
}

function promptAddFloor(buildingId) {
  showModal('הוספת קומה', `
    <div class="row"><label>מספר מיון (חובה):</label><input id="in-floor-num" type="number" /></div>
    <div class="row"><label>שם תצוגה (רשות):</label><input id="in-floor-display" /></div>`, 
    () => {
        const [ok, msg] = addFloor(buildingId, el('#in-floor-num').value, el('#in-floor-display').value);
        if (!ok) errorDialog(msg);
    });
  el('#in-floor-num').focus();
}

function promptAddRoom(floorId) {
  promptInput('הוספת חדר', 'מספר/שם חדר:', '', (num) => {
    const [ok, msg] = addRoom(floorId, num);
    if (!ok) errorDialog(msg);
  }, 'in-room');
}

function promptAddBed(roomId) {
  promptInput('הוספת מיטה', 'מספר מיטה:', '', (num) => {
    const [ok, msg] = addBed(roomId, num);
    if (!ok) errorDialog(msg);
  }, 'in-bed', 'number');
}

function promptEditBuilding(id, currentName) {
    promptInput('עריכת שם מבנה', 'שם המבנה החדש:', currentName, (name) => {
        const [ok, msg] = updateBuilding(id, name);
        if (!ok) errorDialog(msg);
    }, 'in-building-name');
}

function promptEditFloor(id, currentNum, currentDisplayName) {
    showModal('עריכת קומה', `
        <div class="row"><label>מספר מיון:</label><input id="in-floor-num" type="number" value="${escapeHtml(currentNum)}" /></div>
        <div class="row"><label>שם תצוגה:</label><input id="in-floor-display" value="${escapeHtml(currentDisplayName || '')}" /></div>`, 
    () => {
        const [ok, msg] = updateFloor(id, el('#in-floor-num').value, el('#in-floor-display').value);
        if (!ok) errorDialog(msg);
    });
    el('#in-floor-num').focus();
}

function promptEditRoom(id, currentNum) {
    promptInput('עריכת מספר/שם חדר', 'מספר/שם החדר החדש:', currentNum, (num) => {
        const [ok, msg] = updateRoom(id, num);
        if (!ok) errorDialog(msg);
    }, 'in-room');
}

function promptBulkCreate(type, parentId, itemLabel, placeholder, logicFn, inputType='text') {
    showModal(`הוספת ${type} מרובים`, `
        <div class="row">
            <label>${placeholder}</label>
            <input id="in-bulk-items" type="${inputType}" placeholder="${placeholder}" />
            <div class="muted" style="margin-top: 5px;">הפרד עם פסיקים או השתמש בטווחים (למשל: 1-4, 6)</div>
        </div>`, 
    () => {
        const input = el('#in-bulk-items').value;
        if (!input.trim()) { errorDialog('הקלט ריק.'); return; }
        const results = logicFn(parentId, input); 
        let summary = `נוספו בהצלחה ${results.added} ${type}.`;
        if (results.failed.length > 0) {
            summary += `<br><br><strong>${results.failed.length} ${itemLabel} נכשלו:</strong><br>${results.failed.slice(0, 5).join(', ')}${results.failed.length > 5 ? '...' : ''}`;
        }
        showModal('סיכום הוספה', `<div class="row">${summary}</div>`, null, 'סגור');
    });
    el('#in-bulk-items').focus();
}

function promptAssign(bedId) {
  const allUnassigned = getUnassignedStudents(); 
  const uniqueClasses = Array.from(new Set(allUnassigned.map(s => s.className).filter(c => c))).sort();
  const classOptions = uniqueClasses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const modalHtml = `
    <div class="assign-toolbar">
        <select id="sel-class" class="assign-select"><option value="">(כל השיעורים)</option>${classOptions}</select>
        <input id="search-student-assign" class="assign-search" placeholder="חפש שם בחור..." />
    </div>
    <div class="row assign-list-container">
      <label>בחר בחור:</label>
      <select id="sel-student" class="assign-list" size="10"></select>
    </div>`;
  
  const updateStudentList = () => {
      const selectEl = el('#sel-student');
      const filterText = el('#search-student-assign').value.toLowerCase();
      const filterClass = el('#sel-class').value;
      const filteredStudents = allUnassigned.filter(s => {
          const classMatch = !filterClass || s.className === filterClass;
          const textMatch = !filterText || `${s.firstName} ${s.lastName}`.toLowerCase().includes(filterText) || (s.id && s.id.includes(filterText));
          return classMatch && textMatch;
      }).sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'));
      selectEl.innerHTML = filteredStudents.map(s => `<option value="${s.id}">${s.lastName} ${s.firstName} ${s.className ? `(${s.className})` : ''}</option>`).join('');
      if (selectEl.options.length > 0) { selectEl.options[0].selected = true; }
  };

  showModal('שיבוץ בחור', modalHtml, () => {
    const sid = el('#sel-student').value;
    if (!sid) { errorDialog('יש לבחור בחור מהרשימה.'); return; }
    const [ok, msg] = assignStudentToBed(bedId, sid); 
    if (!ok) errorDialog(msg);
  });
  
  el('#search-student-assign').addEventListener('input', updateStudentList);
  el('#sel-class').addEventListener('change', updateStudentList);
  updateStudentList();
  el('#search-student-assign').focus(); 
}

function promptAddStudent() {
  const modalHtml = `
    <div class="row-grid"><div class="row"><label>שם משפחה:</label><input id="in-st-ln" /></div><div class="row"><label>שם פרטי:</label><input id="in-st-fn" /></div></div>
    <div class="row-grid-3"><div class="row"><label>ת.ז:</label><input id="in-st-id-card" /></div><div class="row"><label>דרכון:</label><input id="in-st-passport" /></div><div class="row"><label>גיל:</label><input id="in-st-age" type="number" /></div></div>
    <div class="row-grid"><div class="row"><label>כיתה:</label><input id="in-st-classname" /></div><div class="row"><label>קבוצה:</label><input id="in-st-groupname" /></div></div><hr style="border:0; border-top: 1px solid var(--border); margin: 10px 0;">
    <div class="row-grid-3"><div class="row"><label>ישוב:</label><input id="in-st-city" /></div><div class="row"><label>רחוב:</label><input id="in-st-street" /></div><div class="row"><label>מספר בית:</label><input id="in-st-housenum" /></div></div>
    <div class="row"><label>נייד:</label><input id="in-st-phone" type="tel" /></div><div class="row" style="margin-top: 5px;"><small class="muted">חובה למלא ת.ז או דרכון.</small></div>`;
  showModal('הוספת בחור חדש', modalHtml, () => {
    const studentData = {
      lastName: el('#in-st-ln').value, firstName: el('#in-st-fn').value, id_card: el('#in-st-id-card').value, passport: el('#in-st-passport').value, age: el('#in-st-age').value,
      className: el('#in-st-classname').value, groupName: el('#in-st-groupname').value, street: el('#in-st-street').value, houseNum: el('#in-st-housenum').value, city: el('#in-st-city').value, phone: el('#in-st-phone').value
    };
    const [ok, msg] = addStudent(studentData);
    if (!ok) errorDialog(msg);
  });
  el('#in-st-ln').focus();
}

function updateTagDatesUI(s) {
    const selectedTags = els('.tag-checkbox:checked').map(cb => cb.value);
    const datesContainer = el('#tag-dates-container');
    datesContainer.innerHTML = '';
    let datesHtml = '';
    if (selectedTags.includes('מאורס')) {
        datesHtml += `<div class="row"><label>תאריך חתונה:</label><input id="in-wedding-date" type="date" value="${toHtmlDate(s.status_data.wedding_date)}" /></div>`;
    }
    if (selectedTags.includes('חיזוק')) {
        datesHtml += `<div class="row"><label>תאריך חזרה מחיזוק:</label><input id="in-return-date" type="date" value="${toHtmlDate(s.status_data.return_date)}" /></div>`;
    }
    if (datesHtml) datesContainer.innerHTML = `<h5 style="margin-bottom: 5px; font-weight: 700;">הגדרות תאריך מיוחדות</h5>` + datesHtml;
}

function promptEditSelectedStudent() {
  if (!selectedStudentId) { errorDialog('יש לבחור בחור מהרשימה תחילה.'); return; }
  const s = findStudent(selectedStudentId);
  if (!s) return;
  
  const ALL_TAGS = ['מאורס', 'חיזוק', 'ועד', 'מנהל'];
  const tagsHtml = ALL_TAGS.map(tag => `<label class="chip" style="cursor: pointer;"><input type="checkbox" class="tag-checkbox" value="${tag}" ${ (s.tags || []).includes(tag) ? 'checked' : ''} />${tag}</label>`).join('');
  
  const modalHtml = `
    <div class="row"><label>מזהה ראשי:</label><input value="${escapeHtml(s.id)}" disabled /></div>
    <div class="row-grid"><div class="row"><label>שם משפחה:</label><input id="in-st-ln" value="${escapeHtml(s.lastName || '')}" /></div><div class="row"><label>שם פרטי:</label><input id="in-st-fn" value="${escapeHtml(s.firstName || '')}" /></div></div>
    <div class="row-grid-3"><div class="row"><label>ת.ז:</label><input id="in-st-id-card" value="${escapeHtml(s.id_card || '')}" /></div><div class="row"><label>דרכון:</label><input id="in-st-passport" value="${escapeHtml(s.passport || '')}" /></div><div class="row"><label>גיל:</label><input id="in-st-age" type="number" value="${escapeHtml(s.age || '')}" /></div></div>
    <div class="row-grid"><div class="row"><label>כיתה:</label><input id="in-st-classname" value="${escapeHtml(s.className || '')}" /></div><div class="row"><label>קבוצה:</label><input id="in-st-groupname" value="${escapeHtml(s.groupName || '')}" /></div></div>
    <hr style="border:0; border-top: 1px solid var(--border); margin: 10px 0;">
    <div class="row"><label style="font-weight: 700;">תגיות:</label><div id="tags-selector" style="display: flex; flex-wrap: wrap; gap: 8px;">${tagsHtml}</div></div>
    <div id="tag-dates-container" class="row"></div><hr style="border:0; border-top: 1px solid var(--border); margin: 10px 0;">
    <div class="row-grid-3"><div class="row"><label>ישוב:</label><input id="in-st-city" value="${escapeHtml(s.city || '')}" /></div><div class="row"><label>רחוב:</label><input id="in-st-street" value="${escapeHtml(s.street || '')}" /></div><div class="row"><label>מספר בית:</label><input id="in-st-housenum" value="${escapeHtml(s.houseNum || '')}" /></div></div>
    <div class="row"><label>נייד:</label><input id="in-st-phone" type="tel" value="${escapeHtml(s.phone || '')}" /></div>`;
  
  showModal('עריכת פרטי בחור', modalHtml, () => {
    const selectedTags = els('#tags-selector .tag-checkbox:checked').map(cb => cb.value);
    const statusData = { wedding_date: el('#in-wedding-date')?.value, return_date: el('#in-return-date')?.value };
    const studentData = {
      lastName: el('#in-st-ln').value, firstName: el('#in-st-fn').value, id_card: el('#in-st-id-card').value, passport: el('#in-st-passport').value, age: el('#in-st-age').value,
      className: el('#in-st-classname').value, groupName: el('#in-st-groupname').value, street: el('#in-st-street').value, houseNum: el('#in-st-housenum').value, city: el('#in-st-city').value, phone: el('#in-st-phone').value,
      tags: selectedTags, status_data: statusData
    };
    const [ok, msg] = updateStudent(s.id, studentData);
    if (!ok) errorDialog(msg);
  });
  
  els('.tag-checkbox').forEach(cb => cb.addEventListener('change', () => updateTagDatesUI(s)));
  updateTagDatesUI(s);
}

function promptExportType() {
    showModal('בחר סוג גיבוי', `
        <div style="display: grid; gap: 10px;"><button class="btn secondary" id="export-option-full">גיבוי מלא</button><button class="btn secondary" id="export-option-structure">גיבוי מבנים בלבד</button><button class="btn secondary" id="export-option-students">גיבוי בחורים בלבד</button></div>`, 
        null, 'ביטול');
    el('#modal-ok').style.display = 'none'; 
    const DB = getDB();
    const dateStr = new Date().toISOString().slice(0, 10);
    el('#export-option-full').onclick = () => { downloadJSON({ ...DB, exportType: 'full' }, `Pnimia_Backup_Full_${dateStr}.json`); el('#modal-cancel').click(); };
    el('#export-option-structure').onclick = () => { const copy = JSON.parse(JSON.stringify(DB)); copy.students = []; for (const b of copy.buildings) for (const f of b.floors) for (const r of f.rooms) for (const bed of r.beds) { bed.student_id = null; bed.history = []; } downloadJSON({ ...copy, exportType: 'structure_only' }, `Pnimia_Backup_Structure_${dateStr}.json`); el('#modal-cancel').click(); };
    el('#export-option-students').onclick = () => { downloadJSON({ students: DB.students, seq: { student: DB.seq.student }, exportType: 'students_only' }, `Pnimia_Backup_Students_${dateStr}.json`); el('#modal-cancel').click(); };
}

function promptAddFutureEvent(studentId) {
    const student = findStudent(studentId);
    if (!student) return;
    showModal(`הוספת אירוע עתידי עבור ${student.firstName} ${student.lastName}`, `
        <div class="row"><label for="in-event-title">תיאור האירוע:</label><input id="in-event-title" type="text" placeholder="לדוגמה: יציאה לשבת, מבחן..."/></div>
        <div class="row"><label for="in-event-date">תאריך:</label><input id="in-event-date" type="date" /></div>`, 
    () => {
        const title = el('#in-event-title').value;
        const date = el('#in-event-date').value;
        if (!title || !date) { errorDialog('יש למלא תיאור ותאריך.'); return; }
        const newEvent = { id: Date.now(), title, date };
        if (!student.scheduled_events) student.scheduled_events = [];
        student.scheduled_events.push(newEvent);
        updateStudent(student.id, student);
    });
}

export {
    promptAddFullBuilding,
    promptResetOptions,
    promptAddFloor,
    promptAddRoom,
    promptAddBed,
    promptEditBuilding,
    promptEditFloor,
    promptEditRoom,
    promptBulkCreate,
    promptAssign,
    promptAddStudent,
    promptEditSelectedStudent,
    promptExportType,
    promptAddFutureEvent
};
