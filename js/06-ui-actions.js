function createStatusCard(text, cls, title = '') {
    const span = document.createElement('span');
    span.className = `status-card ${cls}`;
    span.textContent = text;
    if (title) span.title = title;
    return span;
}

function renderBedHistory(bed, container) {
    container.innerHTML = '<h4>היסטוריית שיבוצים</h4>';
    if (!bed.history || bed.history.length === 0) {
        container.innerHTML += '<p class="muted">אין היסטוריית שיבוצים למיטה זו.</p>';
        return;
    }
    const list = document.createElement('ul');
    bed.history.slice().reverse().forEach(entry => {
        const li = document.createElement('li');
        // לוגיקה ליצירת ה-Item ברשימה...
        // ... (העתק את תוכן הלוגיקה מהקובץ המקורי)
        list.appendChild(li);
    });
    container.appendChild(list);
    // הוספת מאזינים ללינקים בהיסטוריה
    container.querySelectorAll('.bed-history-link[data-bed-id]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const bedId = Number(e.target.dataset.bedId);
            el('#search-rooms').value = ''; 
            switchTab('manage');
            selectedNode = { type: 'bed', id: bedId };
            refreshAll(bedId); 
        });
    });
}

function updateActionsPanel() {
    const title = el('#actions-title');
    const details = el('#actions-details');
    const btns = el('#actions-buttons');
    const btnDelete = el('#btn-delete');
    const historyContainer = el('#bed-history');
    
    historyContainer.innerHTML = '';
    historyContainer.classList.add('hidden');
    btns.innerHTML = ''; 
    btnDelete.disabled = true; 

    if (!selectedNode || selectedNode.type === 'dummy') {
      title.textContent = 'בחר פריט מהעץ'; details.textContent = '—';
      return;
    }

    const { type, id } = selectedNode;
    btnDelete.disabled = false; 

    const btn = (l,c,fn) => { const b=document.createElement('button'); b.className=`btn ${c||''}`; b.textContent=l; b.onclick=fn; return b; };

    if (type === 'b') { 
        const b = findBuilding(id);
        title.textContent = `נבחר: ${b.name}`; details.textContent = `סוג: מבנה`;
        btns.appendChild(btn('הוסף קומה', 'primary', ()=> promptAddFloor(b.id)));
        btns.appendChild(btn('ערוך שם', 'warn', ()=> promptEditBuilding(b.id, b.name)));
    } else if (type === 'f') {
        const { building, floor } = findFloor(id);
        title.textContent = `נבחר: ${floor.displayName||floor.floor_number}`; details.textContent = `סוג: קומה`;
        btns.appendChild(btn('הוסף חדר', 'primary', ()=> promptAddRoom(floor.id)));
        btns.appendChild(btn('הוסף חדרים (Bulk)', 'secondary', ()=> promptBulkCreate('חדרים', floor.id, 'חדר', 'דוגמה: 101-105', addRoomsBulk)));
        btns.appendChild(btn('ערוך קומה', 'warn', ()=> promptEditFloor(floor.id, floor.floor_number, floor.displayName)));
    } else if (type === 'r') {
        const { room } = findRoom(id);
        title.textContent = `נבחר: חדר ${room.room_number}`; details.textContent = `סוג: חדר`;
        btns.appendChild(btn('הוסף מיטה', 'primary', ()=> promptAddBed(room.id)));
        btns.appendChild(btn('הוסף מיטות (Bulk)', 'secondary', ()=> promptBulkCreate('מיטות', room.id, 'מיטה', 'דוגמה: 1-4', addBedsBulk)));
        btns.appendChild(btn('ערוך חדר', 'warn', ()=> promptEditRoom(room.id, room.room_number)));
    } else if (type === 'bed') {
        const { building, floor, room, bed } = findBed(id);
        const student = findStudent(bed.student_id);
        title.textContent = `נבחר: מיטה ${bed.bed_number}`;
        details.innerHTML = `מיקום: ${building.name}, ${floor.displayName||floor.floor_number}, חדר ${room.room_number}`;
        
        if (student) {
            details.innerHTML += `<br><strong>${student.firstName} ${student.lastName}</strong>`;
            btns.appendChild(btn('בטל שיבוץ', 'primary', ()=> unassignBed(bed.id)));
            btns.appendChild(btn('פרטי בחור', 'ghost', ()=> { selectedStudentId = student.id; promptEditSelectedStudent(); }));
        } else {
            btns.appendChild(btn('שבץ בחור', 'primary', ()=> promptAssign(bed.id)));
        }
        historyContainer.classList.remove('hidden');
        renderBedHistory(bed, historyContainer);
    }
}
