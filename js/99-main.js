// ==================================================
//      קובץ 9: אתחול ראשי (Main Initialization)
// ==================================================

import { el, els, debounce } from './01-utils.js';
import { deleteBuilding, deleteFloor, deleteRoom, deleteBed, deleteStudent } from './02-data-manager.js';
import { importDB, exportStudentsToCSV, handleCSVFile } from './03-io.js';
import { confirmDialog, errorDialog, handleNodeSelection, selectedNode, selectedStudentId, setSelectedNode, setSelectedStudentId, switchTab } from './04-ui-core.js';
import { buildTree, filterTree, updateStats } from './05-ui-tree.js';
import { updateActionsPanel } from './06-ui-actions.js';
import { promptAddFullBuilding, promptResetOptions, promptExportType, promptAddStudent, promptEditSelectedStudent } from './07-ui-prompts.js';
import { renderStudents, getGridApi } from './08-ui-students.js';
import { renderReports } from './10-ui-reports.js';
import { renderAuditLog } from './11-ui-audit.js';
import { renderStatusBoard } from './12-ui-status-board.js';

// --------------------------------------------------
//               UI Refresh Logic
// --------------------------------------------------
function refreshAll() {
  buildTree();
  renderStudents(); 
  updateActionsPanel();
  updateSelectionUI();
  const currentFilter = el('#search-rooms') ? el('#search-rooms').value : '';
  filterTree(currentFilter);
}

function updateSelectionUI() {
    updateActionsPanel();
}

const debouncedFilter = debounce((query) => filterTree(query), 200);

// --------------------------------------------------
//               Global Event Listeners
// --------------------------------------------------

document.addEventListener('db-updated', () => {
    // Re-render whatever tab is currently active
    const activeTab = el('.sidebar-menu .active').id.replace('menu-', '');
    switchTab(activeTab);
});

document.addEventListener('selection-changed', (e) => {
    updateSelectionUI();
    const scrollToId = e.detail ? e.detail.scrollToId : null;
    if (scrollToId) {
        setTimeout(() => {
            const targetEl = el(`.bed-cell[data-id="${scrollToId}"]`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('flash');
                setTimeout(() => targetEl.classList.remove('flash'), 1500);
            }
        }, 50);
    }
});

document.addEventListener('tab-switched', (e) => {
    const { key } = e.detail;
    
    if (key === 'status-board') {
        renderStatusBoard();
    } else if (key === 'manage' || key === 'students') {
        refreshAll();
        if (key === 'students') {
            setTimeout(() => { const gridApi = getGridApi(); if (gridApi) gridApi.sizeColumnsToFit(); }, 50);
        }
    } else if (key === 'reports') {
        renderReports();
    } else if (key === 'audit') {
        renderAuditLog();
    }
});


// --------------------------------------------------
//               Initialization
// --------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // Use event delegation for all clicks
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Tab Switching
        if (target.closest('#menu-status-board')) switchTab('status-board');
        else if (target.closest('#menu-manage')) switchTab('manage');
        else if (target.closest('#menu-students')) switchTab('students');
        else if (target.closest('#menu-reports')) switchTab('reports');
        else if (target.closest('#menu-audit')) switchTab('audit');
        else if (target.closest('#menu-settings')) Swal.fire('בקרוב...', 'הגדרות המערכת יהיו זמינות כאן בעתיד.', 'info');

        // Top Buttons
        else if (target.closest('#btn-add-building')) promptAddFullBuilding();
        else if (target.closest('#btn-reset-data')) promptResetOptions();
        else if (target.closest('#btn-export-db')) promptExportType();
        else if (target.closest('#btn-import-db')) el('#json-file-input').click();
        
        // CSV Buttons
        else if (target.closest('#btn-import-students')) el('#csv-file-input').click();
        else if (target.closest('#btn-export-students-csv')) exportStudentsToCSV();
        
        // Student Buttons
        else if (target.closest('#btn-add-student')) promptAddStudent();
        else if (target.closest('#btn-edit-student')) promptEditSelectedStudent();
        else if (target.closest('#btn-del-student')) {
            if (!selectedStudentId) { errorDialog('יש לבחור בחור מהרשימה תחילה.'); return; }
            if (await confirmDialog('האם אתה בטוח? פעולה זו תסיר את הבחור ותפנה את מיטתו אם משובץ.')) {
                deleteStudent(selectedStudentId);
                setSelectedStudentId(null);
            }
        }
        
        // Main Delete Button
        else if (target.closest('#btn-delete')) {
            if (!selectedNode) return;
            const { type, id } = selectedNode;
            if (await confirmDialog('האם אתה בטוח שברצונך למחוק את הפריט הנבחר?')) {
                const actions = { 'b': deleteBuilding, 'f': deleteFloor, 'r': deleteRoom, 'bed': deleteBed };
                const [ok, msg] = actions[type] ? actions[type](id) : [true];
                if (!ok) errorDialog(msg); 
                else setSelectedNode(null); 
            }
        }

// Pane Toggles
        const toggle = target.closest('.pane-toggle');
        if (toggle) {
            const paneType = toggle.dataset.pane;
            if (paneType === 'actions') {
                el('.main').classList.toggle('actions-collapsed');
            } else if (paneType === 'timeline') {
                // ביצוע הכיווץ/הרחבה של הפאנל
                el('#pane-students').classList.toggle('timeline-collapsed');
                
                // עדכון הטבלה שתתפוס את כל השטח שהתפנה
                setTimeout(() => {
                    const gridApi = getGridApi();
                    if (gridApi) {
                        gridApi.sizeColumnsToFit(); // פקודה למתיחת העמודות לכל רוחב המיכל
                    }
                }, 250); // המתנה קצרה לסיום האנימציה של ה-CSS
            }
        }
    });

    // --- File Inputs and Search ---
    el('#json-file-input').addEventListener('change', (e) => { if (e.target.files[0]) importDB(e.target.files[0]); e.target.value = ''; });
    el('#csv-file-input').addEventListener('change', handleCSVFile);
    el('#search-rooms').addEventListener('input', (e) => debouncedFilter(e.target.value));
    el('#search-student').addEventListener('input', (e) => {
         const gridApi = getGridApi();
         if (gridApi) gridApi.setGridOption('quickFilterText', e.target.value);
    });

    // --- Global Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || !el('#modal-backdrop').classList.contains('hidden')) return;
      if (e.key === 'Delete') {
        if (selectedNode && !el('#pane-manage').classList.contains('hidden')) el('#btn-delete').click();
        else if (selectedStudentId && !el('#pane-students').classList.contains('hidden')) el('#btn-del-student').click();
      }
    });

    // --- Initial Load ---
    setTimeout(() => {
        switchTab('status-board');
        console.log('System v6.4 (Event Delegation) Initialized Successfully.');
    }, 100);
});

// Export functions for circular dependencies
export { refreshAll, handleNodeSelection };
