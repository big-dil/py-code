// ==================================================
//      קובץ 7: חלונות קלט וטפסים (UI Prompts)
// ==================================================

// --------------------------------------------------
//               אשף יצירת מבנה מלא
// --------------------------------------------------

function addFullBuilding(name, numFloors, numRoomsPerFloor, numBedsPerRoom) {
    name = name.trim();
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
            // יצירת מספר חדר (למשל: קומה 1 חדר 1 -> 101, קומה 2 חדר 10 -> 210)
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
        if (ok) {
            showModal('הצלחה', msg, null, 'סגור'); 
        } else {
            errorDialog(msg); 
        }
    });
    el('#in-b-name').focus();
}

// --------------------------------------------------
//               אפשרויות איפוס
// --------------------------------------------------

function promptResetOptions() {
    const modalHtml = `
        <p><strong><i class="fas fa-exclamation-triangle"></i> אזהרה:</strong> פעולה זו הינה בלתי הפיכה. בחר את סוג האיפוס הרצוי:</p>
        <div style="display: grid; gap: 10px; margin-top: 15px;">
            <button class="btn danger" id="reset-option-structures">איפוס מבנים בלבד (קומות, חדרים, מיטות)</button>
            <button class="btn danger" id="reset-option-students">איפוס בחורים בלבד (ושיבוצים)</button>
            <button class="btn danger" id="reset-option-all">איפוס כללי (מחיקת הכל)</button>
        </div>
    `;
    showModal('איפוס נתונים', modalHtml, null, 'ביטול');
    
    el('#modal-ok').style.display = 'none'; 

    el('#reset-option-structures').onclick = async () => {
        if (await confirmDialog('האם אתה בטוח שברצונך לאפס את כל המבנים? כל הקומות, החדרים והמיטות ימחקו, וכל השיבוצים יבוטלו. רשימת הבחורים תישמר.')) {
            DB.buildings = [];
            DB.seq.building = 1; DB.seq.floor = 1; DB.seq.room = 1; DB.seq.bed = 1;
            saveDB();
            el('#modal-cancel').click();
        }
    };
    el('#reset-option-students').onclick = async () => {
        if (await confirmDialog('האם אתה בטוח שברצונך לאפס את כל הבחורים? כל רשימת הבחורים תימחק וכל השיבוצים יבוטלו. מבנה הפנימייה יישמר.')) {
            DB.students = [];
            // איפוס שיבוצים
            for (const b of DB.buildings) for (const f of b.floors) for (const r of f.rooms) {
                for (const bed of r.beds) {
                    bed.student_id = null;
                    bed.history = []; 
                }
            }
            saveDB();
            el('#modal-cancel').click();
        }
    };
    el('#reset-option-all').onclick = async () => {
        if (await confirmDialog('האם אתה בטוח שברצונך לאפס את כל נתוני המערכת? **כל המבנים וכל הבחורים יימחקו לצמיתות!**')) {
            DB = { seq: {building:1, floor:1, room:1, bed:1, student:1}, buildings: [], students: [] }; 
            selectedNode = null;
            selectedStudentId = null;
            saveDB();
            el('#modal-cancel').click();
        }
    };
}

// --------------------------------------------------
//               ניהול פריטי מבנה (CRUD Prompts)
// --------------------------------------------------

function promptInput(title, label, defaultValue, onOk, inputId, inputType='text') {
    showModal(title, `
        <div class="row">
            <label>${label}</label>
            <input id="${inputId}" type="${inputType}" value="${escapeHtml(defaultValue)}" />
        </div>
    `, ()=>{ onOk(el(`#${inputId}`).value); }, ()=>{});
    el(`#${inputId}`).focus();
}

function promptAddFloor(buildingId) {
  showModal('הוספת קומה', `
    <div class="row"><label>מספר מיון (חובה, קובע את הסדר):</label><input id="in-floor-num" type="number" /></div>
    <div class="row"><label>שם תצוגה (רשות, אם ריק יוצג "קומה + מספר"):</label><input id="in-floor-display" /></div>
  `, ()=>{
    const num = el('#in-floor-num').value;
    const name = el('#in-floor-display').value;
    const [ok, msg] = addFloor(buildingId, num, name);
    if (!ok) errorDialog(msg);
  }, ()=>{});
  el('#in-floor-num').focus();
}

function promptAddRoom(floorId) {
  promptInput('הוספת חדר', 'מספר/שם חדר:', '', (num)=>{
    const [ok, msg] = addRoom(floorId, num);
    if (!ok) errorDialog(msg);
  }, 'in-room');
}

function promptAddBed(roomId) {
  promptInput('הוספת מיטה', 'מספר מיטה:', '', (num)=>{
    const [ok, msg] = addBed(roomId, num);
    if (!ok) errorDialog(msg);
  }, 'in-bed', 'number');
}

function promptEditBuilding(id, currentName) {
    promptInput('עריכת שם מבנה', 'שם המבנה החדש:', currentName, (name)=>{
        const [ok, msg] = updateBuilding(id, name);
        if (!ok) errorDialog(msg);
    }, 'in-building-name');
}

function promptEditFloor(id, currentNum, currentDisplayName) {
    showModal('עריכת קומה', `
        <div class="row"><label>מספר מיון (חובה, קובע את הסדר):</label><input id="in-floor-num" type="number" value="${escapeHtml(currentNum)}" /></div>
        <div class="row"><label>שם תצוגה (רשות):</label><input id="in-floor-display" value="${escapeHtml(currentDisplayName || '')}" /></div>
    `, ()=>{
        const num = el('#in-floor-num').value;
        const name = el('#in-floor-display').value;
        const [ok, msg] = updateFloor(id, num, name);
        if (!ok) errorDialog(msg);
    }, ()=>{});
    el('#in-floor-num').focus();
}

function promptEditRoom(id, currentNum) {
    promptInput('עריכת מספר/שם חדר', 'מספר/שם החדר החדש:', currentNum, (num)=>{
        const [ok, msg] = updateRoom(id, num);
        if (!ok) errorDialog(msg);
    }, 'in-room');
}

// --------------------------------------------------
//               יצירה מרובה (Bulk)
// --------------------------------------------------

function promptBulkCreate(type, parentId, itemLabel, inputPlaceholder, logicFn, inputType='text') {
    const title = `הוספת ${type} מרובים`;
    showModal(title, `
        <div class="row">
            <label>${inputPlaceholder}</label>
            <input id="in-bulk-items" type="${inputType}" placeholder="${inputPlaceholder}" />
            <div class="muted" style="margin-top: 5px;">הפרד עם פסיקים או השתמש בטווחים (למשל: 1-4, 6)</div>
        </div>
    `,
    ()=>{
        const input = el('#in-bulk-items').value;
        if (!input.trim()) { errorDialog('הקלט ריק.'); return; }
        const results = logicFn(parentId, input); 
        let summary = `נוספו בהצלחה ${results.added} ${type}.`;
        if (results.failed.length > 0) {
            summary += `<br><br><strong>${results.failed.length} ${itemLabel} נכשלו (קיימים או קלט לא חוקי):</strong><br>${results.failed.slice(0, 5).join(', ')}${results.failed.length > 5 ? '...' : ''}`;
        }
        showModal('סיכום הוספה', `<div class="row">${summary}</div>`, null, 'סגור');

    }, ()=>{});
    el('#in-bulk-items').focus();
}

// --------------------------------------------------
//               שיבוץ בחור (Assign)
// --------------------------------------------------

function promptAssign(bedId) {
  const allUnassigned = getUnassignedStudents(); 
  
  // יצירת רשימת כיתות ייחודית לסינון
  const uniqueClasses = Array.from(new Set(allUnassigned.map(s => s.className).filter(c => c))).sort();
  const classOptions = uniqueClasses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  const modalHtml = `
    <div class="assign-toolbar">
        <select id="sel-class" class="assign-select">
            <option value="">(כל השיעורים)</option>
            ${classOptions}
        </select>
        <input id="search-student-assign" class="assign-search" placeholder="חפש שם בחור..." />
    </div>
    <div class="row assign-list-container">
      <label>בחר בחור:</label>
      <select id="sel-student" class="assign-list" size="10"></select>
    </div>
  `;
  
  const updateStudentList = () => {
      const selectEl = el('#sel-student');
      const filterText = el('#search-student-assign').value.toLowerCase();
      const filterClass = el('#sel-class').value;
      
      const filteredStudents = allUnassigned.filter(s => {
          const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
          const classMatch = !filterClass || s.className === filterClass;
          const textMatch = !filterText || fullName.includes(filterText) || (s.id && s.id.includes(filterText));
          return classMatch && textMatch;
      }).sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'));

      selectEl.innerHTML = filteredStudents.map(s => {
          const className = s.className ? ` (שיעור: ${escapeHtml(s.className)})` : '';
          return `<option value="${s.id}">${escapeHtml(s.lastName)} ${escapeHtml(s.firstName)}${className}</option>`
      }).join('');

      if (selectEl.options.length > 0) {
          selectEl.options[0].selected = true;
      }
  };

  showModal('שיבוץ בחור', modalHtml,
  ()=>{
    const sid = el('#sel-student').value;
    if (!sid) {
        errorDialog('יש לבחור בחור מהרשימה כדי לבצע שיבוץ.');
        return;
    }
    assignStudentToBed(bedId, sid); 
  }, ()=>{});
  
  el('#search-student-assign').addEventListener('input', updateStudentList);
  el('#sel-class').addEventListener('change', updateStudentList);

  updateStudentList();
  el('#search-student-assign').focus(); 
}

// --------------------------------------------------
//               ניהול בחורים (Add/Edit)
// --------------------------------------------------

function promptAddStudent() {
  showModal('הוספת בחור חדש', `
    <div class="row-grid">
        <div class="row"><label>שם משפחה (חובה):</label><input id="in-st-ln" /></div>
        <div class="row"><label>שם פרטי (חובה):</label><input id="in-st-fn" /></div>
    </div>
    <div class="row-grid-3">
        <div class="row"><label>תעודת זהות:</label><input id="in-st-id-card" /></div>
        <div class="row"><label>מס דרכון:</label><input id="in-st-passport" /></div>
        <div class="row"><label>גיל:</label><input id="in-st-age" type="number" /></div>
    </div>
    <div class="row-grid">
        <div class="row"><label>כיתה:</label><input id="in-st-classname" /></div>
        <div class="row"><label>קבוצה (גל):</label><input id="in-st-groupname" /></div>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border); margin: 10px 0;">
    <div class="row-grid-3">
        <div class="row"><label>ישוב:</label><input id="in-st-city" /></div>
        <div class="row"><label>רחוב:</label><input id="in-st-street" /></div>
        <div class="row"><label>מספר בית/דירה:</label><input id="in-st-housenum" /></div>
    </div>
    <div class="row"><label>נייד תלמיד:</label><input id="in-st-phone" type="tel" /></div>
    <div class="row" style="margin-top: 5px;"><small class="muted">חובה למלא לפחות אחד מהשדות: תעודת זהות או מס דרכון.</small></div>
  `,
  ()=>{
    const studentData = {
      lastName: el('#in-st-ln').value,
      firstName: el('#in-st-fn').value,
      id_card: el('#in-st-id-card').value,
      passport: el('#in-st-passport').value,
      age: el('#in-st-age').value,
      className: el('#in-st-classname').value,
      groupName: el('#in-st-groupname').value,
      street: el('#in-st-street').value,
      houseNum: el('#in-st-housenum').value,
      city: el('#in-st-city').value,
      phone: el('#in-st-phone').value
    };
    const [ok, msg] = addStudent(studentData);
    if (!ok) errorDialog(msg);
    else if (typeof renderStudents === 'function') renderStudents();
  }, ()=>{});
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
    if (datesHtml) datesContainer.innerHTML = `<h5 style="margin-bottom: 5px; font-weight: 700; color: var(--accent-2);">הגדרות תאריך מיוחדות</h5>` + datesHtml;
}

function promptEditSelectedStudent() {
  if (!selectedStudentId) { errorDialog('יש לבחור בחור מהרשימה תחילה.'); return; }
  const s = findStudent(selectedStudentId);
  if (!s) return;
  
  const ALL_TAGS = ['מאורס', 'חיזוק', 'ועד', 'מנהל'];
  const currentTags = s.tags || [];

  const tagsHtml = ALL_TAGS.map(tag => {
    const isChecked = currentTags.includes(tag);
    const tagClass = isChecked ? `chip tag-${tag.toLowerCase()}` : 'chip';
    return `<label class="${tagClass}" style="cursor: pointer; user-select: none;">
            <input type="checkbox" class="tag-checkbox" value="${tag}" ${isChecked ? 'checked' : ''} style="margin-left: 5px;" />
            ${tag}</label>`;
  }).join('');
  
  const modalHtml = `
    <div class="row"><label>מזהה ראשי (ת.ז או דרכון):</label><input value="${escapeHtml(s.id)}" disabled /></div>
    <div class="row-grid">
        <div class="row"><label>שם משפחה (חובה):</label><input id="in-st-ln" value="${escapeHtml(s.lastName || '')}" /></div>
        <div class="row"><label>שם פרטי (חובה):</label><input id="in-st-fn" value="${escapeHtml(s.firstName || '')}" /></div>
    </div>
    <div class="row-grid-3">
        <div class="row"><label>תעודת זהות:</label><input id="in-st-id-card" value="${escapeHtml(s.id_card || '')}" /></div>
        <div class="row"><label>מס דרכון:</label><input id="in-st-passport" value="${escapeHtml(s.passport || '')}" /></div>
        <div class="row"><label>גיל:</label><input id="in-st-age" type="number" value="${escapeHtml(s.age || '')}" /></div>
    </div>
    <div class="row-grid">
        <div class="row"><label>כיתה:</label><input id="in-st-classname" value="${escapeHtml(s.className || '')}" /></div>
        <div class="row"><label>קבוצה (גל):</label><input id="in-st-groupname" value="${escapeHtml(s.groupName || '')}" /></div>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border); margin: 10px 0;">
    <div class="row"><label style="font-weight: 700;">תגיות וסטטוסים מיוחדים:</label>
        <div id="tags-selector" style="display: flex; flex-wrap: wrap; gap: 8px;">${tagsHtml}</div>
    </div>
    <div id="tag-dates-container" class="row"></div>
    <hr style="border:0; border-top: 1px solid var(--border); margin: 10px 0;">
    <div class="row-grid-3">
        <div class="row"><label>ישוב:</label><input id="in-st-city" value="${escapeHtml(s.city || '')}" /></div>
        <div class="row"><label>רחוב:</label><input id="in-st-street" value="${escapeHtml(s.street || '')}" /></div>
        <div class="row"><label>מספר בית/דירה:</label><input id="in-st-housenum" value="${escapeHtml(s.houseNum || '')}" /></div>
    </div>
    <div class="row"><label>נייד תלמיד:</label><input id="in-st-phone" type="tel" value="${escapeHtml(s.phone || '')}" /></div>
  `;
  
  showModal('עריכת פרטי בחור', modalHtml,
  ()=>{
    const selectedTags = els('#tags-selector .tag-checkbox:checked').map(cb => cb.value);
    const statusData = {};
    if (selectedTags.includes('מאורס')) statusData.wedding_date = el('#in-wedding-date') ? el('#in-wedding-date').value : '';
    if (selectedTags.includes('חיזוק')) statusData.return_date = el('#in-return-date') ? el('#in-return-date').value : '';

    const studentData = {
      lastName: el('#in-st-ln').value,
      firstName: el('#in-st-fn').value,
      id_card: el('#in-st-id-card').value,
      passport: el('#in-st-passport').value,
      age: el('#in-st-age').value,
      className: el('#in-st-classname').value,
      groupName: el('#in-st-groupname').value,
      street: el('#in-st-street').value,
      houseNum: el('#in-st-housenum').value,
      city: el('#in-st-city').value,
      phone: el('#in-st-phone').value,
      tags: selectedTags,
      status_data: statusData
    };
    const [ok, msg] = updateStudent(s.id, studentData);
    if (!ok) errorDialog(msg);
    else if (typeof renderStudents === 'function') renderStudents(); 
  }, ()=>{});
  
  els('.tag-checkbox').forEach(cb => cb.addEventListener('change', () => updateTagDatesUI(s)));
  updateTagDatesUI(s);
}

// --------------------------------------------------
//               גיבוי JSON - בחירת סוג
// --------------------------------------------------

function promptExportType() {
    const modalHtml = `
        <div class="row">
            <p>בחר אילו נתונים לגבות לקובץ ה-JSON:</p>
        </div>
        <div style="display: grid; gap: 10px;">
            <button class="btn secondary" id="export-option-full">גיבוי מלא (מבנים, בחורים ושיבוצים)</button>
            <button class="btn secondary" id="export-option-structure">גיבוי מבנים בלבד (תבנית)</button>
            <button class="btn secondary" id="export-option-students">גיבוי בחורים בלבד</button>
        </div>
    `;
    showModal('בחר סוג גיבוי', modalHtml, null, 'ביטול');
    el('#modal-ok').style.display = 'none'; 
    
    const hebrewDateStr = toHebrewDate(new Date().toISOString()).replace(/ /g, '_') || new Date().toISOString().slice(0, 10);

    el('#export-option-full').onclick = () => {
        const dbCopy = JSON.parse(JSON.stringify(DB)); 
        dbCopy.exportType = 'full';
        downloadJSON(dbCopy, `Pnimia_Backup_Full_${hebrewDateStr}.json`);
        el('#modal-cancel').click(); 
    };
    
    el('#export-option-structure').onclick = () => {
        const structureCopy = JSON.parse(JSON.stringify(DB));
        structureCopy.students = []; 
        for (const b of structureCopy.buildings) {
            for (const f of b.floors) {
                for (const r of f.rooms) {
                    for (const bed of r.beds) {
                        bed.student_id = null;
                        bed.history = []; 
                    }
                }
            }
        }
        structureCopy.exportType = 'structure_only';
        downloadJSON(structureCopy, `Pnimia_Backup_Structure_${hebrewDateStr}.json`);
        el('#modal-cancel').click();
    };
    
    el('#export-option-students').onclick = () => {
        const studentsOnly = {
            students: DB.students,
            seq: { student: DB.seq.student }, 
            exportType: 'students_only'
        };
        downloadJSON(studentsOnly, `Pnimia_Backup_Students_${hebrewDateStr}.json`);
        el('#modal-cancel').click();
    };
}
