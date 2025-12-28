// ==================================================
//      קובץ 5: ממשק עץ המבנים (UI Tree)
// ==================================================

// משתנה גלובלי לשמירת הפריט שנבחר כרגע בעץ
let selectedNode = null; 

// --------------------------------------------------
//               רכיבי DOM (Helpers)
// --------------------------------------------------

function createTreeItem(label, typeLabel, typeKey, id, hasChildren, isSelected) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-item';
    wrap.dataset.type = typeKey;
    wrap.dataset.id = id;
    if (isSelected) wrap.classList.add('selected');

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
    
    const classNameText = (student && student.className) ? student.className : '—';
    const classColor = getColorForClass(student ? student.className : null);

    const cell = document.createElement('div');
    cell.className = `bed-cell ${statusClass}`;
    cell.dataset.id = bed.id;
    cell.dataset.type = 'bed';
    
    cell.style.setProperty('--class-color', classColor);
    if(classColor !== 'transparent') {
        cell.dataset.classColor = classColor;
    }

    cell.innerHTML = `
        <span class="bed-number">${bed.bed_number}</span>
        <span class="bed-student-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        ${student ? `<span class="bed-student-class" title="${escapeHtml(classNameText)}">${escapeHtml(classNameText)}</span>` : ''}
    `;
    
    cell.addEventListener('click', (e) => {
        e.stopPropagation(); 
        selectNode('bed', bed.id, cell);
    });
    
    return cell;
}

// --------------------------------------------------
//               לוגיקת סינון וחיפוש
// --------------------------------------------------

function filterRoomsAndBeds(room, filter) {
    const q = filter.trim().toLowerCase();
    if (!q) return true; 

    // בדיקה האם מספר החדר תואם לחיפוש
    if (room.room_number.toLowerCase().includes(q)) {
        return true;
    }

    // בדיקה האם שם של אחד הבחורים בחדר תואם לחיפוש
    if (room.beds && room.beds.length > 0) {
        return room.beds.some(bed => {
            if (bed.student_id) {
                const student = findStudent(bed.student_id);
                if (student) {
                    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                    return fullName.includes(q);
                }
            }
            return false;
        });
    }
    return false;
}

// --------------------------------------------------
//               בניית העץ (Render)
// --------------------------------------------------

function renderTree(filter = '') {
  const tree = el('#tree');
  tree.innerHTML = ''; 
  
  // --- פונקציה פנימית לבניית חדר ---
  const buildRoom = (room, floor, parentEl) => {
    const passesFilter = filterRoomsAndBeds(room, filter);
    if (!passesFilter) return;

    const rWrap = createNodeWrapper('r', room.id);
    const hasBeds = room.beds && room.beds.length > 0;
    
    const rEl = createTreeItem(`חדר ${room.room_number}`, 'חדר', 'r', room.id, hasBeds, selectedNode && selectedNode.type === 'r' && selectedNode.id === room.id);
    rEl.addEventListener('click', (e) => { e.stopPropagation(); selectNode('r', room.id, rEl); });
    rWrap.appendChild(rEl);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children'; 
    
    if (hasBeds) {
        const bedsContainer = document.createElement('div');
        bedsContainer.className = 'beds-container';
        room.beds.sort((a,b)=>a.bed_number-b.bed_number).forEach(bed => {
            const student = findStudent(bed.student_id); 
            if (filter) {
                const studentName = student ? `${student.firstName} ${student.lastName}` : '';
                const q = filter.trim().toLowerCase();
                // הצג מיטה אם: שם התלמיד תואם, או מספר החדר תואם (אז מציגים את כל המיטות בחדר)
                if ((student && studentName.toLowerCase().includes(q)) || room.room_number.toLowerCase().includes(q)) {
                    const bedCell = createBedCell(bed, student);
                    if (selectedNode && selectedNode.type === 'bed' && selectedNode.id === bed.id) {
                        bedCell.classList.add('selected-bed');
                    }
                    bedsContainer.appendChild(bedCell);
                } else if (!student && room.room_number.toLowerCase().includes(q)) {
                    // הצגת מיטה ריקה אם החדר נמצא בחיפוש
                    const bedCell = createBedCell(bed, student);
                    if (selectedNode && selectedNode.type === 'bed' && selectedNode.id === bed.id) {
                        bedCell.classList.add('selected-bed');
                    }
                    bedsContainer.appendChild(bedCell);
                }
            } else {
                // ללא סינון - הצג הכל
                const bedCell = createBedCell(bed, student);
                if (selectedNode && selectedNode.type === 'bed' && selectedNode.id === bed.id) {
                    bedCell.classList.add('selected-bed');
                }
                bedsContainer.appendChild(bedCell);
            }
        });

        // טיפול במקרי קצה של תצוגה
        if (bedsContainer.children.length === 0 && passesFilter) {
            const dummy = document.createElement('div');
            dummy.className = 'muted';
            dummy.textContent = `אין מיטות תואמות לפילטר: "${filter}"`;
            dummy.style.padding = '5px 20px';
            childrenContainer.appendChild(dummy);
        } else if (bedsContainer.children.length > 0) {
             childrenContainer.appendChild(bedsContainer);
        } else {
             return; 
        }
    } else {
        const dummy = document.createElement('div');
        dummy.className = 'muted';
        dummy.textContent = 'אין מיטות להצגה';
        dummy.style.padding = '5px 20px';
        childrenContainer.appendChild(dummy);
    }
    rWrap.appendChild(childrenContainer);
    parentEl.appendChild(rWrap);
  }

  // --- פונקציה פנימית לבניית קומה ---
  const buildFloor = (floor, building, parentEl) => {
    const roomsInFloor = floor.rooms.filter(room => filterRoomsAndBeds(room, filter));
    if (filter && roomsInFloor.length === 0) return;

    const fWrap = createNodeWrapper('f', floor.id);
    const hasRooms = floor.rooms && floor.rooms.length > 0;
    const displayName = floor.displayName || `קומה ${floor.floor_number}`;
    
    const fEl = createTreeItem(displayName, 'קומה', 'f', floor.id, hasRooms, selectedNode && selectedNode.type === 'f' && selectedNode.id === floor.id);
    fWrap.appendChild(fEl);
    
    fEl.addEventListener('click', (e) => { e.stopPropagation(); selectNode('f', floor.id, fEl); });
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    if (hasRooms) {
        floor.rooms.sort((a,b)=>a.room_number.localeCompare(b.room_number, undefined, { numeric: true })).forEach(room => buildRoom(room, floor, childrenContainer)); 
    } else {
        const dummy = createTreeItem('אין חדרים להצגה', '', 'dummy', `dummy_r_${floor.id}`, false, false);
        childrenContainer.appendChild(dummy);
    }
    fWrap.appendChild(childrenContainer);
    parentEl.appendChild(fWrap);
  }

  // --- לולאה ראשית על המבנים ---
  for (const building of DB.buildings.sort((a,b)=>a.name.localeCompare(b.name,'he'))) {
    const floorsInBuilding = building.floors.filter(floor => floor.rooms.some(room => filterRoomsAndBeds(room, filter)));
    if (filter && floorsInBuilding.length === 0) continue;

    const bWrap = createNodeWrapper('b', building.id);
    const hasFloors = building.floors && building.floors.length > 0;
    
    const bEl = createTreeItem(building.name, 'מבנה', 'b', building.id, hasFloors, selectedNode && selectedNode.type === 'b' && selectedNode.id === building.id);
    bWrap.appendChild(bEl);
    
    bEl.addEventListener('click', (e) => { e.stopPropagation(); selectNode('b', building.id, bEl); });
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    if (hasFloors) {
        building.floors.sort((a,b)=>a.floor_number-b.floor_number).forEach(floor => buildFloor(floor, building, childrenContainer)); 
    } else {
        const dummy = createTreeItem('אין קומות להצגה', '', 'dummy', `dummy_f_${building.id}`, false, false);
        childrenContainer.appendChild(dummy);
    }
    bWrap.appendChild(childrenContainer); 
    tree.appendChild(bWrap);
  }
  
  // שחזור בחירה ויזואלית
  els('.tree-item').forEach(n => n.classList.remove('selected'));
  if (selectedNode && selectedNode.type !== 'bed') {
      const sel = els(`.tree-item[data-type="${selectedNode.type}"][data-id="${selectedNode.id}"]`).find(x=>x) || null;
      if (sel) sel.classList.add('selected'); else selectedNode = null; 
  }
  
  els('.bed-cell').forEach(n => n.classList.remove('selected-bed'));
  if (selectedNode && selectedNode.type === 'bed') {
      const selBed = els(`.bed-cell[data-id="${selectedNode.id}"]`).find(x=>x) || null;
      if (selBed) selBed.classList.add('selected-bed'); else selectedNode = null; 
  }

  updateStats();
  if (typeof updateActionsPanel === 'function') updateActionsPanel();
}

function selectNode(type, id, elem) {
  els('.tree-item').forEach(n => n.classList.remove('selected'));
  els('.bed-cell').forEach(n => n.classList.remove('selected-bed'));
  
  selectedNode = { type, id: Number(id) };

  if (type !== 'bed') {
      elem.classList.add('selected'); 
  } else {
      elem.classList.add('selected-bed'); 
      const parentRoom = elem.closest('.tree-node-wrapper[data-type="r"]');
      if (parentRoom) {
          const roomItem = parentRoom.querySelector('.tree-item');
          if(roomItem) roomItem.classList.add('selected');
      }
  }
  
  if (typeof updateActionsPanel === 'function') updateActionsPanel(); 
}

// --------------------------------------------------
//               עדכון סטטיסטיקות
// --------------------------------------------------

function updateStats() {
  const totalStudents = DB.students.length;
  const unassignedStudents = getUnassignedStudents().length;
  
  let totalBeds = 0, assigned = 0;
  for (const b of (DB.buildings || [])) {
      for (const f of (b.floors || [])) {
          for (const r of (f.rooms || [])) {
            totalBeds += (r.beds || []).length;
            for (const bed of (r.beds || [])) {
                if (bed.student_id) assigned++;
            }
          }
      }
  }
  const freeBeds = totalBeds - assigned;
  
  el('#stat-students').textContent = `בחורים: ${totalStudents}`;
  el('#stat-unassigned').textContent = `לא משובצים: ${unassignedStudents}`;
  el('#stat-assigned').textContent = `משובצים: ${assigned}`;
  el('#stat-beds-free').textContent = `מיטות פנויות: ${freeBeds}`;
}
