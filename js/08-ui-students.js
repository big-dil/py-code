// ==================================================
//      קובץ 8: ניהול טבלת תלמידים (AG Grid Enterprise)
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
    
    const btnEdit = document.querySelector('#btn-edit-student');
    const btnDel = document.querySelector('#btn-del-student');
    
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
        headerCheckboxSelection: true,
        enableRowGroup: true // מאפשר לקבץ לפי עמודה זו (Enterprise)
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
    
    // הגדרות כיוון ושפה (חשוב!)
    enableRtl: true, 
    localeText: typeof AG_GRID_LOCALE_IL !== 'undefined' ? AG_GRID_LOCALE_IL : undefined, 

    // הגדרות בחירה ותצוגה
    rowSelection: 'single', 
    animateRows: true, 
    rowHeight: 45, 

    // --- הגדרות Enterprise ---
    enableRangeSelection: true,   // מאפשר גרירת בחירה על תאים (כמו אקסל)
    rowGroupPanelShow: 'always',  // מציג את אזור הגרירה לקיבוץ בראש הטבלה
    suppressContextMenu: false,   // מאפשר תפריט קליק ימני (ברירת מחדל ב-Enterprise)
    
    // הגדרת תפריט קליק ימני מותאם אישית (אופציונלי)
    getContextMenuItems: (params) => {
        return [
            'copy',
            'copyWithHeaders',
            'separator',
            'export', // מאפשר ייצוא לאקסל ול-CSV
            'separator',
            'autoSizeAll',
            'resetColumns'
        ];
    },

    // אירועים
    onSelectionChanged: (event) => {
        const selectedRows = gridApi.getSelectedRows();
        if (selectedRows.length > 0) {
            onStudentSelected(selectedRows[0].id);
        } else {
            onStudentSelected(null);
        }
    },

    onRowDoubleClicked: (event) => {
        // בודק שזו שורת נתונים ולא שורת קבוצה (Group Row)
        if (event.data && event.data.id) {
            selectedStudentId = event.data.id;
            // פונקציה מקובץ prompts.js
            if (typeof promptEditSelectedStudent === 'function') {
                promptEditSelectedStudent();
            }
        }
    }
};

// --------------------------------------------------
//               רינדור הטבלה
// --------------------------------------------------

function renderStudents(filter = '') {
    const gridDiv = document.querySelector('#myGrid');
    
    // מניעת שגיאות אם האלמנט לא קיים או מוסתר
    if (!gridDiv || gridDiv.offsetParent === null) {
        return;
    }

    // הכנת המידע לתצוגה (הוספת שדה מחושב של מיקום)
    // הערה: ב-Enterprise זה יעבוד גם עם קיבוץ, כיוון שהמידע השטוח מועבר ל-ag-grid שמבצע את הקיבוץ לבד
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
                if (node.data && node.data.id === selectedStudentId) {
                    node.setSelected(true);
                }
            });
        }
    }
}
