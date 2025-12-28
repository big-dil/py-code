// ==================================================
//      קובץ 2: מנהל הנתונים (Data Manager)
// ==================================================

const STORAGE_KEY = 'pnimiyot_db_v4_excel'; 

// טעינת הנתונים מהזיכרון המקומי
function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { seq: {building:1, floor:1, room:1, bed:1, student:1}, buildings: [], students: [] };
  try {
    const loadedDB = JSON.parse(raw);
    // הבטחת מבנה תקין לסטודנטים
    loadedDB.students = loadedDB.students.map(s => ({
        ...s,
        tags: s.tags || [],
        status_data: s.status_data || {}
    }));
    return loadedDB;
  } catch {
    return { seq: {building:1, floor:1, room:1, bed:1, student:1}, buildings: [], students: [] };
  }
}

// המשתנה הגלובלי המחזיק את כל הנתונים
let DB = loadDB();

// שמירת הנתונים לזיכרון ורענון הממשק
function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  
  // קריאה לפונקציית רענון ממשק אם היא קיימת (נטענת ב-main.js)
  if (typeof refreshAll === 'function') {
      refreshAll(); 
  }
}

// --------------------------------------------------
//                  פונקציות חיפוש (Finders)
// --------------------------------------------------

function findBuilding(buildingId) { return DB.buildings.find(byId(buildingId)); }

function findFloor(floorId) {
  for (const building of DB.buildings) {
    const floor = building.floors.find(byId(floorId));
    if (floor) return { building, floor };
  }
  return null;
}

function findRoom(roomId) {
  for (const building of DB.buildings) {
    for (const floor of building.floors) {
      const room = floor.rooms.find(byId(roomId));
      if (room) return { building, floor, room };
    }
  }
  return null;
}

function findBed(bedId) {
  for (const building of DB.buildings) {
    for (const floor of building.floors) {
      for (const room of floor.rooms) {
        const bed = room.beds.find(byId(bedId));
        if (bed) return { building, floor, room, bed };
      }
    }
  }
  return null;
}

function findStudent(studentId) { return DB.students.find(byId(studentId)); }


// --------------------------------------------------
//                  לוגיקה ו-Getters
// --------------------------------------------------

// בדיקה האם פריט (מבנה/קומה/חדר) מאוכלס
function isOccupied(item) {
  if (item.type === 'b') return item.floors.some(isOccupied); 
  if (item.type === 'f') return item.rooms.some(isOccupied); 
  if (item.type === 'r') return item.beds.some(b => b.student_id !== null); 
  return false;
}

// מציאת המיטה בה משובץ בחור ספציפי
function getStudentBed(studentId) {
  for (const building of DB.buildings) {
      for (const floor of building.floors) {
          for (const room of floor.rooms) {
              const bed = room.beds.find(b => b.student_id === studentId);
              if (bed) {
                  return { building, floor, room, bed };
              }
          }
      }
  }
  return null;
}

// קבלת רשימת בחורים שאינם משובצים
function getUnassignedStudents() {
    const assigned = new Set();
    for (const b of DB.buildings) {
        for (const f of b.floors) {
            for (const r of f.rooms) { 
                for (const bed of r.beds) {
                    if (bed.student_id) assigned.add(bed.student_id);
                }
            }
        }
    }
    return DB.students.filter(s => !assigned.has(s.id));
}

// --------------------------------------------------
//               יצירה (Create)
// --------------------------------------------------

function addBuilding(name) {
  name = name.trim();
  if (!name) return [false, 'שם המבנה לא יכול להיות ריק'];
  if (DB.buildings.some(b => b.name === name)) return [false, `מבנה בשם זה כבר קיים`];
  
  DB.buildings.push({ id: DB.seq.building++, name, floors: [], type:'b' });
  saveDB();
  return [true];
}

function addFloor(buildingId, floor_number, displayName) {
  const b = findBuilding(buildingId);
  if (!b) return [false, 'מבנה לא נמצא'];
  
  const fn = Number(floor_number);
  if (!Number.isFinite(fn)) return [false, `מספר המיון "${floor_number}" אינו תקין (חייב להיות מספר)`];
  if (b.floors.some(f => f.floor_number === fn)) return [false, `קומה עם מספר מיון ${fn} כבר קיימת במבנה`];
  
  b.floors.push({ id: DB.seq.floor++, floor_number: fn, displayName: displayName.trim(), rooms: [], type:'f' });
  b.floors.sort((a,b)=>a.floor_number-b.floor_number);
  saveDB();
  return [true];
}

function addRoom(floorId, room_number) {
  const {floor} = findFloor(floorId) || {};
  if (!floor) return [false, 'קומה לא נמצאה'];
  
  room_number = String(room_number).trim();
  if (!room_number) return [false, 'מספר/שם חדר ריק'];
  if (floor.rooms.some(r => r.room_number === room_number)) return [false, `חדר בשם/מספר "${room_number}" כבר קיים בקומה`];
  
  floor.rooms.push({ id: DB.seq.room++, room_number, beds: [], type:'r' });
  saveDB();
  return [true];
}

function addBed(roomId, bed_number) {
  const {room} = findRoom(roomId) || {};
  if (!room) return [false, 'חדר לא נמצא'];
  
  const bn = Number(bed_number);
  if (!Number.isFinite(bn) || bn <= 0) return [false, `מספר מיטה "${bed_number}" אינו תקין (חייב להיות מספר שלם וחיובי)`];
  if (room.beds.some(b => b.bed_number === bn)) return [false, `מיטה מספר ${bn} כבר קיימת בחדר`];
  
  room.beds.push({ id: DB.seq.bed++, bed_number: bn, student_id: null, type:'bed', history: [] });
  room.beds.sort((a,b)=>a.bed_number-b.bed_number);
  saveDB();
  return [true];
}

function addStudent(studentData, skipSave = false) {
  const sId_card = String(studentData.id_card || '').trim();
  const sPassport = String(studentData.passport || '').trim();
  const primaryId = sId_card || sPassport;

  if (!primaryId) return [false, 'מספר זהות או מספר דרכון הוא שדה חובה'];
  
  const sLastName = String(studentData.lastName || '').trim();
  const sFirstName = String(studentData.firstName || '').trim();
  if (!sFirstName || !sLastName) return [false, 'שם פרטי ושם משפחה הם שדות חובה'];
  
  if (DB.students.some(s => s.id === primaryId)) return [false, `בחור עם מזהה "${primaryId}" כבר קיים`];
  
  const newStudent = {
    ...studentData, 
    id: primaryId,
    type: 'student',
    tags: [], 
    status_data: {} 
  };

  DB.students.push(newStudent);
  DB.students.sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'));
  
  if (!skipSave) saveDB(); 
  return [true];
}

// --------------------------------------------------
//               יצירה מרובה (Bulk)
// --------------------------------------------------

function addRoomsBulk(floorId, input) {
    const numbers = parseRange(input, false); 
    const results = { total: numbers.length, added: 0, failed: [] };
    for (const num of numbers) {
        const [ok, msg] = addRoom(floorId, num); 
        if (ok) results.added++; else results.failed.push(msg.split('במספר')[0] + num);
    }
    if (results.total > 0) saveDB(); 
    return results;
}

function addBedsBulk(roomId, input) {
    const numbers = parseRange(input, true); 
    const results = { total: numbers.length, added: 0, failed: [] };
    for (const num of numbers) {
        const [ok, msg] = addBed(roomId, num); 
        if (ok) results.added++; else results.failed.push(msg.split('במספר')[0] + num);
    }
    if (results.total > 0) {
        findRoom(roomId).room.beds.sort((a,b)=>a.bed_number-b.bed_number); 
        saveDB(); 
    }
    return results;
}


// --------------------------------------------------
//               עדכון (Update)
// --------------------------------------------------

function updateBuilding(id, newName) {
  const b = findBuilding(id);
  if (!b) return [false, 'מבנה לא נמצא'];
  newName = newName.trim();
  if (!newName) return [false, 'שם המבנה לא יכול להיות ריק'];
  if (DB.buildings.some(x => x.id !== id && x.name === newName)) return [false, 'מבנה בשם זה כבר קיים'];
  
  b.name = newName;
  saveDB();
  return [true];
}

function updateFloor(id, newNum, newDisplayName) {
  const found = findFloor(id);
  if (!found) return [false, 'קומה לא נמצאה'];
  
  const fn = Number(newNum);
  if (!Number.isFinite(fn)) return [false, 'מספר מיון אינו תקין'];
  if (found.building.floors.some(x => x.id !== id && x.floor_number === fn)) return [false, 'קומה עם מספר מיון זה כבר קיימת במבנה'];
  
  found.floor.floor_number = fn;
  found.floor.displayName = newDisplayName.trim();
  found.building.floors.sort((a,b)=>a.floor_number-b.floor_number); 
  saveDB();
  return [true];
}

function updateRoom(id, newNum) {
  const found = findRoom(id);
  if (!found) return [false, 'חדר לא נמצא'];
  
  newNum = String(newNum).trim();
  if (!newNum) return [false, 'מספר/שם חדר ריק'];
  if (found.floor.rooms.some(x => x.id !== id && x.room_number === newNum)) return [false, 'חדר בשם/מספר זה כבר קיים בקומה'];
  
  found.room.room_number = newNum;
  saveDB();
  return [true];
}

function updateStudent(id, studentData) {
  const s = findStudent(id); 
  if (!s) return [false, 'בחור לא נמצא'];
  
  const {
    lastName, firstName, id_card, passport, age, className, groupName, street, houseNum, city, phone, tags, status_data
  } = studentData;
  
  const sLastName = String(lastName).trim();
  const sFirstName = String(firstName).trim();

  if (!sFirstName || !sLastName) return [false, 'שם פרטי ושם משפחה הם שדות חובה'];
  
  // עדכון שם בהיסטוריית מיטות אם הוא משובץ
  const currentBed = getStudentBed(id);
  if(currentBed) {
      if (!currentBed.bed.history) currentBed.bed.history = [];
      const activeEntry = currentBed.bed.history.find(e => e.status === 'assigned' && e.studentId === id);
      if (activeEntry) {
          activeEntry.studentName = `${sFirstName} ${sLastName}`;
      }
  }

  s.lastName = sLastName;
  s.firstName = sFirstName;
  s.id_card = String(id_card || '').trim(); 
  s.passport = String(passport || '').trim(); 
  s.age = String(age || '').trim();
  s.className = String(className || '').trim();
  s.groupName = String(groupName || '').trim();
  s.street = String(street || '').trim();
  s.houseNum = String(houseNum || '').trim();
  s.city = String(city || '').trim();
  s.phone = String(phone || '').trim();
  s.tags = Array.isArray(tags) ? tags : []; 
  s.status_data = status_data || {}; 
  
  DB.students.sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'));
  saveDB();
  return [true];
}


// --------------------------------------------------
//               מחיקה (Delete)
// --------------------------------------------------

function deleteBuilding(buildingId) {
  const b = findBuilding(buildingId);
  if (!b) return;
  if (isOccupied(b)) return [false, 'לא ניתן למחוק מבנה מאוכלס. פנה את כל המיטות תחילה.'];
  
  DB.buildings = DB.buildings.filter(b => b.id !== buildingId);
  saveDB();
  return [true];
}

function deleteFloor(floorId) {
  const found = findFloor(floorId);
  if (!found) return;
  if (isOccupied(found.floor)) return [false, 'לא ניתן למחוק קומה מאוכלסת. פנה את כל המיטות תחילה.'];
  
  found.building.floors = found.building.floors.filter(f => f.id !== floorId);
  saveDB();
  return [true];
}

function deleteRoom(roomId) {
  const found = findRoom(roomId);
  if (!found) return;
  if (isOccupied(found.room)) return [false, 'לא ניתן למחוק חדר מאוכלס. פנה את כל המיטות תחילה.'];
  
  found.floor.rooms = found.floor.rooms.filter(r => r.id !== roomId);
  saveDB();
  return [true];
}

function deleteBed(bedId) {
  const found = findBed(bedId); if (!found) return;
  
  if (found.bed.student_id) {
      return [false, 'לא ניתן למחוק מיטה מאוכלסת. בטל את השיבוץ תחילה.'];
  }
  
  found.room.beds = found.room.beds.filter(b => b.id !== bedId);
  saveDB(); return [true];
}

function deleteStudent(id) {
  const oldBedLocation = getStudentBed(id);
  if (oldBedLocation) {
      _internalUnassignBed(oldBedLocation.bed, 'student_deleted');
  }

  DB.students = DB.students.filter(s => s.id !== id);
  saveDB(); 
}

// --------------------------------------------------
//               שיבוצים (Assignments)
// --------------------------------------------------

// פונקציית עזר פנימית לשחרור מיטה
function _internalUnassignBed(bed, reason = 'unassigned', movedToBedId = null) {
    if (!bed || !bed.student_id) return; 

    if (!bed.history) bed.history = [];

    const activeEntry = bed.history.find(e => e.status === 'assigned' && e.studentId === bed.student_id);
    
    if (activeEntry) {
        activeEntry.status = reason; 
        activeEntry.dateUnassigned = new Date().toISOString();
        activeEntry.movedToBedId = movedToBedId;
    }

    bed.student_id = null; 
}

function assignStudentToBed(bedId, studentId) { 
    const newBedResult = findBed(bedId); 
    if (!newBedResult) return; 
    
    if (newBedResult.bed.student_id !== null) {
        errorDialog('לא ניתן לשבץ בחור למיטה שכבר תפוסה. יש לפנות אותה תחילה.');
        return;
    }
    
    const student = findStudent(studentId);
    if (!student) return; 

    const oldBedLocation = getStudentBed(studentId);
    if (oldBedLocation) {
        _internalUnassignBed(oldBedLocation.bed, 'moved', bedId);
    }

    if (!newBedResult.bed.history) newBedResult.bed.history = [];

    newBedResult.bed.history.push({
        studentId: studentId,
        studentName: `${student.firstName} ${student.lastName}`, 
        dateAssigned: new Date().toISOString(),
        dateUnassigned: null,
        status: 'assigned',
        movedFromBedId: oldBedLocation ? oldBedLocation.bed.id : null 
    });

    newBedResult.bed.student_id = studentId;
    saveDB(); 
}

function unassignBed(bedId) {
  const f = findBed(bedId);
  if (!f) return;
  _internalUnassignBed(f.bed, 'unassigned'); 
  saveDB(); 
}
