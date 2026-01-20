// ==================================================
//      קובץ 2: מנהל הנתונים (Data Manager)
// ==================================================

import { byId, parseRange } from './01-utils.js';

const STORAGE_KEY = 'pnimiyot_db_v4_excel'; 

// --------------------------------------------------
//               DB Initialization & Core
// --------------------------------------------------

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { seq: {building:1, floor:1, room:1, bed:1, student:1}, buildings: [], students: [], auditLog: [] };
  try {
    const loadedDB = JSON.parse(raw);
    loadedDB.students = (loadedDB.students || []).map(s => ({ ...s, tags: s.tags || [], status_data: s.status_data || {}, scheduled_events: s.scheduled_events || [] }));
    loadedDB.auditLog = loadedDB.auditLog || [];
    return loadedDB;
  } catch {
    return { seq: {building:1, floor:1, room:1, bed:1, student:1}, buildings: [], students: [], auditLog: [] };
  }
}

let DB = loadDB();

function getDB() { return DB; }
function setDB(newDB) { DB = newDB; }

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  document.dispatchEvent(new CustomEvent('db-updated'));
}

// --------------------------------------------------
//               Audit Log Logic
// --------------------------------------------------

function logAction(action, details = {}) {
    // Prevent logging for bulk operations, they will be logged separately
    if (details.isBulk) return;

    DB.auditLog.unshift({
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    });

    // Keep the log from growing too large
    if (DB.auditLog.length > 1000) {
        DB.auditLog.pop();
    }
}

// --------------------------------------------------
//               Finders & Getters
// --------------------------------------------------

function findBuilding(buildingId) { return DB.buildings.find(byId(buildingId)); }
function findFloor(floorId) { for (const b of DB.buildings) { const f = b.floors.find(byId(floorId)); if (f) return { building: b, floor: f }; } return null; }
function findRoom(roomId) { for (const b of DB.buildings) { for (const f of b.floors) { const r = f.rooms.find(byId(roomId)); if (r) return { building: b, floor: f, room: r }; } } return null; }
function findBed(bedId) { for (const b of DB.buildings) { for (const f of b.floors) { for (const r of f.rooms) { const bed = r.beds.find(byId(bedId)); if (bed) return { building: b, floor: f, room: r, bed: bed }; } } } return null; }
function findStudent(studentId) { return DB.students.find(byId(studentId)); }
function isOccupied(item) { if (item.type === 'b') return item.floors.some(isOccupied); if (item.type === 'f') return item.rooms.some(isOccupied); if (item.type === 'r') return item.beds.some(b => b.student_id !== null); return false; }
function getStudentBed(studentId) { for (const b of DB.buildings) { for (const f of b.floors) { for (const r of f.rooms) { const bed = r.beds.find(b => b.student_id === studentId); if (bed) return { building: b, floor: f, room: r, bed: bed }; } } } return null; }
function getUnassignedStudents() { const assigned = new Set(DB.buildings.flatMap(b => b.floors).flatMap(f => f.rooms).flatMap(r => r.beds).map(bed => bed.student_id).filter(Boolean)); return DB.students.filter(s => !assigned.has(s.id)); }

// --------------------------------------------------
//               Create Operations
// --------------------------------------------------

function addBuilding(name) {
  name = name.trim();
  if (!name) return [false, 'שם המבנה לא יכול להיות ריק'];
  if (DB.buildings.some(b => b.name === name)) return [false, `מבנה בשם זה כבר קיים`];
  
  const newBuilding = { id: DB.seq.building++, name, floors: [], type:'b' };
  DB.buildings.push(newBuilding);
  logAction('Create Building', { name });
  saveDB();
  return [true];
}

function addFloor(buildingId, floor_number, displayName) {
  const b = findBuilding(buildingId);
  if (!b) return [false, 'מבנה לא נמצא'];
  
  const fn = Number(floor_number);
  if (!Number.isFinite(fn)) return [false, `מספר המיון "${floor_number}" אינו תקין (חייב להיות מספר)`];
  if (b.floors.some(f => f.floor_number === fn)) return [false, `קומה עם מספר מיון ${fn} כבר קיימת במבנה`];
  
  const newFloor = { id: DB.seq.floor++, floor_number: fn, displayName: displayName.trim(), rooms: [], type:'f' };
  b.floors.push(newFloor);
  b.floors.sort((a,b)=>a.floor_number-b.floor_number);
  logAction('Create Floor', { number: fn, name: displayName, building: b.name });
  saveDB();
  return [true];
}

function addRoom(floorId, room_number, isBulk = false) {
  const {floor, building} = findFloor(floorId) || {};
  if (!floor) return [false, 'קומה לא נמצאה'];
  
  room_number = String(room_number).trim();
  if (!room_number) return [false, 'מספר/שם חדר ריק'];
  if (floor.rooms.some(r => r.room_number === room_number)) return [false, `חדר בשם/מספר "${room_number}" כבר קיים בקומה`];
  
  const newRoom = { id: DB.seq.room++, room_number, beds: [], type:'r' };
  floor.rooms.push(newRoom);
  logAction('Create Room', { number: room_number, floor: floor.displayName || floor.floor_number, building: building.name, isBulk });
  if (!isBulk) saveDB();
  return [true];
}

function addBed(roomId, bed_number, isBulk = false) {
  const {room, floor, building} = findRoom(roomId) || {};
  if (!room) return [false, 'חדר לא נמצא'];
  
  const bn = Number(bed_number);
  if (!Number.isFinite(bn) || bn <= 0) return [false, `מספר מיטה "${bed_number}" אינו תקין`];
  if (room.beds.some(b => b.bed_number === bn)) return [false, `מיטה מספר ${bn} כבר קיימת בחדר`];
  
  const newBed = { id: DB.seq.bed++, bed_number: bn, student_id: null, type:'bed', history: [] };
  room.beds.push(newBed);
  room.beds.sort((a,b)=>a.bed_number-b.bed_number);
  logAction('Create Bed', { number: bn, room: room.room_number, floor: floor.displayName || floor.floor_number, building: building.name, isBulk });
  if (!isBulk) saveDB();
  return [true];
}

function addStudent(studentData, skipSave = false) {
  const sId_card = String(studentData.id_card || '').trim();
  const sPassport = String(studentData.passport || '').trim();
  const primaryId = sId_card || sPassport;

  if (!primaryId) return [false, 'מספר זהות או דרכון הוא חובה'];
  const sLastName = String(studentData.lastName || '').trim();
  const sFirstName = String(studentData.firstName || '').trim();
  if (!sFirstName || !sLastName) return [false, 'שם פרטי ומשפחה הם חובה'];
  if (DB.students.some(s => s.id === primaryId)) return [false, `בחור עם מזהה "${primaryId}" כבר קיים`];
  
  const newStudent = { ...studentData, id: primaryId, type: 'student', tags: [], status_data: {}, scheduled_events: [] };
  DB.students.push(newStudent);
  DB.students.sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'));
  
  logAction('Create Student', { name: `${sFirstName} ${sLastName}`, id: primaryId, isBulk: skipSave });
  if (!skipSave) saveDB(); 
  return [true];
}

// --------------------------------------------------
//               Bulk Operations
// --------------------------------------------------

function addRoomsBulk(floorId, input) {
    const numbers = parseRange(input, false); 
    const results = { total: numbers.length, added: 0, failed: [] };
    for (const num of numbers) {
        const [ok, msg] = addRoom(floorId, num, true); 
        if (ok) results.added++; else results.failed.push(msg);
    }
    if (results.added > 0) {
        const { building } = findFloor(floorId);
        logAction('Bulk Create Rooms', { count: results.added, building: building.name });
        saveDB();
    }
    return results;
}

function addBedsBulk(roomId, input) {
    const numbers = parseRange(input, true); 
    const results = { total: numbers.length, added: 0, failed: [] };
    for (const num of numbers) {
        const [ok, msg] = addBed(roomId, num, true); 
        if (ok) results.added++; else results.failed.push(msg);
    }
    if (results.added > 0) {
        const { room } = findRoom(roomId);
        room.beds.sort((a,b)=>a.bed_number-b.bed_number); 
        logAction('Bulk Create Beds', { count: results.added, room: room.room_number });
        saveDB(); 
    }
    return results;
}

// --------------------------------------------------
//               Update Operations
// --------------------------------------------------

function updateBuilding(id, newName) {
  const b = findBuilding(id);
  if (!b) return [false, 'מבנה לא נמצא'];
  newName = newName.trim();
  if (!newName) return [false, 'שם לא יכול להיות ריק'];
  if (DB.buildings.some(x => x.id !== id && x.name === newName)) return [false, 'שם זה כבר קיים'];
  
  const oldName = b.name;
  b.name = newName;
  logAction('Update Building', { oldName, newName, id });
  saveDB();
  return [true];
}

function updateFloor(id, newNum, newDisplayName) {
  const { building, floor } = findFloor(id);
  if (!floor) return [false, 'קומה לא נמצאה'];
  const fn = Number(newNum);
  if (!Number.isFinite(fn)) return [false, 'מספר מיון לא תקין'];
  if (building.floors.some(x => x.id !== id && x.floor_number === fn)) return [false, 'מספר מיון זה כבר קיים'];
  
  const oldNum = floor.floor_number;
  const oldName = floor.displayName;
  floor.floor_number = fn;
  floor.displayName = newDisplayName.trim();
  building.floors.sort((a,b)=>a.floor_number-b.floor_number); 
  logAction('Update Floor', { oldNum, newNum: fn, oldName, newName: newDisplayName, building: building.name });
  saveDB();
  return [true];
}

function updateRoom(id, newNum) {
  const { floor, room } = findRoom(id);
  if (!room) return [false, 'חדר לא נמצא'];
  newNum = String(newNum).trim();
  if (!newNum) return [false, 'מספר חדר ריק'];
  if (floor.rooms.some(x => x.id !== id && x.room_number === newNum)) return [false, 'מספר חדר זה כבר קיים'];
  
  const oldNum = room.room_number;
  room.room_number = newNum;
  logAction('Update Room', { oldNum, newNum, floor: floor.displayName || floor.floor_number });
  saveDB();
  return [true];
}

function updateStudent(id, studentData) {
  const s = findStudent(id); 
  if (!s) return [false, 'בחור לא נמצא'];
  
  // Create a snapshot for logging
  const oldData = { name: `${s.firstName} ${s.lastName}`, className: s.className, tags: s.tags };

  const sLastName = String(studentData.lastName).trim();
  const sFirstName = String(studentData.firstName).trim();
  if (!sFirstName || !sLastName) return [false, 'שם פרטי ומשפחה הם חובה'];
  
  const currentBed = getStudentBed(id);
  if(currentBed && currentBed.bed.history) {
      const activeEntry = currentBed.bed.history.find(e => e.status === 'assigned' && e.studentId === id);
      if (activeEntry) activeEntry.studentName = `${sFirstName} ${sLastName}`;
  }

  Object.assign(s, studentData); // Update all fields from studentData
  s.lastName = sLastName;
  s.firstName = sFirstName;

  DB.students.sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'));
  logAction('Update Student', { id, oldData, newData: { name: `${s.firstName} ${s.lastName}`, className: s.className, tags: s.tags } });
  saveDB();
  return [true];
}

// --------------------------------------------------
//               Delete Operations
// --------------------------------------------------

function deleteBuilding(buildingId) {
  const b = findBuilding(buildingId);
  if (!b) return;
  if (isOccupied(b)) return [false, 'לא ניתן למחוק מבנה מאוכלס'];
  
  logAction('Delete Building', { name: b.name, id: buildingId });
  DB.buildings = DB.buildings.filter(b => b.id !== buildingId);
  saveDB();
  return [true];
}

function deleteFloor(floorId) {
  const {building, floor} = findFloor(floorId);
  if (!floor) return;
  if (isOccupied(floor)) return [false, 'לא ניתן למחוק קומה מאוכלסת'];
  
  logAction('Delete Floor', { name: floor.displayName || floor.floor_number, id: floorId, building: building.name });
  building.floors = building.floors.filter(f => f.id !== floorId);
  saveDB();
  return [true];
}

function deleteRoom(roomId) {
  const {floor, room} = findRoom(roomId);
  if (!room) return;
  if (isOccupied(room)) return [false, 'לא ניתן למחוק חדר מאוכלס'];
  
  logAction('Delete Room', { number: room.room_number, id: roomId, floor: floor.displayName || floor.floor_number });
  floor.rooms = floor.rooms.filter(r => r.id !== roomId);
  saveDB();
  return [true];
}

function deleteBed(bedId) {
  const {room, bed} = findBed(bedId); 
  if (!bed) return;
  if (bed.student_id) return [false, 'לא ניתן למחוק מיטה מאוכלסת'];
  
  logAction('Delete Bed', { number: bed.bed_number, id: bedId, room: room.room_number });
  room.beds = room.beds.filter(b => b.id !== bedId);
  saveDB(); 
  return [true];
}

function deleteStudent(id) {
  const student = findStudent(id);
  if (!student) return;

  const oldBedLocation = getStudentBed(id);
  if (oldBedLocation) {
      _internalUnassignBed(oldBedLocation.bed, 'student_deleted');
  }

  logAction('Delete Student', { name: `${student.firstName} ${student.lastName}`, id });
  DB.students = DB.students.filter(s => s.id !== id);
  saveDB(); 
}

// --------------------------------------------------
//               Assignment Operations
// --------------------------------------------------

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
    const { building, floor, room, bed } = findBed(bedId); 
    if (!bed) return [false, "Bed not found"]; 
    if (bed.student_id) return [false, 'מיטה זו כבר תפוסה'];
    
    const student = findStudent(studentId);
    if (!student) return [false, "Student not found"]; 

    const oldBedLocation = getStudentBed(studentId);
    if (oldBedLocation) {
        _internalUnassignBed(oldBedLocation.bed, 'moved', bedId);
    }

    if (!bed.history) bed.history = [];
    bed.history.push({ studentId: studentId, studentName: `${student.firstName} ${student.lastName}`, dateAssigned: new Date().toISOString(), dateUnassigned: null, status: 'assigned', movedFromBedId: oldBedLocation ? oldBedLocation.bed.id : null });
    bed.student_id = studentId;

    const location = `${building.name}, ${floor.displayName || floor.floor_number}, חדר ${room.room_number}, מיטה ${bed.bed_number}`;
    logAction('Assign Student', { student: `${student.firstName} ${student.lastName}`, location });
    saveDB(); 
    return [true];
}

function unassignBed(bedId) {
  const { building, floor, room, bed } = findBed(bedId);
  if (!bed || !bed.student_id) return;
  
  const student = findStudent(bed.student_id);
  _internalUnassignBed(bed, 'unassigned'); 
  
  const location = `${building.name}, ${floor.displayName || floor.floor_number}, חדר ${room.room_number}, מיטה ${bed.bed_number}`;
  logAction('Unassign Student', { student: student ? `${student.firstName} ${student.lastName}` : 'לא ידוע', location });
  saveDB(); 
}

export {
    getDB, setDB, saveDB, loadDB, findBuilding, findFloor, findRoom, findBed, findStudent, isOccupied, getStudentBed, getUnassignedStudents,
    addBuilding, addFloor, addRoom, addBed, addStudent, addRoomsBulk, addBedsBulk,
    updateBuilding, updateFloor, updateRoom, updateStudent,
    deleteBuilding, deleteFloor, deleteRoom, deleteBed, deleteStudent,
    assignStudentToBed, unassignBed,
    logAction
};
