function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2); 
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); 
    URL.revokeObjectURL(url); 
}

// לוגיקת CSV
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];
    let dataLines = lines;
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('שם') || firstLine.includes('תעודה')) dataLines = lines.slice(1); 
    const students = [];
    dataLines.forEach((line) => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')); 
        if (values.length >= 10) {
            const [lastName, firstName, id_card, passport] = [values[0], values[1], values[2], values[3]].map(v => v ? v.trim() : '');
            if ((!id_card && !passport) || !firstName || !lastName) return; 
            students.push({
                lastName, firstName, id_card, passport,
                age: values[4]||'', className: values[5]||'', street: values[6]||'', houseNum: values[7]||'', city: values[8]||'', phone: values[9]||'',
                tags: [], status_data: {} 
            });
        }
    });
    return students;
}

function importStudentsFromCSV(studentData) {
    let importedCount = 0, skippedCount = 0, skippedList = [];
    studentData.forEach(data => {
        const [ok, msg] = addStudent(data, true); 
        if (ok) importedCount++; else { skippedCount++; skippedList.push(`${msg} (${data.firstName} ${data.lastName})`); }
    });
    if (importedCount > 0) saveDB(); else refreshAll(); 
    return { importedCount, skippedCount, total: studentData.length, skippedList };
}

function exportStudentsToCSV() {
    const BOM = "\uFEFF"; 
    const header = "שם_משפחה,שם_פרטי,תעודת זהות,מס דרכון,גיל,כיתה_חדש,רחוב,מס בית ודירה,ישוב,נייד תלמיד,מיקום שיבוץ";
    const rows = DB.students.map(student => {
        let locationText = 'לא משובץ';
        const bedInfo = getStudentBed(student.id); 
        if (bedInfo) locationText = `${bedInfo.building.name}, ${bedInfo.floor.displayName||bedInfo.floor.floor_number}, ${bedInfo.room.room_number}, ${bedInfo.bed.bed_number}`;
        return [student.lastName, student.firstName, student.id_card, student.passport, student.age, student.className, student.street, student.houseNum, student.city, student.phone, locationText]
               .map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','); 
    });
    const blob = new Blob([BOM + [header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `Pnimia_Export_${new Date().toISOString().slice(0,10)}.csv`; link.click();
}

function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const results = importStudentsFromCSV(parseCSV(event.target.result)); 
            showModal('סיכום ייבוא CSV', `<p>נוספו: ${results.importedCount}, דולגו: ${results.skippedCount}</p>`, null, 'סגור');
            e.target.value = ''; 
        } catch (error) { errorDialog(error.message); }
    };
    reader.readAsText(file); 
}
