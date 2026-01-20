// ==================================================
//      קובץ 8: ניהול טבלת תלמידים (AG Grid Enterprise)
// ==================================================

import { toHebrewDate } from './01-utils.js';
import { getDB, getStudentBed } from './02-data-manager.js';
import { selectedStudentId, setSelectedStudentId } from './04-ui-core.js';
import { promptEditSelectedStudent } from './07-ui-prompts.js';
import { renderStudentTimeline } from './13-ui-timeline.js';

let gridApi = null; 

function getGridApi() {
    return gridApi;
}

function onStudentSelected(id) {
    setSelectedStudentId(id);
    renderStudentTimeline(id); // Render the timeline for the selected student
    
    // The timeline panel now has its own edit/delete buttons
    // const hasSelection = !!id;
    // const btnEdit = document.querySelector('#btn-edit-student');
    // const btnDel = document.querySelector('#btn-del-student');
    // if (btnEdit) btnEdit.disabled = !hasSelection;
    // if (btnDel) btnDel.disabled = !hasSelection;
}

const gridColumnDefs = [
    { 
        headerName: "שם משפחה", 
        field: "lastName", 
        sortable: true, 
        filter: true, 
        width: 130, 
        pinned: 'right', 
        checkboxSelection: true, 
        headerCheckboxSelection: true,
        enableRowGroup: true 
    },
    { 
        headerName: "שם פרטי", 
        field: "firstName", 
        sortable: true, 
        filter: true, 
        width: 130,
        enableRowGroup: true 
    },
    { 
        headerName: "סטטוס / תגיות", 
        field: "tags", 
        sortable: false, 
        filter: false, 
        flex: 1, 
        minWidth: 150,
        enableRowGroup: true,
        cellRenderer: (params) => {
            if (!params.value || params.value.length === 0) return '';
            return params.value.map(tag => {
                let cls = 'normal';
                let icon = '';
                let extra = '';
                
                if (tag === 'מאורס') { 
                    cls = 'maoras'; icon = '💍 '; 
                    if (params.data.status_data?.wedding_date) {
                        extra = ` (${toHebrewDate(params.data.status_data.wedding_date)})`;
                    }
                }
                else if (tag === 'חיזוק') { 
                    cls = 'hizuk'; icon = '↩️ '; 
                    if (params.data.status_data?.return_date) {
                        extra = ` (${toHebrewDate(params.data.status_data.return_date)})`;
                    }
                }
                
                return `<span class="grid-chip ${cls}">${icon}${tag}${extra}</span>`;
            }).join('');
        }
    },
    { 
        headerName: "תעודת זהות", 
        field: "id", 
        sortable: true, 
        filter: 'agTextColumnFilter', 
        width: 120 
    },
    { 
        headerName: "כיתה", 
        field: "className", 
        sortable: true, 
        filter: true, 
        width: 90,
        enableRowGroup: true
    },
    { 
        headerName: "ישוב", 
        field: "city", 
        sortable: true, 
        filter: true, 
        width: 110,
        enableRowGroup: true
    },
    { 
        headerName: "טלפון", 
        field: "phone", 
        sortable: false, 
        filter: 'agTextColumnFilter', 
        width: 120 
    },
    { 
        headerName: "מיקום שיבוץ", 
        field: "locationText", 
        sortable: true, 
        filter: 'agTextColumnFilter', 
        flex: 1,
        minWidth: 200,
        enableRowGroup: true,
        cellStyle: params => {
            if (!params.value) return null;
            return { 
                color: params.value.includes('לא משובץ') ? '#ef4444' : '#10b981',
                fontWeight: '600'
            };
        }
    }
];

const gridOptions = {
    columnDefs: gridColumnDefs,
    rowData: [], 
    
    enableRtl: true, 
    localeText: typeof AG_GRID_LOCALE_IL !== 'undefined' ? AG_GRID_LOCALE_IL : undefined, 

    rowSelection: 'single', 
    animateRows: true, 
    rowHeight: 45, 

    enableRangeSelection: true,
    rowGroupPanelShow: 'always',
    suppressContextMenu: false,
    
    getContextMenuItems: (params) => {
        return [
            'copy',
            'copyWithHeaders',
            'separator',
            'export',
            'separator',
            'autoSizeAll',
            'resetColumns'
        ];
    },

    onSelectionChanged: (event) => {
        const selectedRows = gridApi.getSelectedRows();
        if (selectedRows.length > 0) {
            onStudentSelected(selectedRows[0].id);
        } else {
            onStudentSelected(null);
        }
    },

    onRowDoubleClicked: (event) => {
        if (event.data && event.data.id) {
            setSelectedStudentId(event.data.id);
            promptEditSelectedStudent();
        }
    }
};

function renderStudents(filter = '') {
    const gridDiv = document.querySelector('#myGrid');
    
    if (!gridDiv || gridDiv.offsetParent === null) {
        return;
    }

    const DB = getDB();
    const rowData = DB.students.map(s => {
        let locationText = 'לא משובץ';
        const loc = getStudentBed(s.id);
        if (loc) {
            const floorName = loc.floor.displayName || `קומה ${loc.floor.floor_number}`;
            locationText = `${loc.building.name}, ${floorName}, חדר ${loc.room.room_number}, מ' ${loc.bed.bed_number}`;
        }
        return { ...s, locationText };
    });

    if (!gridApi && gridDiv) {
        gridApi = agGrid.createGrid(gridDiv, gridOptions);
    }

    if (gridApi) {
        gridApi.setGridOption('rowData', rowData);
        gridApi.setGridOption('quickFilterText', filter);
        
        if (selectedStudentId) {
            gridApi.forEachNode(node => {
                if (node.data && node.data.id === selectedStudentId) {
                    node.setSelected(true);
                }
            });
        }
    }
}

export { renderStudents, getGridApi };