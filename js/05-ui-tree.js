// ==================================================
//      קובץ 5: ממשק עץ המבנים (UI Tree)
// ==================================================

import { el, els, escapeHtml, getColorForClass } from './01-utils.js';
import { getDB, findStudent, getUnassignedStudents } from './02-data-manager.js';
import { handleNodeSelection } from './04-ui-core.js';

function createTreeItem(label, typeLabel, typeKey, id) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-item';
    wrap.dataset.type = typeKey;
    wrap.dataset.id = id;
    wrap.innerHTML = `<span class="tree-label">${label}</span><span class="chip type">${typeLabel}</span>`;
    return wrap;
}

function createNodeWrapper(type, id) {
    const div = document.createElement('div');
    div.className = `tree-node-wrapper node-type-${type}`;
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
    if(classColor !== 'transparent') cell.dataset.classColor = classColor;
    
    // Store searchable text
    cell.dataset.filterText = label.toLowerCase();

    cell.innerHTML = `
        <span class="bed-number">${bed.bed_number}</span>
        <span class="bed-student-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        ${student ? `<span class="bed-student-class" title="${escapeHtml(classNameText)}">${escapeHtml(classNameText)}</span>` : ''}
    `;
    cell.addEventListener('click', (e) => { e.stopPropagation(); handleNodeSelection('bed', bed.id, cell); });
    return cell;
}

function buildTree() {
    const tree = el('#tree');
    if (!tree) return;
    tree.innerHTML = '';
    const DB = getDB();
    const fragment = document.createDocumentFragment();

    for (const building of DB.buildings.sort((a,b)=>a.name.localeCompare(b.name,'he'))) {
        const bWrap = createNodeWrapper('b', building.id);
        const bEl = createTreeItem(building.name, 'מבנה', 'b', building.id);
        bEl.addEventListener('click', (e) => { e.stopPropagation(); handleNodeSelection('b', building.id, bEl); });
        bWrap.appendChild(bEl);

        const floorsFragment = document.createDocumentFragment();
        for (const floor of building.floors.sort((a,b)=>a.floor_number-b.floor_number)) {
            const fWrap = createNodeWrapper('f', floor.id);
            const displayName = floor.displayName || `קומה ${floor.floor_number}`;
            const fEl = createTreeItem(displayName, 'קומה', 'f', floor.id);
            fEl.addEventListener('click', (e) => { e.stopPropagation(); handleNodeSelection('f', floor.id, fEl); });
            fWrap.appendChild(fEl);

            const roomsFragment = document.createDocumentFragment();
            for (const room of floor.rooms.sort((a,b)=>a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))) {
                const rWrap = createNodeWrapper('r', room.id);
                
                // Collect searchable text for the room
                const studentNames = room.beds.map(bed => findStudent(bed.student_id)).filter(Boolean).map(s => `${s.firstName} ${s.lastName}`).join(' ');
                rWrap.dataset.filterText = `${room.room_number} ${studentNames}`.toLowerCase();
                
                const rEl = createTreeItem(`חדר ${room.room_number}`, 'חדר', 'r', room.id);
                rEl.addEventListener('click', (e) => { e.stopPropagation(); handleNodeSelection('r', room.id, rEl); });
                rWrap.appendChild(rEl);

                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                const bedsContainer = document.createElement('div');
                bedsContainer.className = 'beds-container';

                if (room.beds.length > 0) {
                    const bedsFragment = document.createDocumentFragment();
                    room.beds.sort((a,b)=>a.bed_number-b.bed_number).forEach(bed => {
                        const student = findStudent(bed.student_id);
                        bedsFragment.appendChild(createBedCell(bed, student));
                    });
                    bedsContainer.appendChild(bedsFragment);
                } else {
                    bedsContainer.innerHTML = '<div class="muted" style="padding: 5px 20px;">אין מיטות להצגה</div>';
                }
                childrenContainer.appendChild(bedsContainer);
                rWrap.appendChild(childrenContainer);
                roomsFragment.appendChild(rWrap);
            }
            if(floor.rooms.length > 0) {
                const floorChildren = document.createElement('div');
                floorChildren.className = 'tree-children';
                floorChildren.appendChild(roomsFragment);
                fWrap.appendChild(floorChildren);
            }
            floorsFragment.appendChild(fWrap);
        }
         if(building.floors.length > 0) {
            const buildingChildren = document.createElement('div');
            buildingChildren.className = 'tree-children';
            buildingChildren.appendChild(floorsFragment);
            bWrap.appendChild(buildingChildren);
        }
        fragment.appendChild(bWrap);
    }
    tree.appendChild(fragment);
    updateStats();
}

function filterTree(query) {
    const q = query.toLowerCase().trim();
    
    els('.tree-node-wrapper.node-type-r').forEach(roomNode => {
        const isVisible = q === '' || roomNode.dataset.filterText.includes(q);
        roomNode.classList.toggle('is-hidden', !isVisible);
    });

    els('.tree-node-wrapper.node-type-f').forEach(floorNode => {
        const hasVisibleRooms = floorNode.querySelector('.tree-node-wrapper.node-type-r:not(.is-hidden)');
        floorNode.classList.toggle('is-hidden', q !== '' && !hasVisibleRooms);
    });

    els('.tree-node-wrapper.node-type-b').forEach(buildingNode => {
        const hasVisibleFloors = buildingNode.querySelector('.tree-node-wrapper.node-type-f:not(.is-hidden)');
        buildingNode.classList.toggle('is-hidden', q !== '' && !hasVisibleFloors);
    });
}

function updateStats() {
  const DB = getDB();
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

export { buildTree, filterTree, updateStats };
