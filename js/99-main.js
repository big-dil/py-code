let selectedNode = null; 
let selectedStudentId = null; 

function refreshAll(scrollToId = null) {
    const roomFilter = el('#search-rooms') ? el('#search-rooms').value : '';
    renderTree(roomFilter); 
    renderStudents(el('#search-student').value || ''); 
    updateActionsPanel(); 

    if (scrollToId) {
      setTimeout(() => {
        const targetEl = el(`.bed-cell[data-id="${scrollToId}"]`);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
    // כפתורים כלליים
    el('#btn-add-building').onclick = promptAddFullBuilding;
    el('#btn-reset-data').onclick = promptResetOptions;
    
    // ייבוא וייצוא
    el('#btn-export-db').onclick = promptExportType;
    el('#btn-import-db').onclick = () => el('#json-file-input').click();
    el('#json-file-input').onchange = (e) => { if(e.target.files[0]) importDB(e.target.files[0]); };
    
    el('#btn-import-students').onclick = () => el('#csv-file-input').click();
    el('#csv-file-input').onchange = handleCSVFile;
    el('#btn-export-students-csv').onclick = exportStudentsToCSV;

    // חיפוש
    el('#search-rooms').oninput = (e) => { selectedNode = null; renderTree(e.target.value); };
    el('#search-student').oninput = (e) => renderStudents(e.target.value);

    // סטודנטים
    el('#btn-add-student').onclick = () => { /* promptAddStudent... */ }; // (לממש ב-prompts)
    el('#btn-edit-student').onclick = promptEditSelectedStudent;
    el('#btn-del-student').onclick = async () => {
        if(await confirmDialog('למחוק?')) { deleteStudent(selectedStudentId); renderStudents(); }
    };

    // מחיקת פריט עץ
    el('#btn-delete').onclick = async () => {
        if(!selectedNode) return;
        if(await confirmDialog('למחוק פריט?')) {
             const {type, id} = selectedNode;
             if(type==='b') deleteBuilding(id);
             else if(type==='f') deleteFloor(id);
             else if(type==='r') deleteRoom(id);
             else if(type==='bed') deleteBed(id);
             selectedNode = null;
             refreshAll();
        }
    };

    refreshAll();
});
