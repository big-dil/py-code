// ==================================================
//      קובץ 4: ליבת ממשק המשתמש (UI Core)
// ==================================================
import { el, els, escapeHtml } from './01-utils.js';

// --------------------------------------------------
//               ניהול מצב בחירה (State)
// --------------------------------------------------

let selectedNode = null;
let selectedStudentId = null;

function setSelectedNode(node, scroll = false) {
    selectedNode = node;
    const detail = { scrollToId: null, type: node ? node.type : null };
    if (node && scroll) {
        detail.scrollToId = node.id;
    }
    document.dispatchEvent(new CustomEvent('selection-changed', { detail }));
}

function setSelectedStudentId(studentId) {
    selectedStudentId = studentId;
    document.dispatchEvent(new CustomEvent('selection-changed'));
}

function handleNodeSelection(type, id, elem) {
  // Set the state
  setSelectedNode({ type, id: Number(id) });
  
  // The 'selection-changed' event will handle the UI updates,
  // but we can add an immediate class for responsiveness before the main update fires.
  els('.tree-item.selected, .bed-cell.selected-bed').forEach(e => e.classList.remove('selected', 'selected-bed'));
  if (elem) {
    elem.classList.add(type === 'bed' ? 'selected-bed' : 'selected');
  }
}



// --------------------------------------------------
//               ניהול מודאלים (Modals)
// --------------------------------------------------

function showModal(title, html, onOk, onCancel) {
  const modal = el('#modal-backdrop .modal');
  modal.scrollTo(0, 0); 
  el('#modal-title').textContent = title;
  el('#modal-body').innerHTML = html;
  
  const back = el('#modal-backdrop');
  back.classList.remove('hidden');
  back.setAttribute('aria-hidden', 'false');
  
  const ok = el('#modal-ok');
  const cancel = el('#modal-cancel');
  
  ok.style.display = onOk ? 'inline-block' : 'none';
  cancel.textContent = (typeof onCancel === 'string') ? onCancel : (onOk ? 'ביטול' : 'סגור');

  const cleanup = () => {
    if (document.activeElement) document.activeElement.blur(); 
    ok.onclick = null; 
    cancel.onclick = null;
    back.classList.add('hidden'); 
    back.setAttribute('aria-hidden', 'true');
  };
  
  ok.onclick = () => { cleanup(); onOk && onOk(); };
  cancel.onclick = () => { 
    cleanup(); 
    if (typeof onCancel === 'function') onCancel(); 
  };
}

function confirmDialog(message) {
  return Swal.fire({
    title: 'אישור פעולה',
    html: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'אשר',
    cancelButtonText: 'בטל',
    confirmButtonColor: 'var(--primary)',
    cancelButtonColor: 'var(--secondary)'
  }).then((result) => {
    return result.isConfirmed;
  });
}

function errorDialog(message) {
  return Swal.fire({
    title: 'שגיאה',
    html: message,
    icon: 'error',
    confirmButtonText: 'סגור',
    confirmButtonColor: 'var(--primary)'
  });
}


// --------------------------------------------------
//               ניווט וטאבים (Tabs)
// --------------------------------------------------

function switchTab(key) {
  // Hide all panes
  document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
  // Deactivate all menu items
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

  let paneId;
  let menuId;
  let headerText;

  switch (key) {
    case 'manage':
      paneId = '#pane-manage';
      menuId = '#menu-manage';
      headerText = 'ניהול ושיבוצים';
      break;
    case 'students':
      paneId = '#pane-students';
      menuId = '#menu-students';
      headerText = 'ניהול בחורים';
      break;
    case 'reports':
      paneId = '#pane-reports';
      menuId = '#menu-reports';
      headerText = 'דוחות וסטטיסטיקות';
      break;
    case 'audit':
      paneId = '#pane-audit';
      menuId = '#menu-audit';
      headerText = 'היסטוריית שינויים';
      break;
    case 'status-board':
    default:
      paneId = '#pane-status-board';
      menuId = '#menu-status-board';
      headerText = 'לוח סטטוסים';
      break;
  }

  el(paneId).classList.remove('hidden');
  el(menuId).classList.add('active');
  el('header h1').textContent = headerText;

  if (key !== 'manage') {
    setSelectedNode(null);
  }
  
  document.dispatchEvent(new CustomEvent('tab-switched', { detail: { key } }));
}

// exposing the state for reading, and setters for writing
export {
    selectedNode,
    selectedStudentId,
    setSelectedNode,
    setSelectedStudentId,
    handleNodeSelection,
    showModal,
    confirmDialog,
    errorDialog,
    switchTab
};
