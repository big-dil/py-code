// ==================================================
//      קובץ 8: ניהול טבלת תלמידים (AG Grid)
// ==================================================

// משתנה גלובלי לאינסטנס של הטבלה
let gridApi = null; 

/**
 * פונקציה המופעלת כאשר שורה נבחרת בטבלה
 * מפעילה/מנטרלת את כפתורי העריכה והמחיקה
 */
function onStudentSelected(id) {
    selectedStudentId = id;
    const hasSelection = !!selectedStudentId;
    
    const btnEdit = el('#btn-edit-student');
    const btnDel = el('#btn-del-student');
    
    if (btnEdit) btnEdit.disabled = !hasSelection;
    if (btnDel) btnDel.disabled = !hasSelection;
}

// --------------------------------------------------
//               הגדרת עמודות הטבלה
// --------------------------------------------------

const gridColumnDefs = [
    { 
        headerName: "שם משפחה", 
        field: "lastName", 
        sortable: true, 
        filter: true, 
        width: 130, 
        pinned: 'right', 
        checkboxSelection: true, 
        headerCheckboxSelection: true 
    },
    { 
        headerName: "שם פרטי", 
        field: "firstName", 
        sortable: true, 
        filter: true, 
        width: 130 
    },
    { 
        headerName: "סטטוס / תגיות", 
        field: "tags", 
        sortable: false, 
        filter: false, 
        flex: 1, 
        minWidth: 150,
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
        width: 90 
    },
    { 
        headerName: "ישוב", 
        field: "city", 
        sortable: true, 
        filter: true, 
        width: 110 
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
        cellStyle: params => {
            // צבע ירוק אם משובץ, אדום אם לא
            return { 
                color: params.value.includes('לא משובץ') ? '#ef4444' : '#10b981',
                fontWeight: '600'
            };
        }
    }
];

// --------------------------------------------------
//               הגדרות הטבלה (Options)
// --------------------------------------------------

const gridOptions = {
    columnDefs: gridColumnDefs,
    rowData: [], 
    enableRtl: true, 
    rowSelection: 'single', 
    animateRows: true, 
    rowHeight: 45, 
    
    // תרגום טקסטים לעברית
    localeText: {
        filterOoo: 'סינון...', equals: 'שווה ל', notEqual: 'לא שווה ל',
        contains: 'מכיל', notContains: 'לא מכיל', startsWith: 'מתחיל ב', endsWith: 'נגמר ב',
        noRowsToShow: 'אין נתונים להצגה', loadingOoo: 'טוען נתונים...'
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
        selectedStudentId = event.data.id;
        // פונקציה מקובץ prompts.js
        if (typeof promptEditSelectedStudent === 'function') {
            promptEditSelectedStudent();
        }
    }
};

// --------------------------------------------------
//               רינדור הטבלה
// --------------------------------------------------

function renderStudents(filter = '') {
    const gridDiv = document.querySelector('#myGrid');
    
    // תיקון באג: מניעת רינדור אם הקונטיינר מוסתר (מונע עיוותים ב-AG Grid)
    if (!gridDiv || gridDiv.offsetParent === null) {
        return;
    }

    // הכנת המידע לתצוגה (הוספת שדה מחושב של מיקום)
    const rowData = DB.students.map(s => {
        let locationText = 'לא משובץ';
        const loc = getStudentBed(s.id);
        if (loc) {
            const floorName = loc.floor.displayName || `קומה ${loc.floor.floor_number}`;
            locationText = `${loc.building.name}, ${floorName}, חדר ${loc.room.room_number}, מ' ${loc.bed.bed_number}`;
        }
        return { ...s, locationText };
    });

    // אתחול ראשוני אם לא קיים
    if (!gridApi && gridDiv) {
        gridApi = agGrid.createGrid(gridDiv, gridOptions);
    }

    // עדכון נתונים
    if (gridApi) {
        gridApi.setGridOption('rowData', rowData);
        gridApi.setGridOption('quickFilterText', filter);
        
        // שחזור בחירה אם הייתה
        if (selectedStudentId) {
            gridApi.forEachNode(node => {
                if (node.data.id === selectedStudentId) {
                    node.setSelected(true);
                }
            });
        }
    }
}
