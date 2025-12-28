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
      ok.onclick = null; cancel.onclick = null;
      back.classList.add('hidden'); back.setAttribute('aria-hidden', 'true');
    };
    
    ok.onclick = () => { cleanup(); onOk && onOk(); };
    cancel.onclick = () => { cleanup(); if (typeof onCancel === 'function') onCancel(); };
}

function confirmDialog(message) {
    return new Promise((resolve) => {
      showModal('אישור פעולה', `<div class="row">${escapeHtml(message)}</div>`, () => resolve(true), () => resolve(false));
    });
}

function errorDialog(message) {
    showModal('שגיאה', `<div class="row"><p class="error-msg" style="font-size:1.1rem; text-align:center">${escapeHtml(message)}</p></div>`, () => {}, null);
}

function switchTab(key) {
    const isManage = key === 'manage';
    els('.menu-item').forEach(el => el.classList.remove('active'));
    
    if (isManage) {
        el('#menu-manage').classList.add('active');
        el('header h1').textContent = 'לוח בקרה ראשי'; 
    } else {
        el('#menu-students').classList.add('active');
        el('header h1').textContent = 'ניהול בחורים'; 
    }
    
    el('#pane-manage').classList.toggle('hidden', !isManage);
    el('#pane-students').classList.toggle('hidden', isManage);
    
    if (!isManage) selectedNode = null; 
    
    setTimeout(() => {
        refreshAll();
        if (!isManage && typeof gridApi !== 'undefined' && gridApi) gridApi.sizeColumnsToFit();
    }, 50);
}
