let gridApi = null; 

const gridOptions = {
    columnDefs: [
        { headerName: "שם משפחה", field: "lastName", sortable: true, filter: true, width: 130, pinned: 'right', checkboxSelection: true },
        { headerName: "שם פרטי", field: "firstName", sortable: true, filter: true, width: 130 },
        { headerName: "תגיות", field: "tags", /* renderer... */ },
        { headerName: "ת.ז", field: "id", width: 120 },
        { headerName: "כיתה", field: "className", width: 90 },
        { headerName: "מיקום", field: "locationText", flex: 1 }
    ],
    rowData: [], 
    enableRtl: true, 
    rowSelection: 'single', 
    onSelectionChanged: () => {
        const rows = gridApi.getSelectedRows();
        selectedStudentId = rows.length ? rows[0].id : null;
        const has = !!selectedStudentId;
        el('#btn-edit-student').disabled = !has;
        el('#btn-del-student').disabled = !has;
    },
    onRowDoubleClicked: (e) => {
        selectedStudentId = e.data.id;
        promptEditSelectedStudent();
    }
};

function renderStudents(filter = '') {
    const gridDiv = el('#myGrid');
    if (!gridDiv || gridDiv.offsetParent === null) return;

    const rowData = DB.students.map(s => {
        let locationText = 'לא משובץ';
        const loc = getStudentBed(s.id);
        if (loc) locationText = `${loc.building.name}, חדר ${loc.room.room_number}, מ' ${loc.bed.bed_number}`;
        return { ...s, locationText };
    });

    if (!gridApi) gridApi = agGrid.createGrid(gridDiv, gridOptions);
    if (gridApi) {
        gridApi.setGridOption('rowData', rowData);
        gridApi.setGridOption('quickFilterText', filter);
    }
}
