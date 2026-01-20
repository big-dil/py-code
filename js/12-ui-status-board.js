// ==================================================
//      קובץ 12: לוח סטטוסים (UI Status Board)
// ==================================================

import { el } from './01-utils.js';
import { getDB, updateStudent, findStudent } from './02-data-manager.js';
import { promptEditSelectedStudent } from './07-ui-prompts.js';
import { setSelectedStudentId } from './04-ui-core.js';

const STATUS_DEFINITIONS = {
    present: { title: 'נוכחים', type: 'present', theme: '#198754' },
    absent: { title: 'ביציאה', type: 'absent', theme: '#0d6efd' },
    sick: { title: 'חולים', type: 'sick', theme: '#ffc107' },
    hizuk: { title: 'חיזוק', type: 'hizuk', tag: 'חיזוק', theme: '#fd7e14' },
    maoras: { title: 'מאורסים', type: 'maoras', tag: 'מאורס', theme: '#dc3545' },
};

let draggedStudentId = null;

function renderStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.dataset.studentId = student.id;
    card.draggable = true;

    const studentName = `${student.firstName} ${student.lastName}`;
    const studentClass = student.className || '—';
    const location = getStudentBedLocationText(student.id);

    card.innerHTML = `
        <div class="student-card-header" title="${studentName}">${studentName}</div>
        <div class="student-card-details">
            <span>שיעור: ${studentClass}</span>
            <span style="margin-right: 10px;">מיקום: ${location}</span>
        </div>
    `;

    // --- Drag and Drop Event Listeners ---
    card.addEventListener('dragstart', (e) => {
        draggedStudentId = student.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', student.id);
        setTimeout(() => {
            card.classList.add('is-dragging');
        }, 0);
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        draggedStudentId = null;
    });

    // --- Click to Edit ---
    card.addEventListener('click', () => {
        setSelectedStudentId(student.id);
        promptEditSelectedStudent();
    });

    return card;
}

function getStudentBedLocationText(studentId) {
    const bedInfo = getDB().buildings.flatMap(b => b.floors).flatMap(f => f.rooms).flatMap(r => r.beds).find(bed => bed.student_id === studentId);
    if (bedInfo) {
        const room = getDB().buildings.flatMap(b => b.floors).flatMap(f => f.rooms).find(r => r.beds.some(b => b.id === bedInfo.id));
        return room ? `חדר ${room.room_number}, מיטה ${bedInfo.bed_number}` : 'משובץ';
    }
    return 'לא משובץ';
}

function renderStatusBoard() {
    const container = el('#status-board-container');
    if (!container) return;
    container.innerHTML = '';
    const students = getDB().students;

    for (const statusKey in STATUS_DEFINITIONS) {
        const status = STATUS_DEFINITIONS[statusKey];
        const column = document.createElement('div');
        column.className = 'status-column';
        column.dataset.statusType = status.type;
        column.style.setProperty('--status-theme-color', status.theme);

        const columnBody = document.createElement('div');
        columnBody.className = 'status-column-body';

        // Filter students for this column
        const filteredStudents = students.filter(student => {
            const hasTag = status.tag ? (student.tags || []).includes(status.tag) : false;
            if (status.type === 'present') {
                // A student is 'present' if they are not in any other category
                return !( (student.tags || []).includes('חיזוק') || (student.tags || []).includes('מאורס') || (student.tags || []).includes('חולה') || (student.tags || []).includes('ביציאה') );
            }
            return hasTag || (student.status === status.type); // A future-proof check
        });

        filteredStudents.forEach(student => {
            columnBody.appendChild(renderStudentCard(student));
        });
        
        column.innerHTML = `
            <div class="status-column-header" style="border-bottom-color: ${status.theme};">
                <span>${status.title}</span>
                <span class="student-count">${filteredStudents.length}</span>
            </div>
        `;
        column.appendChild(columnBody);

        // --- Drop Zone Event Listeners ---
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            column.classList.add('drop-zone-active');
        });
        column.addEventListener('dragleave', () => {
            column.classList.remove('drop-zone-active');
        });
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drop-zone-active');
            if (!draggedStudentId) return;

            handleStudentStatusChange(draggedStudentId, status);
            draggedStudentId = null;
        });

        container.appendChild(column);
    }
}

function handleStudentStatusChange(studentId, newStatus) {
    const student = findStudent(studentId);
    if (!student) return;

    let tags = student.tags || [];

    // Remove all other status tags
    Object.values(STATUS_DEFINITIONS).forEach(s => {
        if (s.tag) {
            tags = tags.filter(t => t !== s.tag);
        }
    });

    // Add the new status tag if applicable
    if (newStatus.tag) {
        tags.push(newStatus.tag);
    }
    
    // Create a copy to avoid mutation issues before the update function
    const updatedStudentData = { ...student, tags: [...new Set(tags)] }; // Use Set to ensure uniqueness
    
    // Use the main update function to ensure logging and refreshing happens
    updateStudent(studentId, updatedStudentData);
}

export { renderStatusBoard };
