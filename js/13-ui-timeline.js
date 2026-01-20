// ==================================================
//      קובץ 13: ציר זמן לתלמיד (UI Timeline)
// ==================================================

import { el, formatDate } from './01-utils.js';
import { getDB, findStudent, updateStudent } from './02-data-manager.js';
import { promptAddFutureEvent, promptEditSelectedStudent } from './07-ui-prompts.js';

// Main function to render the timeline for a specific student
function renderStudentTimeline(studentId) {
    const panel = el('#student-timeline-panel');
    const container = el('#timeline-container');
    const nameHeader = el('#timeline-student-name');
    const actionsHeader = el('#timeline-actions');

    if (!studentId) {
        panel.style.opacity = '0';
        nameHeader.textContent = 'בחר בחור להצגת היסטוריה';
        container.innerHTML = '<p class="muted">...</p>';
        actionsHeader.innerHTML = '';
        return;
    }

    const student = findStudent(studentId);
    if (!student) {
        panel.style.opacity = '0';
        return;
    }
    
    panel.style.opacity = '1';
    nameHeader.textContent = `ציר הזמן של ${student.firstName} ${student.lastName}`;
    
    actionsHeader.innerHTML = `
        <button id="btn-add-future-event" class="btn secondary">הוסף אירוע עתידי</button>
        <button id="btn-edit-student-timeline" class="btn">ערוך פרטי בחור</button>
    `;

    el('#btn-add-future-event').addEventListener('click', () => {
        promptAddFutureEvent(studentId);
    });
    el('#btn-edit-student-timeline').addEventListener('click', () => {
        promptEditSelectedStudent();
    });

    // --- Collect all events ---
    const events = [];

    // 1. Bed history
    getDB().buildings.forEach(b => {
        b.floors.forEach(f => {
            f.rooms.forEach(r => {
                r.beds.forEach(bed => {
                    (bed.history || []).forEach(entry => {
                        if (entry.studentId === studentId) {
                            events.push({
                                type: 'assignment',
                                date: entry.dateAssigned,
                                title: `שובץ בחדר ${r.room_number}, מיטה ${bed.bed_number}`,
                                icon: '🛏️'
                            });
                            if (entry.dateUnassigned) {
                                 events.push({
                                    type: 'unassignment',
                                    date: entry.dateUnassigned,
                                    title: `עזב את מיטה ${bed.bed_number}`,
                                    icon: '🚶‍♂️'
                                });
                            }
                        }
                    });
                });
            });
        });
    });

    // 2. Audit log events
    (getDB().auditLog || []).forEach(log => {
        if (log.details.id === studentId || (log.details.student && log.details.student.includes(student.lastName))) {
            if (log.action === 'Update Student') {
                 events.push({
                    type: 'update',
                    date: log.timestamp,
                    title: `פרטי הבחור עודכנו`,
                    icon: '✏️'
                });
            }
        }
    });

    // 3. Scheduled events
    (student.scheduled_events || []).forEach(event => {
        events.push({
            type: 'scheduled',
            date: event.date,
            title: `אירוע מתוכנן: ${event.title}`,
            icon: '📅'
        });
    });

    // --- Sort and render events ---
    events.sort((a, b) => new Date(b.date) - new Date(a.date)); 

    if (events.length === 0) {
        container.innerHTML = '<p class="muted">אין אירועים בהיסטוריה של בחור זה.</p>';
        return;
    }

    container.innerHTML = `
        <div class="timeline">
            ${events.map(event => `
                <div class="timeline-item">
                    <div class="timeline-icon">${event.icon}</div>
                    <div class="timeline-content">
                        <div class="timeline-title">${event.title}</div>
                        <div class="timeline-date">${formatDate(event.date)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add styles if they don't exist
    if (!el('#timeline-styles')) {
        const style = document.createElement('style');
        style.id = 'timeline-styles';
        style.innerHTML = `
            .timeline { display: flex; flex-direction: column; gap: 1rem; }
            .timeline-item { display: flex; align-items: flex-start; gap: 1rem; }
            .timeline-icon { font-size: 1.2rem; flex-shrink: 0; width: 30px; text-align: center; }
            .timeline-content { display: flex; flex-direction: column; }
            .timeline-title { font-weight: 500; }
            .timeline-date { font-size: 0.8rem; color: var(--text-dim); }
        `;
        document.head.appendChild(style);
    }
}

export { renderStudentTimeline };