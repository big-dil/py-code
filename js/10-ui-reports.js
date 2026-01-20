// ==================================================
//      קובץ 10: דוחות וסטטיסטיקות (UI Reports)
// ==================================================

import { el } from './01-utils.js';
import { getDB } from './02-data-manager.js';

let chartByClass = null;
let chartByCity = null;

// Helper to create a report card
function createStatCard(title, value, icon, color) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = `
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-left: 5px solid ${color};
    `;
    card.innerHTML = `
        <div style="font-size: 1rem; font-weight: 500; color: var(--text-dim);">${title}</div>
        <div style="font-size: 2rem; font-weight: 700; color: var(--text);">${value}</div>
    `;
    return card;
}

// Main function to render all reports
function renderReports() {
    const DB = getDB();
    const reportsContainer = el('#reports-container');
    if (!reportsContainer) return;

    // --- 1. Calculate Main Stats ---
    const totalStudents = DB.students.length;
    let totalBeds = 0;
    let assignedBeds = 0;

    DB.buildings.forEach(b => {
        b.floors.forEach(f => {
            f.rooms.forEach(r => {
                totalBeds += r.beds.length;
                r.beds.forEach(bed => {
                    if (bed.student_id) {
                        assignedBeds++;
                    }
                });
            });
        });
    });

    const occupancyRate = totalBeds > 0 ? ((assignedBeds / totalBeds) * 100).toFixed(1) : 0;
    const unassignedStudents = totalStudents - assignedBeds;

    // --- 2. Render Stat Cards ---
    reportsContainer.innerHTML = '';
    reportsContainer.appendChild(createStatCard('סך בחורים', totalStudents, '👥', '#0d6efd'));
    reportsContainer.appendChild(createStatCard('מיטות מאוכלסות', `${assignedBeds} / ${totalBeds}`, '🛏️', '#198754'));
    reportsContainer.appendChild(createStatCard('אחוזי תפוסה', `${occupancyRate}%`, '%', '#ffc107'));
    reportsContainer.appendChild(createStatCard('בחורים ללא שיבוץ', unassignedStudents, '⚠️', '#dc3545'));

    // --- 3. Prepare Chart Data ---
    // Chart 1: Students by Class
    const byClass = DB.students.reduce((acc, student) => {
        const className = student.className || 'לא שויך';
        acc[className] = (acc[className] || 0) + 1;
        return acc;
    }, {});
    const classLabels = Object.keys(byClass).sort();
    const classData = classLabels.map(label => byClass[label]);

    // Chart 2: Students by City (Top 10)
    const byCity = DB.students.reduce((acc, student) => {
        const city = student.city || 'לא ידוע';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
    }, {});
    const sortedCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const cityLabels = sortedCities.map(entry => entry[0]);
    const cityData = sortedCities.map(entry => entry[1]);

    // --- 4. Render Charts ---
    renderChartByClass(classLabels, classData);
    renderChartByCity(cityLabels, cityData);
}

// Chart rendering functions
function renderChartByClass(labels, data) {
    const ctx = el('#chart-by-class')?.getContext('2d');
    if (!ctx) return;

    if (chartByClass) {
        chartByClass.destroy();
    }

    chartByClass = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'מספר בחורים',
                data: data,
                backgroundColor: ['#0d9488', '#14b8a6', '#5eead4', '#99f6e4', '#ccfbf1', '#a7f3d0', '#6ee7b7'],
                borderColor: 'var(--panel)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'התפלגות בחורים לפי כיתה',
                    font: { size: 16, family: 'Heebo' }
                },
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

function renderChartByCity(labels, data) {
    const ctx = el('#chart-by-city')?.getContext('2d');
    if (!ctx) return;

    if (chartByCity) {
        chartByCity.destroy();
    }

    chartByCity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'מספר בחורים',
                data: data,
                backgroundColor: '#14b8a6',
                borderColor: '#0d9488',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'התפלגות בחורים לפי עיר (טופ 10)',
                    font: { size: 16, family: 'Heebo' }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

export { renderReports };
