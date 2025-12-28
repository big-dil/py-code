function promptAddFullBuilding() { /* ... */ }
function promptAddFloor(buildingId) { /* ... */ }
function promptAddRoom(floorId) { /* ... */ }
function promptAddBed(roomId) { /* ... */ }
function promptEditBuilding(id, name) { /* ... */ }
function promptEditFloor(id, num, display) { /* ... */ }
function promptEditRoom(id, num) { /* ... */ }

function promptBulkCreate(type, parentId, label, placeholder, logicFn) {
    showModal(`הוספת ${type}`, `<div class="row"><input id="in-bulk" placeholder="${placeholder}"/></div>`, () => {
        const res = logicFn(parentId, el('#in-bulk').value);
        showModal('סיכום', `נוספו: ${res.added}`, null, 'סגור');
    });
}

function promptAssign(bedId) {
    // לוגיקת שיבוץ עם Select וחיפוש...
    // ...
}

function promptEditSelectedStudent() {
    if (!selectedStudentId) return;
    const s = findStudent(selectedStudentId);
    // בניית טופס עריכה גדול...
    // ...
}

function promptResetOptions() { /* ... */ }
function promptExportType() { /* ... */ }
