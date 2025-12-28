function createTreeItem(label, typeLabel, typeKey, id, hasChildren, isSelected) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-item' + (isSelected ? ' selected' : '');
    wrap.dataset.type = typeKey;
    wrap.dataset.id = id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tree-label';
    nameSpan.textContent = label;
    const chipType = document.createElement('span');
    chipType.className = 'chip type';
    chipType.textContent = typeLabel;

    wrap.appendChild(nameSpan);
    wrap.appendChild(chipType);
    return wrap;
}

function createNodeWrapper(type, id) {
    const div = document.createElement('div');
    div.className = 'tree-node-wrapper';
    div.dataset.type = type;
    div.dataset.id = id;
    return div;
}

function createBedCell(bed, student) {
    const statusClass = student ? 'assigned' : 'unassigned'; 
    const label = student ? `${student.firstName} ${student.lastName}` : 'פנוי';
    const classColor = getColorForClass(student ? student.className : null);
    
    const cell = document.createElement('div');
    cell.className = `bed-cell ${statusClass}`;
    cell.dataset.id = bed.id;
    cell.dataset.type = 'bed';
    
    if(classColor !== 'transparent') {
        cell.style.setProperty('--class-color', classColor);
        cell.dataset.classColor = classColor;
    }

    cell.innerHTML = `<span class="bed-number">${bed.bed_number}</span>
                      <span class="bed-student-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
                      ${student ? `<span class="bed-student-class">${escapeHtml(student.className)}</span>` : ''}`;
    
    cell.addEventListener('click', (e) => { e.stopPropagation(); selectNode('bed', bed.id, cell); });
    return cell;
}

function filterRoomsAndBeds(room, filter) {
    const q = filter.trim().toLowerCase();
    if (!q) return true; 
    if (room.room_number.toLowerCase().includes(q)) return true;
    if (room.beds && room.beds.length > 0) {
        return room.beds.some(bed => {
            if (bed.student_id) {
                const s = findStudent(bed.student_id);
                if (s) return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
            }
            return false;
        });
    }
    return false;
}

function renderTree(filter = '') {
    const tree = el('#tree');
    tree.innerHTML = ''; 
    // (העתק לכאן את כל הלוגיקה הארוכה של buildRoom, buildFloor מהקובץ המקורי)
    // ...
    // בסוף הפונקציה:
    updateStats();
    updateActionsPanel();
}

function selectNode(type, id, elem) {
    els('.tree-item').forEach(n => n.classList.remove('selected'));
    els('.bed-cell').forEach(n => n.classList.remove('selected-bed'));
    selectedNode = { type, id: Number(id) };
    if (type !== 'bed') elem.classList.add('selected'); 
    else {
        elem.classList.add('selected-bed'); 
        const parentRoom = elem.closest('.tree-node-wrapper[data-type="r"]');
        if (parentRoom) { const ri=parentRoom.querySelector('.tree-item'); if(ri) ri.classList.add('selected'); }
    }
    updateActionsPanel(); 
}

function updateStats() {
    const totalStudents = DB.students.length;
    const unassignedStudents = getUnassignedStudents().length;
    let totalBeds = 0, assigned = 0;
    for (const b of (DB.buildings || [])) for (const f of (b.floors || [])) for (const r of (f.rooms || [])) {
      totalBeds += (r.beds || []).length;
      for (const bed of (r.beds || [])) if (bed.student_id) assigned++;
    }
    el('#stat-students').textContent = `בחורים: ${totalStudents}`;
    el('#stat-unassigned').textContent = `לא משובצים: ${unassignedStudents}`;
    el('#stat-assigned').textContent = `משובצים: ${assigned}`;
    el('#stat-beds-free').textContent = `מיטות פנויות: ${totalBeds - assigned}`;
}
