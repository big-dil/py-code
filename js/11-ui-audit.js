// ==================================================
//      קובץ 11: היסטוריית שינויים (UI Audit Log)
// ==================================================

import { el, formatDate, escapeHtml } from './01-utils.js';
import { getDB } from './02-data-manager.js';

function getActionTranslation(action) {
    const translations = {
        'Create Building': 'יצירת מבנה',
        'Update Building': 'עדכון מבנה',
        'Delete Building': 'מחיקת מבנה',
        'Create Floor': 'יצירת קומה',
        'Update Floor': 'עדכון קומה',
        'Delete Floor': 'מחיקת קומה',
        'Create Room': 'יצירת חדר',
        'Bulk Create Rooms': 'יצירה מרובה של חדרים',
        'Update Room': 'עדכון חדר',
        'Delete Room': 'מחיקת חדר',
        'Create Bed': 'יצירת מיטה',
        'Bulk Create Beds': 'יצירה מרובה של מיטות',
        'Delete Bed': 'מחיקת מיטה',
        'Create Student': 'יצירת בחור',
        'Update Student': 'עדכון בחור',
        'Delete Student': 'מחיקת בחור',
        'Assign Student': 'שיבוץ בחור',
        'Unassign Student': 'ביטול שיבוץ',
    };
    return translations[action] || action;
}

function formatLogDetails(action, details) {
    let parts = [];
    switch (action) {
        case 'Create Building':
        case 'Delete Building':
            parts.push(`שם: <strong>${escapeHtml(details.name)}</strong>`);
            break;
        case 'Update Building':
            parts.push(`שם קודם: ${escapeHtml(details.oldName)}`);
            parts.push(`שם חדש: <strong>${escapeHtml(details.newName)}</strong>`);
            break;
        case 'Create Student':
        case 'Delete Student':
            parts.push(`שם: <strong>${escapeHtml(details.name)}</strong>`);
            parts.push(`מזהה: ${escapeHtml(details.id)}`);
            break;
        case 'Assign Student':
        case 'Unassign Student':
            parts.push(`בחור: <strong>${escapeHtml(details.student)}</strong>`);
            parts.push(`מיקום: ${escapeHtml(details.location)}`);
            break;
        case 'Bulk Create Rooms':
        case 'Bulk Create Beds':
             parts.push(`כמות: <strong>${details.count}</strong>`);
             if (details.building) parts.push(`במבנה: ${escapeHtml(details.building)}`);
             if (details.room) parts.push(`בחדר: ${escapeHtml(details.room)}`);
             break;
        case 'Update Student':
            parts.push(`שם: <strong>${escapeHtml(details.newData.name)}</strong> (מזהה: ${details.id})`);
            break;
        default:
            return Object.entries(details)
                .filter(([key]) => key !== 'isBulk')
                .map(([key, value]) => `${key}: ${escapeHtml(String(value))}`)
                .join(', ');
    }
    return parts.join(', ');
}

function renderAuditLog() {
    const container = el('#audit-log-container');
    if (!container) return;

    const DB = getDB();
    const logs = DB.auditLog || [];

    if (logs.length === 0) {
        container.innerHTML = '<div class="muted" style="text-align: center; padding: 2rem;">אין היסטוריית שינויים להצגה.</div>';
        return;
    }

    const logHtml = logs.map(entry => {
        const actionText = getActionTranslation(entry.action);
        const formattedDetails = formatLogDetails(entry.action, entry.details);
        return `
            <div class="audit-entry">
                <div class="audit-header">
                    <strong class="audit-action">${actionText}</strong>
                    <span class="audit-timestamp">${formatDate(entry.timestamp)}</span>
                </div>
                <div class="audit-details">
                    ${formattedDetails}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = logHtml;

    // Add some styles dynamically as we don't have a dedicated CSS file for this component yet
    if (!el('#audit-styles')) {
        const style = document.createElement('style');
        style.id = 'audit-styles';
        style.innerHTML = `
            .audit-entry {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid var(--border);
            }
            .audit-entry:last-child {
                border-bottom: none;
            }
            .audit-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.25rem;
            }
            .audit-action {
                font-size: 1rem;
                color: var(--text);
            }
            .audit-timestamp {
                font-size: 0.8rem;
                color: var(--text-dim);
            }
            .audit-details {
                font-size: 0.9rem;
                color: var(--text-dim);
            }
        `;
        document.head.appendChild(style);
    }
}

export { renderAuditLog };
