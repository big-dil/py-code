// ==================================================
//      קובץ 6: פאנל פעולות והיסטוריה (UI Actions)
// ==================================================

// --------------------------------------------------
//               רכיבי עזר (UI Helpers)
// --------------------------------------------------

/**
 * יצירת כפתור (DOM Element)
 */
function btn(label, cls, onClick) { 
    const b = document.createElement('button'); 
    b.className = `btn ${cls||''}`; 
    b.textContent = label; 
    b.onclick = onClick; 
    return b; 
}

function primaryBtn(label, onClick) { return btn(label, 'primary', onClick); }
function secondaryBtn(label, onClick) { return btn(label, 'secondary', onClick); }

/**
 * יצירת כרטיס סטטוס קטן (תגית) להצגה בהיסטוריה
 */
function createStatusCard(text, cls, title = '') {
    const span = document.createElement('span');
    span.className = `status-card ${cls}`;
    span.textContent = text;
    if (title) span.title = title;
    return span;
}

// --------------------------------------------------
//               היסטוריית מיטות
// --------------------------------------------------

function renderBedHistory(bed, container) {
    container.innerHTML = '<h4>היסטוריית שיבוצים</h4>';
    
    if (!bed.history || bed.history.length === 0) {
        container.innerHTML += '<p class="muted">אין היסטוריית שיבוצים למיטה זו.</p>';
        return;
    }

    const list = document.createElement('ul');
    
    // מעבר על ההיסטוריה מהסוף להתחלה (הכי חדש למעלה)
    bed.history.slice().reverse().forEach(entry => {
        const li = document.createElement('li');
        
        const nameContainer = document.createElement('div');
        nameContainer.style.display = 'flex';
        nameContainer.style.alignItems = 'center';
        nameContainer.style.gap = '8px';
        
        const studentId = entry.studentId;
        const student = findStudent(studentId);
        
        const nameEl = document.createElement('strong');
        nameEl.textContent = escapeHtml(entry.studentName);
        
        let statusIndicator = null; 
        
        // לוגיקת הצגת סטטוס נוכחי של הבחור (אם הוא עדיין קיים במערכת)
        if (student) {
            const currentBedLocation = getStudentBed(studentId);
            const isMaoras = student.tags && student.tags.includes('מאורס');
            const isHizuk = student.tags && student.tags.includes('חיזוק');

            if (currentBedLocation) {
                const locationText = `${currentBedLocation.room.room_number}, מ' ${currentBedLocation.bed.bed_number}`;
                statusIndicator = createStatusCard(`🏠 משובץ: ${locationText}`, 'status-active', 'משובץ כעת במיטה זו');
                // לחיצה על השם תוביל למיטה הנוכחית שלו
                nameEl.style.fontWeight = 'bold';
                nameEl.style.cursor = 'pointer';
                nameEl.onclick = (e) => {
                     e.stopPropagation();
                     switchTab('manage'); 
                     selectedNode = { type: 'bed', id: currentBedLocation.bed.id }; 
                     refreshAll(currentBedLocation.bed.id); 
                };
            } else if (isMaoras || isHizuk) {
                if (isMaoras) {
                    const date = student.status_data.wedding_date ? ` (${toHebrewDate(student.status_data.wedding_date)})` : '';
                     statusIndicator = createStatusCard(`${'💍 מאורס' + date}`, 'status-maoras', 'הבחור מאורס ומיועד לעזוב');
                } else if (isHizuk) {
                    const date = student.status_data.return_date ? ` (חוזר: ${toHebrewDate(student.status_data.return_date)})` : '';
                    statusIndicator = createStatusCard(`${'↩️ חיזוק' + date}`, 'status-hizuk', 'הבחור נמצא בחיזוק ומיועד לחזור');
                } else {
                     statusIndicator = createStatusCard(`⚠️ פנוי (סטטוס מיוחד)`, 'status-unassigned');
                }
            } else {
                statusIndicator = createStatusCard(`❌ פנוי כרגע`, 'status-unassigned', 'לא משובץ כרגע באף מיטה');
            }
        } else {
             statusIndicator = createStatusCard(`(הבחור נמחק)`, 'muted');
        }
        
        nameContainer.appendChild(nameEl);
        if (statusIndicator) { 
            nameContainer.appendChild(statusIndicator);
        }
        const idSpan = document.createElement('span');
        idSpan.className = 'muted';
        idSpan.style.fontWeight = 'normal';
        idSpan.textContent = `(${studentId})`;
        nameContainer.appendChild(idSpan);
        li.appendChild(nameContainer);

        // שורת התאריכים והפעולות
        let dateText = document.createElement('small');
        dateText.style.textAlign = 'left';

        let assignedText = `משובץ: ${formatDate(entry.dateAssigned)}`;
        
        if (entry.status === 'assigned') {
            assignedText += ' - <span style="color:var(--success)">עדיין כאן</span>';
        } else {
            let actionText = ''; 
            let actionClass = '';
            
            if (entry.status === 'student_deleted') {
                actionText = `נמחק: ${formatDate(entry.dateUnassigned)}`;
                actionClass = 'status-deleted';
            }
            else if (entry.status === 'moved' && entry.movedToBedId) {
                // יצירת לינק למיטה שאליה עבר
                const loc = findBed(entry.movedToBedId);
                const destinationText = loc 
                    ? `חדר ${loc.room.room_number}, מיטה ${loc.bed.bed_number}` 
                    : 'מיטה אחרת (ID: ' + entry.movedToBedId + ')';
                
                actionText = `
                    עבר ל
                    <span class="bed-history-link" data-bed-id="${entry.movedToBedId}" style="color:var(--accent-2); text-decoration:underline; cursor:pointer;" title="לחץ למעבר למיטה">
                        ${destinationText}
                    </span>
                    ב- ${formatDate(entry.dateUnassigned)}`;
                actionClass = 'status-moved';
            }
            else { 
                actionText = `עזב: ${formatDate(entry.dateUnassigned)}`;
                actionClass = 'status-moved'; 
            }

            assignedText += ` | <span class="${actionClass}">${actionText}</span>`;
        }
        
        dateText.innerHTML = assignedText;
        li.appendChild(dateText);
        list.appendChild(li);
    });

    container.appendChild(list);
    
    // הוספת מאזינים ללינקים שנוצרו דינמית (עבר למיטה X)
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

// --------------------------------------------------
//               לוגיקת עדכון הפאנל
// --------------------------------------------------

function updateActionsPanel() {
  const title = el('#actions-title');
  const details = el('#actions-details');
  const btns = el('#actions-buttons');
  const btnDelete = el('#btn-delete');
  const historyContainer = el('#bed-history');
  
  // איפוס המצב ההתחלתי
  historyContainer.innerHTML = '';
  historyContainer.classList.add('hidden');
  btns.innerHTML = ''; 
  btnDelete.disabled = true; 

  // אם שום דבר לא נבחר
  if (!selectedNode || selectedNode.type === 'dummy') {
    title.textContent = 'בחר פריט מהעץ';
    details.textContent = '—';
    return;
  }

  const { type, id } = selectedNode;
  btnDelete.disabled = false; // אפשר למחוק כל פריט שנבחר (הלוגיקה תבדוק אם הוא ריק אח"כ)

  // 1. נבחר מבנה
  if (type === 'b') { 
    const b = findBuilding(id);
    title.textContent = `נבחר: ${b.name}`;
    details.textContent = `סוג: מבנה`;
    btns.appendChild(primaryBtn('הוסף קומה', ()=> promptAddFloor(b.id)));
    btns.appendChild(btn('ערוך שם מבנה', 'warn', ()=> promptEditBuilding(b.id, b.name)));
  } 
  
  // 2. נבחרה קומה
  else if (type === 'f') { 
    const { building, floor } = findFloor(id);
    const displayName = floor.displayName || `קומה ${floor.floor_number}`;
    title.textContent = `נבחר: ${displayName}`;
    details.textContent = `סוג: קומה (${building.name})`;
    btns.appendChild(primaryBtn('הוסף חדר בודד', ()=> promptAddRoom(floor.id)));
    btns.appendChild(secondaryBtn('הוסף מס\' חדרים (Bulk)', ()=> promptBulkCreate('חדרים', floor.id, 'חדר', 'מספרי חדרים (לדוגמה: 101, 105, 201-204)', addRoomsBulk, 'text')));
    btns.appendChild(btn('ערוך קומה', 'warn', ()=> promptEditFloor(floor.id, floor.floor_number, floor.displayName)));
  } 
  
  // 3. נבחר חדר
  else if (type === 'r') { 
    const { building, floor, room } = findRoom(id);
    const floorName = floor.displayName || `קומה ${floor.floor_number}`;
    title.textContent = `נבחר: חדר ${room.room_number}`;
    details.textContent = `סוג: חדר (${floorName})`;
    btns.appendChild(primaryBtn('הוסף מיטה בודדת', ()=> promptAddBed(room.id)));
    btns.appendChild(secondaryBtn('הוסף מס\' מיטות (Bulk)', ()=> promptBulkCreate('מיטות', room.id, 'מיטה', 'מספרי מיטות (לדוגמה: 1-4, 6, 8)', addBedsBulk)));
    btns.appendChild(btn('ערוך מספר/שם חדר', 'warn', ()=> promptEditRoom(room.id, room.room_number)));
  } 
  
  // 4. נבחרה מיטה (הכי מורכב)
  else if (type === 'bed') { 
    const { building, floor, room, bed } = findBed(id);
    const student = findStudent(bed.student_id);
    const floorName = floor.displayName || `קומה ${floor.floor_number}`;
    title.textContent = `נבחר: מיטה ${bed.bed_number}`;
    details.innerHTML = `סוג: מיטה<br>מיקום: ${building.name}, ${floorName}, חדר ${room.room_number}, מיטה ${bed.bed_number}`;
    
    // אם המיטה תפוסה
    if (student) { 
      const className = student.className ? escapeHtml(student.className) : '—';
      const phone = student.phone ? escapeHtml(student.phone) : '—';
      details.innerHTML += `<br>משובץ: ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}
                            <br>שיעור: ${className}
                            <br>טלפון: ${phone}`;
      
      // רינדור תגיות בפירוט
      const tagsHtml = (student.tags || []).map(tag => {
          let tagClass = '';
          let tagLabel = '';
          let dateInfo = '';
          
          if (tag === 'מאורס') {
              tagClass = 'tag-maoras';
              tagLabel = '💍 מאורס';
              if (student.status_data.wedding_date) {
                dateInfo = ` (${toHebrewDate(student.status_data.wedding_date)})`;
              }
          } else if (tag === 'חיזוק') {
              tagClass = 'tag-hizuk';
              tagLabel = '↩️ חיזוק';
               if (student.status_data.return_date) {
                dateInfo = ` (חוזר: ${toHebrewDate(student.status_data.return_date)})`;
              }
          } else {
               tagLabel = tag;
          }

          return `<span class="chip ${tagClass}">${tagLabel}${dateInfo}</span>`;
      }).join('');

      if (tagsHtml) {
          details.innerHTML += `<div style="margin-top: 8px;">${tagsHtml}</div>`;
      }

      // כפתורים למצב תפוס
      btns.appendChild(primaryBtn('בטל שיבוץ', ()=> { unassignBed(bed.id); }));
      
      btns.appendChild(btn('צפה/ערוך פרטי בחור', 'ghost', ()=> {
          selectedStudentId = student.id; 
          promptEditSelectedStudent(); 
      }));
    }
    else { 
      // אם המיטה פנויה
      btns.appendChild(primaryBtn('שבץ בחור', ()=> promptAssign(bed.id)));
    }
    
    // מיטה תמיד אפשר למחוק (אם היא פנויה - הבדיקה נעשית בפונקציית המחיקה)
    btnDelete.disabled = false;

    // הצגת ההיסטוריה
    historyContainer.classList.remove('hidden');
    renderBedHistory(bed, historyContainer);
  }
}
