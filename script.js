// ============ 1. قاعدة البيانات (Auto-Seed) لتوليد بيانات تلقائية ============
let currentYear = localStorage.getItem(APP_CONFIG.DB_KEY + '_currentYear') || '';
let allYears = [];
try { allYears = JSON.parse(localStorage.getItem(APP_CONFIG.DB_KEY + '_allYears')) || []; } catch(e){}

let db;
try {
    db = JSON.parse(localStorage.getItem(APP_CONFIG.DB_KEY + "_" + currentYear));
} catch (e) {
    db = null;
}

let dObj = new Date();
let todayISO = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');

const defaultSubjects = ['العربي','الرياضيات','الإنكليزي','الإسلامية','الكيمياء','الفيزياء','الاحياء','الفنية','الرياضة'];

let currentStudentId = null, editingStudentId = null, tempSiblings = [], editingStaffId = null, currentTeacherId = null;
let editingDirectSibMainId = null, editingDirectSibIdx = null, editingTempSibIdx = null;

// ============ 2. محرك التنبيهات 3D (SweetAlert2) ============
function customAlert(msg, icon = 'info') { 
    if(typeof Swal !== 'undefined') Swal.fire({ text: msg, icon: icon, confirmButtonText: 'موافق', customClass: { popup: 'swal2-glass' }}); 
    else alert(msg);
}
function customConfirm(msg, cb) { 
    if(typeof Swal !== 'undefined') Swal.fire({ text: msg, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم متأكد', cancelButtonText: 'إلغاء', customClass: { popup: 'swal2-glass' }}).then((res) => { cb(res.isConfirmed); }); 
    else cb(confirm(msg));
}
function customPrompt(msg, cb) { 
    if(typeof Swal !== 'undefined') Swal.fire({ title: msg, input: 'text', showCancelButton: true, confirmButtonText: 'تأكيد', cancelButtonText: 'إلغاء', customClass: { popup: 'swal2-glass' }}).then((res) => { cb(res.isConfirmed ? res.value : null); }); 
    else { let v = prompt(msg); cb(v); }
}

// ============ 3. التشغيل السحابي والدخول السريع ومحرك PWA ============
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtnUI = document.getElementById('trigger-install-modal');
    if(installBtnUI) installBtnUI.style.display = 'block';
});

document.getElementById('btn-install-pwa').addEventListener('click', async () => {
    hideModal('pwa-install-modal');
    if(deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    }
});

document.getElementById('trigger-install-modal').addEventListener('click', () => {
    showModal('pwa-install-modal');
});

async function startApp() {
    let metaKey = APP_CONFIG.DB_KEY + "_meta";
    
    if (window.firebaseReady && window.fsDb) {
        try {
            const metaRef = window.fsDoc(window.fsDb, "schools", metaKey);
            const metaSnap = await window.fsGetDoc(metaRef);
            if (metaSnap.exists()) {
                let metaData = metaSnap.data();
                allYears = metaData.years || [];
                localStorage.setItem(APP_CONFIG.DB_KEY + '_allYears', JSON.stringify(allYears));
            } else {
                const oldRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY);
                const oldSnap = await window.fsGetDoc(oldRef);
                if(oldSnap.exists()) {
                    let oldDb = oldSnap.data();
                    let y = oldDb.schoolDate || '2025-2026';
                    allYears = [y];
                    await window.fsSetDoc(metaRef, {years: allYears});
                    await window.fsSetDoc(window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + y), oldDb);
                }
            }
        } catch(e) { console.error(e); }
    }

    if(allYears.length === 0) {
        try { allYears = JSON.parse(localStorage.getItem(APP_CONFIG.DB_KEY + '_allYears')); } catch(e){}
        if(!allYears || allYears.length === 0) {
            let oldDbLocal = null;
            try { oldDbLocal = JSON.parse(localStorage.getItem(APP_CONFIG.DB_KEY)); } catch(e){}
            if(oldDbLocal) {
                let y = oldDbLocal.schoolDate || '2025-2026';
                allYears = [y];
                localStorage.setItem(APP_CONFIG.DB_KEY + '_' + y, JSON.stringify(oldDbLocal));
            }
        }
    }
    if(!allYears || allYears.length === 0) allYears = [];

    currentYear = localStorage.getItem(APP_CONFIG.DB_KEY + '_currentYear');
    if(!currentYear || !allYears.includes(currentYear)) {
        if(allYears.length > 0) currentYear = allYears[allYears.length - 1];
        else currentYear = '';
        if(currentYear) localStorage.setItem(APP_CONFIG.DB_KEY + '_currentYear', currentYear);
    }

    if (currentYear && window.firebaseReady && window.fsDb) {
        try {
            const docRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + currentYear);
            const docSnap = await window.fsGetDoc(docRef);
            if (docSnap.exists()) {
                db = docSnap.data(); 
                localStorage.setItem(APP_CONFIG.DB_KEY + "_" + currentYear, JSON.stringify(db));
            }
        } catch (e) {
            console.error("خطأ", e);
        }
    }
    
    if(currentYear) {
        try { db = JSON.parse(localStorage.getItem(APP_CONFIG.DB_KEY + "_" + currentYear)); } catch(e) { db = null; }
    } else {
        db = null;
    }
    
    if(!db || typeof db !== 'object') {
       db = {
            schoolName: '', schoolDate: currentYear, theme: 'light',
            settings: { subjects: [...defaultSubjects], receiptCounter: 1000 },
            classes: [{ id: 1, name: 'الأول الابتدائي', sections: [{id: 11, name: 'أ'}, {id: 12, name: 'ب'}] }],
            regions: [], students: [], staff: [], expenses: [], recycleBin: []
        };
    }
    
    applyTheme(db.theme);
    if (!db.schoolName || db.schoolName.trim() === '') { 
        document.getElementById('setup-modal').classList.add('active'); 
    } else { 
        document.getElementById('setup-modal').classList.remove('active'); 
        document.getElementById('app').classList.remove('hidden'); 
        initApp(); 
    }
}

window.onload = () => {
    if (window.firebaseReady) {
        startApp();
    } else {
        window.onFirebaseReady = startApp;
        setTimeout(() => { if (!window.firebaseReady) startApp(); }, 3000);
    }
};

function saveDB() { 
    if(!currentYear) return;
    localStorage.setItem(APP_CONFIG.DB_KEY + "_" + currentYear, JSON.stringify(db)); 
    if (window.firebaseReady && window.fsDb) {
        const docRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + currentYear);
        window.fsSetDoc(docRef, db).catch(e => console.error("خطأ أثناء المزامنة السحابية:", e));
    }
}

function saveSetup() {
    let name = document.getElementById('setup-school-name').value;
    let date = document.getElementById('setup-school-date').value;
    if(!date) date = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
    
    if (!name || name.trim() === '') {
        alert('يرجى كتابة اسم المدرسة للبدء!');
        return;
    }
    
    if (!db || typeof db !== 'object') db = {};
    db.schoolName = name.trim(); 
    db.schoolDate = date; 
    
    if(allYears.length === 0) {
        allYears.push(date);
        currentYear = date;
        localStorage.setItem(APP_CONFIG.DB_KEY + '_allYears', JSON.stringify(allYears));
        localStorage.setItem(APP_CONFIG.DB_KEY + '_currentYear', currentYear);
        if(window.firebaseReady && window.fsDb) {
            window.fsSetDoc(window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_meta"), {years: allYears}).catch(e=>console.log(e));
        }
    }

    try {
        initApp(); 
        saveDB(); 
        
        document.getElementById('setup-modal').classList.remove('active');
        document.getElementById('app').classList.remove('hidden');
        
        if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم تسجيل الدخول بنجاح', showConfirmButton:false, timer:2000});
    } catch (err) {
        console.error("خطأ أثناء الدخول:", err);
        alert("حدث خطأ يرجى تحديث الصفحة (Refresh).");
    }
}

function initApp() {
    if(!db.classes) db.classes = [
        { id: 1, name: 'الأول الابتدائي', sections: [{id: 11, name: 'أ'}, {id: 12, name: 'ب'}] },
        { id: 2, name: 'الثاني الابتدائي', sections: [{id: 21, name: 'أ'}] }
    ];
    if(!db.regions) db.regions = [];
    if(!db.students) db.students = [];
    if(!db.staff) db.staff = []; 
    if(!db.expenses) db.expenses = [];
    if(!db.settings) db.settings = { subjects: [...defaultSubjects], receiptCounter: 1000 };
    if(!db.settings.receiptCounter) db.settings.receiptCounter = 1000;
    if(!db.recycleBin) db.recycleBin = [];

    let now = Date.now();
    db.recycleBin = db.recycleBin.filter(s => {
        let diffDays = (now - (s.deletedAt || now)) / (1000 * 3600 * 24);
        return diffDays <= 15;
    });
    saveDB();
    
    document.getElementById('display-school-name').innerHTML = `<i class="fas fa-university"></i> ${db.schoolName}`;
    document.getElementById('edit-school-name').value = db.schoolName; 
    document.getElementById('edit-school-date').value = db.schoolDate || '';
    
    document.getElementById('daily-date-filter').value = todayISO;
    document.getElementById('pay-date').value = todayISO;
    document.getElementById('exp-date').value = todayISO;
    document.getElementById('teach-pay-date').value = todayISO;

    renderYearsDropdown();
    renderClasses(); renderRegions(); renderSubjects(); renderStudents(); populateClassSelects(); updateRepSectionDropdown();
    renderDual(); renderDaily(); renderStaff(); renderExpenses(); renderStatistics();
}

// ============ إدارة السنوات الدراسية ============
function renderYearsDropdown() {
    let sel = document.getElementById('switch-year-select');
    if(sel) sel.innerHTML = allYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');
    
    let dcy = document.getElementById('display-current-year');
    if(dcy) dcy.innerText = currentYear;
    
    let pty = document.getElementById('prom-target-year');
    if(pty) pty.innerHTML = allYears.filter(y => y !== currentYear).map(y => `<option value="${y}">${y}</option>`).join('') || '<option value="">لا توجد سنة أخرى</option>';
    
    let bpty = document.getElementById('bulk-prom-target-year');
    if(bpty) bpty.innerHTML = allYears.filter(y => y !== currentYear).map(y => `<option value="${y}">${y}</option>`).join('') || '<option value="">لا توجد سنة أخرى</option>';
}

function switchYear() {
    let selected = document.getElementById('switch-year-select').value;
    if(selected && selected !== currentYear) {
        localStorage.setItem(APP_CONFIG.DB_KEY + '_currentYear', selected);
        location.reload(); 
    }
}

function editCurrentYearName() {
    customPrompt(`تعديل اسم السنة الحالية (${currentYear}):`, async newName => {
        if(!newName) return;
        newName = newName.trim();
        if(newName === currentYear || newName === '') return;
        if(allYears.includes(newName)) return customAlert('هذا الاسم موجود مسبقاً!', 'error');

        customConfirm(`تأكيد تغيير اسم السنة من (${currentYear}) إلى (${newName})؟`, async r => {
            if(r) {
                try {
                    let idx = allYears.indexOf(currentYear);
                    if(idx !== -1) allYears[idx] = newName;
                    localStorage.setItem(APP_CONFIG.DB_KEY + '_allYears', JSON.stringify(allYears));
                    
                    if(window.firebaseReady && window.fsDb) {
                        try {
                            const metaRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_meta");
                            await window.fsSetDoc(metaRef, {years: allYears});
                        } catch(e){}
                    }

                    db.schoolDate = newName;
                    localStorage.setItem(APP_CONFIG.DB_KEY + "_" + newName, JSON.stringify(db));
                    localStorage.removeItem(APP_CONFIG.DB_KEY + "_" + currentYear);

                    if(window.firebaseReady && window.fsDb) {
                        try {
                            const newDocRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + newName);
                            await window.fsSetDoc(newDocRef, db);
                        } catch(e){}
                    }

                    currentYear = newName;
                    localStorage.setItem(APP_CONFIG.DB_KEY + '_currentYear', currentYear);
                    
                    customAlert('تم تغيير اسم السنة بنجاح!', 'success');
                    setTimeout(() => location.reload(), 1500);
                } catch(e) {
                    console.error(e);
                    customAlert('حدث خطأ أثناء تعديل السنة', 'error');
                }
            }
        });
    });
}

function addNewYear() {
    let ny = document.getElementById('new-year-name').value.trim();
    if(!ny) return customAlert('يرجى كتابة اسم السنة الدراسية!', 'warning');
    if(allYears.includes(ny)) return customAlert('هذه السنة موجودة مسبقاً!', 'error');

    customConfirm(`تأكيد إنشاء سنة دراسية جديدة (${ny})؟ النظام سيقوم بنسخ الصفوف والمواد فقط وتفريغ حسابات الطلاب والمالية.`, async r => {
        if(r) {
            allYears.push(ny);
            localStorage.setItem(APP_CONFIG.DB_KEY + '_allYears', JSON.stringify(allYears));
            if(window.firebaseReady && window.fsDb) {
                try {
                    const metaRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_meta");
                    await window.fsSetDoc(metaRef, {years: allYears});
                } catch(e){}
            }

            let newDb = {
                schoolName: db.schoolName,
                schoolDate: ny,
                theme: db.theme,
                settings: db.settings,
                classes: db.classes,
                regions: db.regions,
                staff: db.staff.map(st => ({...st, payments: [], salary: st.salary || 0})),
                students: [],
                expenses: [],
                recycleBin: []
            };
            localStorage.setItem(APP_CONFIG.DB_KEY + "_" + ny, JSON.stringify(newDb));
            if (window.firebaseReady && window.fsDb) {
                try {
                    const docRef = window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + ny);
                    await window.fsSetDoc(docRef, newDb);
                } catch(e){}
            }

            document.getElementById('new-year-name').value = '';
            renderYearsDropdown();
            customAlert('تم إضافة السنة الدراسية بنجاح!', 'success');
        }
    });
}

async function getTargetYearDB(year) {
    let targetDb = null;
    try { 
        let local = localStorage.getItem(APP_CONFIG.DB_KEY + "_" + year);
        if(local) targetDb = JSON.parse(local); 
    } catch(e){}
    
    if(!targetDb && window.firebaseReady && window.fsDb) {
        try {
            let snap = await window.fsGetDoc(window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + year));
            if(snap.exists()) targetDb = snap.data();
        } catch(e) { console.error("Error fetching target DB:", e); }
    }
    return targetDb;
}

async function saveTargetYearDB(year, targetDb) {
    localStorage.setItem(APP_CONFIG.DB_KEY + "_" + year, JSON.stringify(targetDb));
    if(window.firebaseReady && window.fsDb) {
        try {
            await window.fsSetDoc(window.fsDoc(window.fsDb, "schools", APP_CONFIG.DB_KEY + "_" + year), targetDb);
        } catch(e) { console.error("Error saving target DB:", e); }
    }
}
// ===============================================

function updateSchool() {
    db.schoolName = document.getElementById('edit-school-name').value; 
    db.schoolDate = document.getElementById('edit-school-date').value;
    saveDB(); 
    document.getElementById('display-school-name').innerHTML = `<i class="fas fa-university"></i> ${db.schoolName}`;
    customAlert('تم تحديث بيانات المدرسة بنجاح', 'success');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    let tab = document.getElementById(`tab-${tabId}`);
    let nav = document.getElementById(`nav-${tabId}`);
    
    if(tab) tab.classList.add('active-tab'); 
    if(nav) nav.classList.add('active');
    
    if(tabId === 'students') renderStudents();
    if(tabId === 'reports') updateRepSectionDropdown();
    if(tabId === 'staff') renderStaff();
    if(tabId === 'expenses') renderExpenses();
    if(tabId === 'daily') renderDaily();
    if(tabId === 'dashboard') renderDual();
    if(tabId === 'statistics') renderStatistics();
}

function toggleTheme() { db.theme = db.theme === 'light' ? 'dark' : 'light'; applyTheme(db.theme); saveDB(); }
function applyTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); }
function showModal(id) { document.getElementById(id).classList.add('active'); }
function hideModal(id) { document.getElementById(id).classList.remove('active'); }

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
    if (e.key === 'Enter') {
        let activeModal = document.querySelector('.modal.active');
        if (activeModal && !e.target.matches('textarea')) {
            let btn = activeModal.querySelector('.btn-3d.success');
            if(btn) btn.click();
        }
    }
});

function downloadBackup() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    let dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `نسخة_احتياطية_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.json`);
    dlAnchorElem.click();
}
function restoreBackup(event) {
    let file = event.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedDB = JSON.parse(e.target.result);
            if(importedDB && importedDB.students) {
                db = importedDB;
                saveDB(); 
                customAlert('تم استعادة النسخة الاحتياطية بنجاح!', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                customAlert('ملف النسخة الاحتياطية غير صالح', 'error');
            }
        } catch(err) {
            customAlert('حدث خطأ أثناء قراءة الملف', 'error');
        }
    };
    reader.readAsText(file);
}

// ============ 4. الإعدادات ============
function addClass() { let n=document.getElementById('new-class-name').value; if(!n)return; db.classes.push({id:Date.now(), name:n, sections:[]}); saveDB(); document.getElementById('new-class-name').value=''; initApp(); }
function deleteClass(id) { customConfirm('تأكيد حذف الصف بكافة شعبه؟', r=>{ if(r){db.classes=db.classes.filter(c=>c.id!==id); saveDB(); initApp();}}); }
function addSection(id) { customPrompt("اكتب اسم الشعبة الجديدة:", n=>{ if(n){db.classes.find(c=>c.id===id).sections.push({id:Date.now(),name:n}); saveDB(); initApp();}});}
function deleteSection(cId, sId) { customConfirm('حذف الشعبة؟', r=>{ if(r){let c=db.classes.find(x=>x.id===cId); c.sections=c.sections.filter(x=>x.id!==sId); saveDB(); initApp();}}); }
function renderClasses() {
    document.getElementById('classes-list').innerHTML = db.classes.map(c => `<div class="list-item"><div class="flex-between w-100 mb-1"><strong>${c.name}</strong> <div><button type="button" class="btn-3d success btn-small m-0" onclick="addSection(${c.id})"><i class="fas fa-plus"></i> شعبة</button> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteClass(${c.id})"><i class="fas fa-trash"></i></button></div></div><div>${c.sections.map(s => `<span class="glass p-1" style="display:inline-block; margin:2px; cursor:pointer;" ondblclick="deleteSection(${c.id},${s.id})">${s.name} ✖</span>`).join('')}</div></div>`).join('');
}
function addRegion() {
    let n=document.getElementById('reg-name').value, d=document.getElementById('reg-driver').value, p=document.getElementById('reg-phone').value, c=document.getElementById('reg-code').value;
    if(!n||!c) return customAlert("الاسم والرمز مطلوبان", 'warning');
    if (p && !/^\d{10}$/.test(p)) return customAlert('رقم الهاتف يجب أن يتكون من 10 أرقام بالضبط', 'error');
    db.regions.push({id:Date.now(), name:n, driver:d, phone:p, code:c}); saveDB(); renderRegions(); ['reg-name','reg-driver','reg-phone','reg-code'].forEach(id=>document.getElementById(id).value='');
}
function deleteRegion(id) { customConfirm('تأكيد الحذف؟', r=>{ if(r){db.regions=db.regions.filter(x=>x.id!==id); saveDB(); renderRegions();} });}
function renderRegions() { document.getElementById('regions-list').innerHTML = db.regions.map(r => `<div class="list-item flex-between"><div><b>${r.name}</b> (الرمز: ${r.code})<br><small><i class="fas fa-bus"></i> السائق: ${r.driver} | ${r.phone}</small></div><button type="button" class="btn-3d danger btn-small m-0" onclick="deleteRegion(${r.id})"><i class="fas fa-trash"></i></button></div>`).join(''); }

function addSubject() {
    let n = document.getElementById('new-subject-name').value;
    if(!n) return;
    db.settings.subjects.push(n);
    saveDB();
    document.getElementById('new-subject-name').value = '';
    renderSubjects();
}
function deleteSubject(idx) {
    customConfirm('حذف هذه المادة من الإعدادات؟', r => {
        if(r) { db.settings.subjects.splice(idx, 1); saveDB(); renderSubjects(); }
    });
}
function renderSubjects() {
    document.getElementById('subjects-list').innerHTML = db.settings.subjects.map((sub, idx) => `<div class="list-item flex-between"><span><i class="fas fa-book-open text-primary"></i> ${sub}</span><button type="button" class="btn-3d danger btn-small m-0" onclick="deleteSubject(${idx})"><i class="fas fa-trash"></i></button></div>`).join('');
}

// ============ 5. بيانات الطلاب الأساسية ============
function populateClassSelects() { 
    let opts = '<option value="">اختر الصف</option>'+db.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); 
    ['std-class','sib-class','rep-class','prom-class','bulk-prom-from-class','bulk-prom-to-class'].forEach(id=>{ if(document.getElementById(id)) document.getElementById(id).innerHTML=opts; }); 
    
    let drvOpts = '<option value="">اختر خط النقل / السائق</option>'+db.regions.map(r=>`<option value="${r.code}">${r.name} - ${r.driver}</option>`).join('');
    let drvEl = document.getElementById('rep-driver');
    if(drvEl) drvEl.innerHTML = drvOpts;
}
function updateSectionDropdown() { updateDropdown('std-class', 'std-section'); } function updateSibSectionDropdown() { updateDropdown('sib-class', 'sib-section'); } function updateRepSectionDropdown() { updateDropdown('rep-class', 'rep-section'); generateReport(); }
function updateDropdown(cId, sId, sVal=null) { let v=document.getElementById(cId).value, sel=document.getElementById(sId); sel.innerHTML='<option value="">اختر الشعبة</option>'; let c=db.classes.find(x=>x.id==v); if(c){ sel.innerHTML+=c.sections.map(s=>`<option value="${s.id}">${s.name}</option>`).join(''); if(sVal) sel.value=sVal;} }
function checkRegionCode() { let reg=db.regions.find(r=>r.code===document.getElementById('std-reg-code').value); document.getElementById('std-reg-name').value=reg?reg.name:''; document.getElementById('std-driver-name').value=reg?reg.driver:''; }

function openAddStudentModal() { 
    editingStudentId=null; 
    tempSiblings=[]; 
    editingDirectSibMainId=null; 
    editingDirectSibIdx=null; 
    editingTempSibIdx=null; 
    renderTempSiblings(); 
    document.getElementById('std-modal-title').innerHTML='<i class="fas fa-user-plus"></i> إضافة طالب جديد'; 
    ['std-class','std-section','std-reg','std-name','std-phone','std-fee','std-reg-code','std-reg-name','std-driver-name','std-notes','std-social'].forEach(id=>document.getElementById(id).value=''); 
    showModal('add-student-modal'); 
}

function editStudent(id) { 
    editingStudentId=id; 
    editingDirectSibMainId=null; 
    editingDirectSibIdx=null; 
    editingTempSibIdx=null; 
    let s=db.students.find(x=>x.id===id); 
    document.getElementById('std-modal-title').innerHTML='<i class="fas fa-user-edit"></i> تعديل طالب'; 
    document.getElementById('std-class').value=s.classId; 
    updateDropdown('std-class','std-section',s.sectionId); 
    document.getElementById('std-reg').value=s.regId||''; 
    document.getElementById('std-name').value=s.name; 
    document.getElementById('std-phone').value=s.phone||''; 
    document.getElementById('std-notes').value=s.notes||''; 
    document.getElementById('std-social').value=s.socialStatus||''; 
    document.getElementById('std-fee').value=s.tuition; 
    document.getElementById('std-reg-code').value=s.regionCode||''; 
    checkRegionCode(); 
    tempSiblings=s.siblings?JSON.parse(JSON.stringify(s.siblings)):[]; 
    renderTempSiblings(); 
    showModal('add-student-modal'); 
}

function openAddSiblingModal() {
    editingDirectSibMainId = null;
    editingDirectSibIdx = null;
    editingTempSibIdx = null;
    ['sib-reg','sib-name','sib-class','sib-section','sib-fee'].forEach(id=>document.getElementById(id).value=''); 
    showModal('add-sibling-modal');
}

function editTempSibling(idx) {
    editingTempSibIdx = idx;
    editingDirectSibMainId = null;
    editingDirectSibIdx = null;
    let sib = tempSiblings[idx];
    document.getElementById('sib-reg').value = sib.regId || '';
    document.getElementById('sib-name').value = sib.name;
    document.getElementById('sib-class').value = sib.classId;
    updateDropdown('sib-class', 'sib-section', sib.sectionId);
    document.getElementById('sib-fee').value = sib.fee || '';
    showModal('add-sibling-modal');
}

function editSiblingDirect(mainId, sibIdx) {
    editingDirectSibMainId = mainId;
    editingDirectSibIdx = sibIdx;
    editingTempSibIdx = null;
    let s = db.students.find(x => x.id === mainId);
    let sib = s.siblings[sibIdx];
    document.getElementById('sib-reg').value = sib.regId || '';
    document.getElementById('sib-name').value = sib.name;
    document.getElementById('sib-class').value = sib.classId;
    updateDropdown('sib-class', 'sib-section', sib.sectionId);
    document.getElementById('sib-fee').value = sib.fee || '';
    showModal('add-sibling-modal');
}

function deleteSiblingDirect(mainId, sibIdx) {
    customConfirm("تأكيد حذف الأخ نهائياً من النظام؟", r => {
        if(r) {
            let s = db.students.find(x => x.id === mainId);
            s.siblings.splice(sibIdx, 1);
            saveDB();
            renderStudents();
            renderDual();
            if(typeof renderStatistics === 'function') renderStatistics();
        }
    });
}

function saveSiblingTemp() { 
    let n=document.getElementById('sib-name').value; 
    let reg=document.getElementById('sib-reg').value; 
    if(!n) return customAlert('اسم الأخ مطلوب', 'warning'); 
    
    let isDuplicate = db.students.some(x => (x.name === n || (reg && x.regId === reg)) && x.id !== editingDirectSibMainId);
    if(isDuplicate) return customAlert('اسم الطالب أو رقم القيد موجود مسبقاً!', 'error');

    let sibObj = {
        regId: reg, 
        name: n, 
        classId: document.getElementById('sib-class').value, 
        sectionId: document.getElementById('sib-section').value,
        fee: parseFloat(document.getElementById('sib-fee').value) || 0
    };

    if (editingDirectSibMainId !== null && editingDirectSibIdx !== null) {
        let s = db.students.find(x => x.id === editingDirectSibMainId);
        s.siblings[editingDirectSibIdx] = sibObj;
        saveDB();
        renderStudents();
        if(typeof renderStatistics === 'function') renderStatistics();
        hideModal('add-sibling-modal');
        if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم التعديل',showConfirmButton:false,timer:1500});
        editingDirectSibMainId = null;
        editingDirectSibIdx = null;
    } else if (editingTempSibIdx !== null) {
        tempSiblings[editingTempSibIdx] = sibObj;
        renderTempSiblings();
        hideModal('add-sibling-modal');
        editingTempSibIdx = null;
    } else {
        tempSiblings.push(sibObj); 
        renderTempSiblings(); 
        hideModal('add-sibling-modal'); 
    }
    ['sib-reg','sib-name','sib-class','sib-section','sib-fee'].forEach(id=>document.getElementById(id).value=''); 
}

function renderTempSiblings() { 
    document.getElementById('siblings-temp-list').innerHTML=tempSiblings.map((s,i)=>`<div class="list-item flex-between p-2"><span><i class="fas fa-child"></i> ${s.name} <small>(${s.fee.toLocaleString()})</small></span> <div class="flex-row"><button type="button" class="btn-3d warning btn-small m-0" onclick="editTempSibling(${i})"><i class="fas fa-pen"></i></button><button type="button" class="btn-3d danger btn-small m-0" onclick="tempSiblings.splice(${i},1); renderTempSiblings()"><i class="fas fa-trash"></i></button></div></div>`).join(''); 
}

function saveStudent() {
    let n=document.getElementById('std-name').value; if(!n) return customAlert('الاسم الثلاثي للطالب مطلوب','error');
    let ph=document.getElementById('std-phone').value;
    let reg=document.getElementById('std-reg').value;
    
    if(ph && !/^\d{10}$/.test(ph)) return customAlert('رقم الموبايل يجب أن يتكون من 10 أرقام بالضبط', 'error');
    let isDuplicate = db.students.some(x => (x.name === n || (reg && x.regId === reg)) && x.id !== editingStudentId);
    if(isDuplicate) return customAlert('اسم الطالب أو رقم القيد مسجل مسبقاً!', 'error');

    let d = { classId:document.getElementById('std-class').value, sectionId:document.getElementById('std-section').value, regId:reg, name:n, phone:ph, notes:document.getElementById('std-notes').value, socialStatus:document.getElementById('std-social').value, tuition:parseFloat(document.getElementById('std-fee').value)||0, regionCode:document.getElementById('std-reg-code').value, siblings:[...tempSiblings] };
    if(editingStudentId){ let idx=db.students.findIndex(x=>x.id===editingStudentId); d.id=db.students[idx].id; d.payments=db.students[idx].payments; d.grades=db.students[idx].grades; db.students[idx]=d; if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم التعديل',showConfirmButton:false,timer:1500}); } 
    else { d.id=Date.now(); d.payments=[]; d.grades={}; db.students.push(d); if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم الإضافة',showConfirmButton:false,timer:1500}); }
    saveDB(); hideModal('add-student-modal'); renderStudents(); renderDual(); if(typeof renderStatistics === 'function') renderStatistics();
}

function searchStudent() { renderStudents(document.getElementById('search-student').value); }

function renderStudents(filter="") {
    let html='';
    db.students.forEach(s=>{
        let matchM=s.name.includes(filter) || (s.regId && s.regId.includes(filter)); let matchS=(s.siblings||[]).find(sib=>sib.name.includes(filter));
        if(matchM || (filter!=="" && matchS)) {
            let cls=db.classes.find(c=>c.id==s.classId), paid=s.payments.reduce((sum,p)=>sum+p.amount,0);
            let totTuition = s.tuition + (s.siblings||[]).reduce((a,b)=>a+(b.fee||0),0);
            html+=`<div class="list-item flex-between" style="cursor:pointer;" onclick="openProfile(${s.id})"><div><strong><i class="fas fa-user-graduate text-primary"></i> ${s.name}</strong><br><small>الصف: ${cls?cls.name:'-'} | ذمة: <span style="color:#e74c3c">${(totTuition-paid).toLocaleString()}</span></small></div><div class="flex-row"><button type="button" class="btn-3d btn-small m-0" style="background:#a777e3; color:white;" onclick="event.stopPropagation(); openProfile(${s.id})"><i class="fas fa-folder-open"></i> الحساب</button><button type="button" class="btn-3d warning btn-small m-0" onclick="event.stopPropagation(); editStudent(${s.id})"><i class="fas fa-pen"></i></button><button type="button" class="btn-3d danger btn-small m-0" onclick="event.stopPropagation(); deleteStudent(${s.id})"><i class="fas fa-trash"></i></button></div></div>`;
        }
        if(filter==="" || matchM || matchS){
            (s.siblings||[]).forEach((sib, sibIdx)=>{
                if(filter==="" || sib.name.includes(filter) || matchM){
                    let sc=db.classes.find(c=>c.id==sib.classId);
                    let sSec=sc?sc.sections.find(x=>x.id==sib.sectionId):null;
                    html+=`<div class="list-item flex-between" style="cursor:pointer; background:rgba(0,0,0,0.05); border-right:4px solid #a777e3;" onclick="openProfile(${s.id})"><div><strong><i class="fas fa-child"></i> ${sib.name}</strong> <small style="color:#a777e3;">(أخو ${s.name})</small><br><small>الصف: ${sc?sc.name:'-'} | الشعبة: ${sSec?sSec.name:'-'}</small></div><div class="flex-row"><button type="button" class="btn-3d warning btn-small m-0" onclick="event.stopPropagation(); editSiblingDirect(${s.id}, ${sibIdx})"><i class="fas fa-pen"></i></button><button type="button" class="btn-3d danger btn-small m-0" onclick="event.stopPropagation(); deleteSiblingDirect(${s.id}, ${sibIdx})"><i class="fas fa-trash"></i></button></div></div>`;
                }
            });
        }
    }); document.getElementById('students-list').innerHTML=html || '<div class="text-center mt-3">لا يوجد طلاب</div>';
}

function deleteStudent(id) { 
    customConfirm("نقل الطالب إلى سلة المحذوفات؟", r=>{ 
        if(r){
            let s = db.students.find(x=>x.id===id);
            s.deletedAt = Date.now();
            if(!db.recycleBin) db.recycleBin = [];
            db.recycleBin.push(s);
            db.students = db.students.filter(x=>x.id!==id); 
            saveDB(); renderStudents(); renderDual(); if(typeof renderStatistics === 'function') renderStatistics();
        } 
    }); 
}

function renderRecycleBin() {
    if(!db.recycleBin) db.recycleBin = [];
    document.getElementById('recycle-bin-list').innerHTML = db.recycleBin.map((s, i) => `
        <div class="list-item flex-between">
            <div><strong>${s.name}</strong><br><small>تاريخ الحذف: ${new Date(s.deletedAt).toLocaleDateString('en-GB')}</small></div>
            <div class="flex-row">
                <button class="btn-3d success btn-small m-0" onclick="restoreStudent(${i})"><i class="fas fa-undo"></i> استرجاع</button>
                <button class="btn-3d danger btn-small m-0" onclick="hardDeleteStudent(${i})"><i class="fas fa-trash"></i> نهائي</button>
            </div>
        </div>
    `).join('') || '<div class="text-center mt-3">السلة فارغة</div>';
}
function restoreStudent(idx) {
    db.students.push(db.recycleBin[idx]);
    db.recycleBin.splice(idx, 1);
    saveDB(); renderRecycleBin(); renderStudents(); renderDual();
}
function hardDeleteStudent(idx) {
    customConfirm("تأكيد الحذف النهائي؟ لا يمكن التراجع", r => {
        if(r) { db.recycleBin.splice(idx, 1); saveDB(); renderRecycleBin(); }
    });
}
function emptyRecycleBin() {
    customConfirm("هل أنت متأكد من إفراغ السلة بالكامل نهائياً؟", r => {
        if(r) { db.recycleBin = []; saveDB(); renderRecycleBin(); }
    });
}
function restoreAllRecycleBin() {
    if(!db.recycleBin || db.recycleBin.length === 0) return;
    customConfirm("استرجاع كافة الطلاب المحذوفين للنظام؟", r => {
        if(r) { 
            db.students.push(...db.recycleBin); 
            db.recycleBin = []; 
            saveDB(); renderRecycleBin(); renderStudents(); renderDual(); 
        }
    });
}

// ============ 6. ملف الطالب المالي والدرجات ============
function openProfile(id) {
    currentStudentId=id; let s=db.students.find(x=>x.id===id); let c=db.classes.find(x=>x.id==s.classId), sec=c?c.sections.find(x=>x.id==s.sectionId):null;
    document.getElementById('prof-name').innerText=s.name; document.getElementById('prof-details').innerText=`الصف: ${c?c.name:'-'} | الشعبة: ${sec?sec.name:'-'} | موبايل: ${s.phone||'-'}`; 
    document.getElementById('prof-reg').innerText=s.regId||'-';
    document.getElementById('prof-notes').innerText = s.notes ? 'ملاحظات: ' + s.notes : '';
    updateFinance(s); showModal('student-profile-modal');
}
function updateFinance(s) {
    let totTuition = s.tuition + (s.siblings||[]).reduce((a,b)=>a+(b.fee||0),0);
    let paid=s.payments.reduce((sum,p)=>sum+p.amount,0); document.getElementById('prof-total').innerText=totTuition.toLocaleString(); document.getElementById('prof-paid').innerText=paid.toLocaleString(); document.getElementById('prof-rem').innerText=(totTuition-paid).toLocaleString();
    document.getElementById('payments-history').innerHTML=s.payments.map((p,i)=>`<div class="list-item flex-between p-2"><span>${p.amount.toLocaleString()} د.ع | ${p.date} ${p.receiptNo ? `<br><small style="color:#a777e3">(رقم الوصل: ${p.receiptNo})</small>` : ''}</span> <button type="button" class="btn-3d danger btn-small m-0" onclick="delPayment(${i})"><i class="fas fa-trash"></i></button></div>`).join('');
}
function submitPayment() { 
    let amt=parseFloat(document.getElementById('pay-amount').value), dt=document.getElementById('pay-date').value; 
    if(amt>0 && dt){ 
        if(!db.settings.receiptCounter) db.settings.receiptCounter = 1000;
        let currentRecNo = db.settings.receiptCounter++;
        
        let s=db.students.find(x=>x.id===currentStudentId); 
        s.payments.push({amount:amt, date:dt, receiptNo: currentRecNo}); 
        saveDB(); document.getElementById('pay-amount').value=''; updateFinance(s); renderDual(); renderDaily(); 
        hideModal('payment-modal');
        if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم تسديد الدفعة', showConfirmButton:false, timer:1500}); 
        setTimeout(() => printReceipt(), 500);
    } else { customAlert("يرجى إدخال المبلغ والتاريخ بشكل صحيح", "error"); }
}
function delPayment(i) { customConfirm('حذف الدفعة المحددة؟', r=>{ if(r){let s=db.students.find(x=>x.id===currentStudentId); s.payments.splice(i,1); saveDB(); updateFinance(s); renderDual(); renderDaily();} }); }

// ============ نظام التصحيح التلقائي للصفوف (Auto-Heal) ============
function syncClassToTarget(targetDb, classId, sectionId) {
    let result = { classId: classId, sectionId: sectionId };
    let srcClass = db.classes.find(c => c.id == classId);
    if (!srcClass) return result;

    if(!targetDb.classes) targetDb.classes = [];
    
    let tgtClass = targetDb.classes.find(c => c.id == classId);
    if (!tgtClass) {
        tgtClass = targetDb.classes.find(c => c.name.trim() === srcClass.name.trim());
        if (tgtClass) {
            result.classId = tgtClass.id; 
        } else {
            tgtClass = { id: srcClass.id, name: srcClass.name, sections: [] };
            targetDb.classes.push(tgtClass);
            result.classId = tgtClass.id;
        }
    } else {
        result.classId = tgtClass.id;
    }

    let srcSec = srcClass.sections.find(s => s.id == sectionId);
    if (srcSec) {
        let tgtSec = tgtClass.sections.find(s => s.id == sectionId);
        if (!tgtSec) {
            tgtSec = tgtClass.sections.find(s => s.name.trim() === srcSec.name.trim());
            if (tgtSec) {
                result.sectionId = tgtSec.id;
            } else {
                tgtSec = { id: srcSec.id, name: srcSec.name };
                tgtClass.sections.push(tgtSec);
                result.sectionId = tgtSec.id;
            }
        } else {
            result.sectionId = tgtSec.id;
        }
    }
    
    return result;
}

function openPromoteModal() {
    let s = db.students.find(x => x.id === currentStudentId);
    document.getElementById('prom-target-year').value = '';
    document.getElementById('prom-class').value = s.classId;
    updateDropdown('prom-class', 'prom-section', s.sectionId);
    document.getElementById('prom-fee').value = s.tuition;
    showModal('promote-modal');
}

async function submitPromote() {
    try {
        let s = db.students.find(x => x.id === currentStudentId);
        let targetYear = document.getElementById('prom-target-year').value;
        let newClass = document.getElementById('prom-class').value;
        let newSec = document.getElementById('prom-section').value;
        let newFee = parseFloat(document.getElementById('prom-fee').value) || 0;

        if (!targetYear) return customAlert("يرجى اختيار سنة دراسية للترحيل إليها", "error");
        if (!newClass || !newSec || newFee <= 0) return customAlert("يرجى تحديد الصف والشعبة والقسط الجديد", "error");

        customConfirm(`هل أنت متأكد من ترحيل الطالب إلى سنة (${targetYear})؟`, async r => {
            if (r) {
                let btn = document.querySelector('#promote-modal .btn-3d.success');
                let originalText = btn ? btn.innerHTML : '';
                if(btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الترحيل...'; btn.disabled = true; }

                try {
                    let targetDb = await getTargetYearDB(targetYear);
                    if(!targetDb) {
                        if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                        return customAlert('حدث خطأ! تأكد من إنشاء السنة المستهدفة من الإعدادات.', 'error');
                    }
                    if(!targetDb.students) targetDb.students = [];

                    let targetStudent = targetDb.students.find(x => x.id === s.id);
                    
                    if (!targetStudent) {
                        targetStudent = JSON.parse(JSON.stringify(s));
                        targetStudent.payments = [];
                        targetStudent.grades = {};
                        targetStudent.classId = ''; 
                        targetStudent.sectionId = ''; 
                        targetStudent.tuition = 0;
                        if(targetStudent.siblings) {
                            targetStudent.siblings.forEach(sib => { sib.classId = ''; sib.sectionId = ''; sib.fee = 0; });
                        }
                        targetDb.students.push(targetStudent);
                        
                        if(!s.notes) s.notes = '';
                        if(!s.notes.includes(`مرحل لـ`)) s.notes = `(مُرحل لـ ${targetYear}) ` + s.notes;
                    }
                    
                    let mapped = syncClassToTarget(targetDb, newClass, newSec);
                    targetStudent.classId = mapped.classId;
                    targetStudent.sectionId = mapped.sectionId;
                    targetStudent.tuition = newFee;

                    await saveTargetYearDB(targetYear, targetDb);
                    saveDB();

                    if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                    hideModal('promote-modal');
                    openProfile(s.id); 
                    renderStudents();
                    renderDual();
                    if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم ترحيل الطالب بنجاح', showConfirmButton:false, timer:2000});
                } catch(err) {
                    console.error(err);
                    if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                    customAlert('حدث خطأ أثناء المعالجة: ' + err.message, 'error');
                }
            }
        });
    } catch(e) {
        console.error(e);
        customAlert('خطأ غير متوقع: ' + e.message, 'error');
    }
}

function bulkPromote() {
    populateClassSelects();
    renderYearsDropdown(); 
    showModal('bulk-promote-modal');
}

// دالة الترحيل الجماعي الذكية 
async function submitBulkPromote() {
    try {
        let targetYear = document.getElementById('bulk-prom-target-year').value;
        let fromClass = document.getElementById('bulk-prom-from-class').value;
        let fromSec = document.getElementById('bulk-prom-from-section').value;
        let toClass = document.getElementById('bulk-prom-to-class').value;
        let toSec = document.getElementById('bulk-prom-to-section').value;
        let newFee = parseFloat(document.getElementById('bulk-prom-fee').value) || 0;

        if(!targetYear) return customAlert("اختر السنة المستهدفة أولاً!", "warning");
        if(!fromClass || !fromSec || !toClass || !toSec) return customAlert("الرجاء تحديد جميع الصفوف والشعب بدقة!", "warning");
        if(newFee <= 0) return customAlert("أدخل القسط الكلي الجديد بشكل صحيح!", "warning");

        customConfirm(`هل أنت متأكد من ترحيل جميع طلاب هذه الشعبة (أساسيين وإخوة) إلى سنة (${targetYear})؟`, async r => {
            if(r) {
                let btn = document.querySelector('#bulk-promote-modal .btn-3d.success');
                let originalText = btn ? btn.innerHTML : '';
                if(btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الترحيل...'; btn.disabled = true; }

                try {
                    let targetDb = await getTargetYearDB(targetYear);
                    if(!targetDb) {
                        if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                        return customAlert('خطأ: لم يتم العثور على قاعدة بيانات السنة المستهدفة، تأكد من إنشائها.', 'error');
                    }
                    
                    if(!targetDb.students) targetDb.students = [];

                    // نظام Auto-Heal المخفي: تأكد من وجود الصف بالعام الجديد أو قم بإنشائه
                    let mapped = syncClassToTarget(targetDb, toClass, toSec);
                    let finalToClass = mapped.classId;
                    let finalToSec = mapped.sectionId;

                    let count = 0;
                    
                    // رادار ذكي يمسح جميع الطلاب الأساسيين والتابعين
                    db.students.forEach(s => {
                        let isMainMatch = (s.classId == fromClass && s.sectionId == fromSec);
                        let matchingSiblings = (s.siblings || []).filter(sib => sib.classId == fromClass && sib.sectionId == fromSec);
                        
                        if (isMainMatch || matchingSiblings.length > 0) {
                            let targetStudent = targetDb.students.find(x => x.id === s.id);
                            
                            // إذا كانت العائلة غير موجودة في السنة الجديدة، ننسخها ونصيّر كل البيانات
                            if (!targetStudent) {
                                targetStudent = JSON.parse(JSON.stringify(s));
                                targetStudent.payments = [];
                                targetStudent.grades = {};
                                targetStudent.classId = ''; 
                                targetStudent.sectionId = ''; 
                                targetStudent.tuition = 0;
                                if(targetStudent.siblings) {
                                    targetStudent.siblings.forEach(sib => { sib.classId = ''; sib.sectionId = ''; sib.fee = 0; });
                                }
                                targetDb.students.push(targetStudent);
                                
                                if(!s.notes) s.notes = '';
                                if(!s.notes.includes(`مرحل لـ`)) s.notes = `(مُرحل لـ ${targetYear}) ` + s.notes;
                            }
                            
                            // تحديث الأساسي بالـ ID المصحح
                            if (isMainMatch) {
                                targetStudent.classId = finalToClass;
                                targetStudent.sectionId = finalToSec;
                                targetStudent.tuition = newFee;
                                count++;
                            }
                            
                            // تحديث الأخ التابع بالـ ID المصحح
                            matchingSiblings.forEach(matchedSib => {
                                let targetSib = targetStudent.siblings.find(x => x.name === matchedSib.name);
                                if(targetSib) {
                                    targetSib.classId = finalToClass;
                                    targetSib.sectionId = finalToSec;
                                    targetSib.fee = newFee;
                                    count++;
                                }
                            });
                        }
                    });

                    if(count === 0) {
                        if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                        return customAlert("لا يوجد أي طالب (أساسي أو أخ) مسجل في هذه الشعبة!", "info");
                    }

                    await saveTargetYearDB(targetYear, targetDb);
                    saveDB(); 

                    if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                    hideModal('bulk-promote-modal');
                    renderStudents();
                    
                    if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:`تم ترحيل ${count} طلاب/إخوة بنجاح!`, showConfirmButton:false, timer:3000});
                } catch(innerErr) {
                    console.error("Bulk Promote Inner Error: ", innerErr);
                    if(btn) { btn.innerHTML = originalText; btn.disabled = false; }
                    customAlert('حدث خطأ أثناء نسخ الطلاب: ' + innerErr.message, 'error');
                }
            }
        });
    } catch(e) {
        console.error("Bulk Promote Outer Error: ", e);
        customAlert('حدث خطأ غير متوقع: ' + e.message, 'error');
    }
}

function openGrades() {
    let s=db.students.find(x=>x.id===currentStudentId); if(!s.grades)s.grades={}; if(!s.grades.subNames)s.grades.subNames=[...db.settings.subjects];
    let subCount = db.settings.subjects.length;
    let html=`<table class="grades-tbl"><thead><tr class="bg-light"><th rowspan="2" class="bg-blue">المادة</th><th colspan="3">الفصل الأول</th><th rowspan="2" class="bg-yellow">معدل ف1</th><th rowspan="2">نصف السنة</th><th colspan="3">الفصل الثاني</th><th rowspan="2" class="bg-yellow">معدل ف2</th><th rowspan="2" class="bg-yellow">السعي السنوي</th><th rowspan="2">الامتحان النهائي</th><th rowspan="2" class="bg-yellow">الدرجة النهائية</th></tr><tr class="bg-light"><th>ش1</th><th>ش2</th><th>ش3</th><th>ش1</th><th>ش2</th><th>ش3</th></tr></thead><tbody>`;
    for(let i=0; i<subCount; i++){ 
        let g=s.grades[i]||{}; 
        let currentSubName = s.grades.subNames[i] || db.settings.subjects[i] || '';
        html+=`<tr><td><input type="text" id="g_sub_${i}" value="${currentSubName}" class="sub-name" oninput="calcCols()"></td><td><input type="number" id="g_${i}_m11" value="${g.m11||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m12" value="${g.m12||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m13" value="${g.m13||''}" oninput="calcRow(${i});calcCols();"></td><td class="bg-yellow"><input type="number" id="g_${i}_avg1" value="${g.avg1||''}" readonly></td><td><input type="number" id="g_${i}_mid" value="${g.mid||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m21" value="${g.m21||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m22" value="${g.m22||''}" oninput="calcRow(${i});calcCols();"></td><td><input type="number" id="g_${i}_m23" value="${g.m23||''}" oninput="calcRow(${i});calcCols();"></td><td class="bg-yellow"><input type="number" id="g_${i}_avg2" value="${g.avg2||''}" readonly></td><td class="bg-yellow"><input type="number" id="g_${i}_year" value="${g.year||''}" readonly></td><td><input type="number" id="g_${i}_final" value="${g.final||''}" oninput="calcRow(${i});calcCols();"></td><td class="bg-yellow"><input type="number" id="g_${i}_tot" value="${g.tot||''}" readonly></td></tr>`; 
    }
    html+=`<tr class="bg-light"><td class="bg-yellow">المجموع</td><td class="bg-yellow"><input type="number" id="g_tot_m11" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m12" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m13" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_avg1" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_mid" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m21" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m22" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_m23" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_avg2" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_year" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_final" readonly></td><td class="bg-yellow"><input type="number" id="g_tot_tot" readonly></td></tr><tr class="bg-light"><td class="bg-yellow">المعدل</td><td class="bg-yellow"><input type="number" id="g_avg_m11" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m12" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m13" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_avg1" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_mid" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m21" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m22" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_m23" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_avg2" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_year" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_final" readonly></td><td class="bg-yellow"><input type="number" id="g_avg_tot" readonly></td></tr><tr><td>النتيجة</td><td colspan="12"><input type="text" id="g_footer" value="${s.grades['footer']||''}" style="width:100%; text-align:right;" placeholder="اكتب النتيجة هنا..."></td></tr></tbody></table>`;
    document.getElementById('grades-table-container').innerHTML=html; for(let i=0;i<subCount;i++)calcRow(i); calcCols(); showModal('grades-modal');
}
function calcRow(i) { let get=id=>{let v=parseFloat(document.getElementById(id).value); return isNaN(v)?null:v;}; let set=(id,v)=>{document.getElementById(id).value=(v!==null)?Math.round(v):'';}; let avg=arr=>{let f=arr.filter(x=>x!==null); return f.length?f.reduce((a,b)=>a+b)/f.length:null;}; let a1=avg([get(`g_${i}_m11`),get(`g_${i}_m12`),get(`g_${i}_m13`)]); set(`g_${i}_avg1`,a1); let a2=avg([get(`g_${i}_m21`),get(`g_${i}_m22`),get(`g_${i}_m23`)]); set(`g_${i}_avg2`,a2); let yr=avg([a1,get(`g_${i}_mid`),a2]); set(`g_${i}_year`,yr); let fn=get(`g_${i}_final`), tot=(yr!==null&&fn!==null)?(yr+fn)/2:null; set(`g_${i}_tot`,tot); }
function calcCols() { let cols=['m11','m12','m13','avg1','mid','m21','m22','m23','avg2','year','final','tot']; let subCount=db.settings.subjects.length; let vC=Array.from({length:subCount}).filter((_,i)=>document.getElementById(`g_sub_${i}`).value.trim()!=='').length||1; cols.forEach(c=>{ let sum=0, cnt=0; for(let i=0;i<subCount;i++){let v=parseFloat(document.getElementById(`g_${i}_${c}`).value); if(!isNaN(v)){sum+=v;cnt++;}} document.getElementById(`g_tot_${c}`).value=cnt>0?Math.round(sum):''; document.getElementById(`g_avg_${c}`).value=cnt>0?(sum/vC).toFixed(1).replace(/\.0$/,''):''; }); }
function saveGrades() { let s=db.students.find(x=>x.id===currentStudentId); s.grades.subNames=[]; let subCount=db.settings.subjects.length; for(let i=0;i<subCount;i++){ s.grades.subNames.push(document.getElementById(`g_sub_${i}`).value); s.grades[i]={m11:document.getElementById(`g_${i}_m11`).value, m12:document.getElementById(`g_${i}_m12`).value, m13:document.getElementById(`g_${i}_m13`).value, avg1:document.getElementById(`g_${i}_avg1`).value, mid:document.getElementById(`g_${i}_mid`).value, m21:document.getElementById(`g_${i}_m21`).value, m22:document.getElementById(`g_${i}_m22`).value, m23:document.getElementById(`g_${i}_m23`).value, avg2:document.getElementById(`g_${i}_avg2`).value, year:document.getElementById(`g_${i}_year`).value, final:document.getElementById(`g_${i}_final`).value, tot:document.getElementById(`g_${i}_tot`).value}; } s.grades['footer']=document.getElementById('g_footer').value; saveDB(); if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'تم حفظ الدرجات',showConfirmButton:false,timer:1500}); }

// ============ 7. الرواتب والموظفين ============
function openAddStaffModal() { editingStaffId=null; document.getElementById('staff-modal-title').innerHTML='<i class="fas fa-user-plus"></i> إضافة موظف'; ['staff-name','staff-role','staff-salary'].forEach(id=>document.getElementById(id).value=''); showModal('add-staff-modal'); }
function saveStaff() { let n=document.getElementById('staff-name').value, r=document.getElementById('staff-role').value, s=parseFloat(document.getElementById('staff-salary').value)||0; if(!n||s<=0) return customAlert('يرجى إدخال الاسم والراتب بشكل صحيح', 'error'); if(editingStaffId){ let idx=db.staff.findIndex(x=>x.id===editingStaffId); db.staff[idx].name=n; db.staff[idx].role=r; db.staff[idx].salary=s; } else { db.staff.push({ id:Date.now(), name:n, role:r, salary:s, isTeacher:false, payments:[] }); } saveDB(); hideModal('add-staff-modal'); renderStaff(); renderDual(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم الحفظ', showConfirmButton:false, timer:1500}); }
function editStaff(id) { editingStaffId=id; let s=db.staff.find(x=>x.id===id); document.getElementById('staff-modal-title').innerHTML='<i class="fas fa-edit"></i> تعديل موظف'; document.getElementById('staff-name').value=s.name; document.getElementById('staff-role').value=s.role; document.getElementById('staff-salary').value=s.salary; showModal('add-staff-modal'); }

function openAddTeacherModal() { editingStaffId=null; document.getElementById('teacher-modal-title').innerHTML='<i class="fas fa-chalkboard-teacher"></i> إضافة مدرس'; ['teacher-name','teacher-role','teacher-year'].forEach(id=>document.getElementById(id).value=''); showModal('add-teacher-modal'); }
function saveTeacher() { let n=document.getElementById('teacher-name').value, r=document.getElementById('teacher-role').value, y=parseInt(document.getElementById('teacher-year').value)||new Date().getFullYear(); if(!n) return customAlert('الاسم مطلوب', 'error'); if(editingStaffId){ let idx=db.staff.findIndex(x=>x.id===editingStaffId); db.staff[idx].name=n; db.staff[idx].role=r; db.staff[idx].hiringYear=y; } else { db.staff.push({ id:Date.now(), name:n, role:r, hiringYear:y, salary:0, isTeacher:true, payments:[] }); } saveDB(); hideModal('add-teacher-modal'); renderStaff(); renderDual(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم حفظ المدرس', showConfirmButton:false, timer:1500}); }
function editTeacher(id) { editingStaffId=id; let s=db.staff.find(x=>x.id===id); document.getElementById('teacher-modal-title').innerHTML='<i class="fas fa-edit"></i> تعديل مدرس'; document.getElementById('teacher-name').value=s.name; document.getElementById('teacher-role').value=s.role; document.getElementById('teacher-year').value=s.hiringYear; showModal('add-teacher-modal'); }

function deleteStaff(id) { customConfirm("تأكيد حذف الموظف/المدرس وكل سجلات مدفوعاته؟", r=>{ if(r){db.staff=db.staff.filter(x=>x.id!==id); saveDB(); renderStaff(); renderDual(); renderDaily();} }); }

function payStaff(id) { customPrompt("المبلغ المراد صرفه للإداري (د.ع):", amt=>{ let v=parseFloat(amt); if(v>0){ db.staff.find(x=>x.id===id).payments.push({amount:v, date:todayISO}); saveDB(); renderStaff(); renderDual(); renderDaily(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم صرف المبلغ بنجاح', showConfirmButton:false, timer:1500}); } }); }

function payTeacher(id) {
    currentTeacherId = id;
    ['teach-pay-lecs','teach-pay-stds','teach-pay-eval','teach-pay-bonus','teach-pay-deduct'].forEach(el=>document.getElementById(el).value='');
    document.getElementById('teach-pay-date').value = todayISO;
    calcTeacherSalary();
    showModal('pay-teacher-modal');
}

function calcTeacherSalary() {
    if(!currentTeacherId) return;
    let st = db.staff.find(x => x.id === currentTeacherId);
    let curYear = new Date().getFullYear();
    let serviceYears = Math.max(0, curYear - (st.hiringYear || curYear));
    let lecPrice = Math.min(1500 + (serviceYears * 250), 4000);
    
    document.getElementById('teach-pay-years').innerText = serviceYears;
    document.getElementById('teach-pay-price').innerText = lecPrice.toLocaleString();
    
    let wLecs = parseFloat(document.getElementById('teach-pay-lecs').value) || 0;
    let sAvg = parseFloat(document.getElementById('teach-pay-stds').value) || 0;
    let evalPts = parseFloat(document.getElementById('teach-pay-eval').value) || 0;
    let bonus = parseFloat(document.getElementById('teach-pay-bonus').value) || 0;
    let deduct = parseFloat(document.getElementById('teach-pay-deduct').value) || 0;
    
    let base = lecPrice * (wLecs * 4);
    let stdBonus = sAvg * 500;
    let evalBonus = evalPts * 1000;
    let net = base + stdBonus + evalBonus + bonus - deduct;
    
    document.getElementById('teach-pay-net').innerText = net.toLocaleString();
    return net;
}

function submitTeacherPayment() {
    let net = calcTeacherSalary();
    let dt = document.getElementById('teach-pay-date').value;
    if(net > 0 && dt) {
        db.staff.find(x => x.id === currentTeacherId).payments.push({amount: net, date: dt});
        saveDB(); hideModal('pay-teacher-modal'); renderStaff(); renderDual(); renderDaily();
        if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم صرف راتب المدرس بنجاح', showConfirmButton:false, timer:1500});
    } else { customAlert("الصافي يجب أن يكون أكبر من صفر والتاريخ مطلوب", "error"); }
}

function renderStaff() { 
    document.getElementById('staff-list').innerHTML = db.staff.map(st => { 
        let paid = st.payments.reduce((s,p)=>s+p.amount,0); 
        if(st.isTeacher) {
            return `<div class="list-item flex-between" style="border-right: 4px solid #f39c12;"><div><strong><i class="fas fa-chalkboard-teacher text-warning"></i> ${st.name}</strong> <small>(${st.role})</small><br><small>التعيين: ${st.hiringYear} | المصروف: <span style="color:#2ecc71">${paid.toLocaleString()}</span></small></div><div class="flex-row"><button type="button" class="btn-3d warning btn-small m-0" onclick="payTeacher(${st.id})"><i class="fas fa-calculator"></i> راتب تفاعلي</button> <button type="button" class="btn-3d btn-small m-0" style="background:#a777e3;" onclick="editTeacher(${st.id})"><i class="fas fa-pen"></i></button> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteStaff(${st.id})"><i class="fas fa-trash"></i></button></div></div>`;
        } else {
            return `<div class="list-item flex-between" style="border-right: 4px solid #3498db;"><div><strong><i class="fas fa-user-tie text-primary"></i> ${st.name}</strong> <small>(${st.role})</small><br><small>الراتب المقطوع: ${st.salary.toLocaleString()} | المصروف: <span style="color:#2ecc71">${paid.toLocaleString()}</span> | الباقي: <span style="color:#e74c3c">${(st.salary-paid).toLocaleString()}</span></small></div><div class="flex-row"><button type="button" class="btn-3d success btn-small m-0" onclick="payStaff(${st.id})"><i class="fas fa-hand-holding-usd"></i> صرف</button> <button type="button" class="btn-3d warning btn-small m-0" onclick="editStaff(${st.id})"><i class="fas fa-pen"></i></button> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteStaff(${st.id})"><i class="fas fa-trash"></i></button></div></div>`; 
        }
    }).join('') || '<div class="text-center mt-3">لا توجد بيانات</div>'; 
}

// ============ 8. المصروفات التشغيلية ============
function openAddExpenseModal() { document.getElementById('exp-desc').value=''; document.getElementById('exp-amount').value=''; document.getElementById('exp-date').value = todayISO; showModal('add-expense-modal'); }
function saveExpense() { let d=document.getElementById('exp-desc').value, a=parseFloat(document.getElementById('exp-amount').value)||0, dt=document.getElementById('exp-date').value; if(!d||a<=0) return customAlert('البيان والمبلغ مطلوبان', 'error'); db.expenses.push({id:Date.now(), desc:d, amount:a, date:dt}); saveDB(); hideModal('add-expense-modal'); renderExpenses(); renderDual(); renderDaily(); if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'success', title:'تم حفظ المصروف', showConfirmButton:false, timer:1500}); }
function deleteExpense(id) { customConfirm("حذف هذا المصروف؟", r=>{ if(r){db.expenses=db.expenses.filter(x=>x.id!==id); saveDB(); renderExpenses(); renderDual(); renderDaily();} }); }
function renderExpenses() { document.getElementById('expenses-list').innerHTML = db.expenses.map(e => `<div class="list-item flex-between"><div><strong><i class="fas fa-minus-circle text-danger"></i> ${e.desc}</strong><br><small><i class="far fa-calendar"></i> ${e.date}</small></div><div class="flex-row"><b style="color:#e74c3c; font-size:16px;">${e.amount.toLocaleString()}</b> <button type="button" class="btn-3d danger btn-small m-0" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></div></div>`).join(''); }

// ============ 9. الخلاصة اليومية والمركز المالي ============
function renderDaily() {
    let dVal = document.getElementById('daily-date-filter').value;
    let parts = dVal.split('-'); let dStrGB = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ''; 
    let tIn=0, tOut=0, details='';
    
    db.students.forEach(s => s.payments.forEach(p => { if(p.date===dVal || p.date===dStrGB) { tIn+=p.amount; details+=`<div class="list-item flex-between p-2"><span style="color:#2ecc71"><i class="fas fa-arrow-up"></i> قسط مستلم (${s.name})</span><b>${p.amount.toLocaleString()}</b></div>`; } }));
    db.staff.forEach(st => st.payments.forEach(p => { if(p.date===dVal || p.date===dStrGB) { tOut+=p.amount; details+=`<div class="list-item flex-between p-2"><span style="color:#e74c3c"><i class="fas fa-arrow-down"></i> راتب مصروف (${st.name})</span><b>${p.amount.toLocaleString()}</b></div>`; } }));
    db.expenses.forEach(e => { if(e.date===dVal || e.date===dStrGB) { tOut+=e.amount; details+=`<div class="list-item flex-between p-2"><span style="color:#e74c3c"><i class="fas fa-arrow-down"></i> نفقات (${e.desc})</span><b>${e.amount.toLocaleString()}</b></div>`; } });
    
    document.getElementById('daily-in').innerText = tIn.toLocaleString(); document.getElementById('daily-out').innerText = tOut.toLocaleString(); document.getElementById('daily-net').innerText = (tIn-tOut).toLocaleString();
    document.getElementById('daily-details').innerHTML = details || '<div class="text-center p-2" style="opacity:0.6;">لا توجد حركات مالية في هذا التاريخ</div>';
}

function renderDual() {
    let exp=0, col=0, sal=0, exs=0;
    db.students.forEach(s => { 
        let totTuition = s.tuition + (s.siblings||[]).reduce((a,b)=>a+(b.fee||0),0);
        exp+=totTuition; col+=s.payments.reduce((a,b)=>a+b.amount, 0); 
    });
    db.staff.forEach(st => sal+=st.payments.reduce((a,b)=>a+b.amount, 0));
    db.expenses.forEach(e => exs+=e.amount);
    
    document.getElementById('dash-expected').innerText = exp.toLocaleString(); document.getElementById('dash-collected').innerText = col.toLocaleString();
    document.getElementById('dash-debt').innerText = (exp - col).toLocaleString(); document.getElementById('dash-salaries').innerText = sal.toLocaleString();
    document.getElementById('dash-expenses').innerText = exs.toLocaleString();
    
    let net = col - sal - exs; let netEl = document.getElementById('dash-net'); netEl.innerText = net.toLocaleString(); netEl.style.color = net>=0 ? '#2ecc71' : '#e74c3c';
    
    if(typeof calcDifference === 'function') calcDifference();
}

function calcDifference() {
    let netEl = document.getElementById('dash-net');
    let actualEl = document.getElementById('dash-actual');
    let diffEl = document.getElementById('dash-diff');
    if(!netEl || !actualEl || !diffEl) return;
    
    let netText = netEl.innerText.replace(/,/g, '');
    let net = parseFloat(netText) || 0;
    let actual = parseFloat(actualEl.value) || 0;
    
    let diff = net - actual;
    diffEl.innerText = diff.toLocaleString();
    diffEl.style.color = diff === 0 ? '#2ecc71' : '#e74c3c';
}

// ============ 10. إحصائيات النظام ============
function renderStatistics() {
    if(!document.getElementById('tab-statistics')) return; 
    let totalStudents = 0; let totalSections = 0; let classStats = {};
    
    db.classes.forEach(c => {
        totalSections += c.sections.length;
        classStats[c.id] = { name: c.name, totalStudents: 0, sections: {} };
        c.sections.forEach(s => { classStats[c.id].sections[s.id] = { name: s.name, count: 0 }; });
    });
    
    db.students.forEach(s => {
        totalStudents++;
        if (classStats[s.classId]) {
            classStats[s.classId].totalStudents++;
            if (classStats[s.classId].sections[s.sectionId]) classStats[s.classId].sections[s.sectionId].count++;
        }
        (s.siblings || []).forEach(sib => {
            totalStudents++;
            if (classStats[sib.classId]) {
                classStats[sib.classId].totalStudents++;
                if (classStats[sib.classId].sections[sib.sectionId]) classStats[sib.classId].sections[sib.sectionId].count++;
            }
        });
    });
    
    document.getElementById('stat-total-students').innerText = totalStudents;
    document.getElementById('stat-total-sections').innerText = totalSections;
    
    let html = '';
    db.classes.forEach(c => {
        let cStat = classStats[c.id];
        let sectionsHtml = c.sections.map(sec => {
            let count = cStat.sections[sec.id].count;
            return `<div class="list-item flex-between p-2 mt-1" style="background:rgba(0,0,0,0.02); font-size:14px;"><span>شعبة ${sec.name}</span> <b style="color:#8e44ad;">${count} طالب</b></div>`;
        }).join('');
        
        let numSections = c.sections.length;
        html += `<div class="list-item mb-2" style="border-right: 4px solid #3498db; background: rgba(255, 255, 255, 0.4);">
            <div class="flex-between mb-1">
                <strong style="color: #2c3e50; font-size: 16px;"><i class="fas fa-layer-group"></i> ${c.name} (${numSections} شعب)</strong>
                <span class="glass p-1" style="background:#2ecc71; color:white; border:none; font-size:13px;">المجموع: ${cStat.totalStudents} طالب</span>
            </div>
            <div>${sectionsHtml || '<div class="text-center" style="font-size:13px;">لا توجد شعب</div>'}</div>
        </div>`;
    });
    
    document.getElementById('statistics-list').innerHTML = html || '<div class="text-center">لا توجد صفوف</div>';
}

// ============ 11. التقارير والطباعة ============
function generateReport() { 
    let cId=document.getElementById('rep-class').value, sId=document.getElementById('rep-section').value; 
    if(!cId||!sId){document.getElementById('report-list').innerHTML='';return;} 
    let f=db.students.filter(s=>s.classId==cId && s.sectionId==sId).map(s=>({...s, isSib:false})); 
    db.students.forEach(m=>{ (m.siblings||[]).forEach(sib=>{ if(sib.classId==cId && sib.sectionId==sId) f.push({name:sib.name, regId:sib.regId, isSib:true, mName:m.name}); }); }); 
    f.sort((a,b)=>a.name.localeCompare(b.name,'ar')); 
    document.getElementById('report-list').innerHTML=f.map((s,i)=>`<div class="list-item"><b>${i+1}.</b> ${s.name} ${s.regId?`<small>(قيد: ${s.regId})</small>`:''} ${s.isSib?`<small style="color:red;">(أخ لـ ${s.mName})</small>`:''}</div>`).join(''); 
}

function exportReportExcel() { 
    try {
        let cId=document.getElementById('rep-class').value, sId=document.getElementById('rep-section').value; 
        let c=db.classes.find(x=>x.id==cId), s=c?c.sections.find(x=>x.id==sId):null; 
        if(!c||!s) return customAlert('اختر الصف والشعبة', 'warning'); 
        let f=db.students.filter(x=>x.classId==cId && x.sectionId==sId).map(x=>({...x, isSib:false, ph:x.phone})); 
        db.students.forEach(m=>{ (m.siblings||[]).forEach(sib=>{ if(sib.classId==cId && sib.sectionId==sId) f.push({name:sib.name, regId:sib.regId, isSib:true, ph:m.phone}); }); }); 
        f.sort((a,b)=>a.name.localeCompare(b.name,'ar')); 
        let data=[[`تقرير الصف: ${c.name} - الشعبة: ${s.name}`],["التسلسل","اسم الطالب","رقم القيد","ملاحظة","الموبايل"]]; 
        f.forEach((x,i)=>{ data.push([i+1, x.name, x.regId||'', x.isSib?'أخ/أخت':'', x.ph||'']); }); 
        let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "التقرير"); XLSX.writeFile(wb, `تقرير_${c.name}_${s.name}.xlsx`); 
    } catch(e) { customAlert("تأكد من توفر الاتصال بالإنترنت لتحميل ملف الإكسل", "error"); }
}

function generateDriverReport() {
    let rCode = document.getElementById('rep-driver').value; 
    if(!rCode) { document.getElementById('report-list').innerHTML=''; return; }
    let f = db.students.filter(s => s.regionCode === rCode).map(s => ({...s, isSib:false}));
    db.students.forEach(m => { 
        (m.siblings||[]).forEach(sib => { 
            if(m.regionCode === rCode) f.push({name:sib.name, regId:sib.regId, isSib:true, mName:m.name}); 
        }); 
    });
    f.sort((a,b)=>a.name.localeCompare(b.name,'ar')); 
    document.getElementById('report-list').innerHTML = f.map((s,i)=>`<div class="list-item"><b>${i+1}.</b> ${s.name} ${s.regId?`<small>(قيد: ${s.regId})</small>`:''} ${s.isSib?`<small style="color:red;">(أخ لـ ${s.mName})</small>`:''}</div>`).join('');
}

function exportDriverExcel() { 
    try {
        let rCode = document.getElementById('rep-driver').value; 
        let reg = db.regions.find(x => x.code === rCode); 
        if(!reg) return customAlert('اختر خط النقل أولاً', 'warning');
        
        let f = db.students.filter(x => x.regionCode === rCode).map(x => ({...x, isSib:false, ph:x.phone}));
        db.students.forEach(m => { 
            (m.siblings||[]).forEach(sib => { 
                if(m.regionCode === rCode) f.push({name:sib.name, regId:sib.regId, isSib:true, ph:m.phone}); 
            }); 
        });
        f.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
        
        let data = [[`تقرير خط النقل: ${reg.name} - السائق: ${reg.driver}`],["التسلسل","اسم الطالب","رقم القيد","ملاحظة","الموبايل"]];
        f.forEach((x,i)=>{ data.push([i+1, x.name, x.regId||'', x.isSib?'أخ/أخت':'', x.ph||'']); }); 
        let wb = XLSX.utils.book_new(); 
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "تقرير السائق"); 
        XLSX.writeFile(wb, `خط_${reg.driver}.xlsx`); 
    } catch(e) { customAlert("تأكد من توفر الاتصال بالإنترنت لتحميل ملف الإكسل", "error"); }
}

function printGrades() { 
    let s=db.students.find(x=>x.id===currentStudentId), c=db.classes.find(x=>x.id==s.classId), sc=c?c.sections.find(x=>x.id==s.sectionId):null; 
    document.querySelectorAll('#grades-table-container input').forEach(e=>e.setAttribute('value',e.value)); 
    
    let tableHtml = document.getElementById('grades-table-container').innerHTML;
    
    tableHtml = tableHtml.replace(/<th>ش1<\/th>/g, '<th>الشهر<br>الأول</th>')
                         .replace(/<th>ش2<\/th>/g, '<th>الشهر<br>الثاني</th>')
                         .replace(/<th>ش3<\/th>/g, '<th>الشهر<br>الثالث</th>')
                         .replace(/>معدل ف1</g, '>معدل<br>الفصل<br>الأول<')
                         .replace(/>معدل ف2</g, '>معدل<br>الفصل<br>الثاني<')
                         .replace(/>نصف السنة</g, '>نصف<br>السنة<')
                         .replace(/>السعي السنوي</g, '>السعي<br>السنوي<')
                         .replace(/>الامتحان النهائي</g, '>الامتحان<br>النهائي<')
                         .replace(/>الدرجة النهائية</g, '>الدرجـة<br>النهائـية<')
                         .replace(/class="bg-blue"/g, '')
                         .replace(/<th colspan="3">الفصل الأول<\/th>/g, '<th colspan="3" class="bg-yellow">الفصل الأول</th>')
                         .replace(/<th colspan="3">الفصل الثاني<\/th>/g, '<th colspan="3" class="bg-yellow">الفصل الثاني</th>');

    let html = `
    <div class="print-wrapper" style="font-family: Arial, sans-serif; direction: rtl; width: 100%; margin: 0 auto; background: #fff;">
        <style>
            @media print {
                @page { size: A4 landscape; margin: 10mm; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }
                #print-area { background: #fff !important; display: block !important; position: absolute; left: 0; top: 0; width: 100%; direction: rtl; }
                .print-wrapper { width: 100%; }
                .header-tbl { width: 100%; border-collapse: collapse; border: 3px solid #000; font-weight: bold; font-size: 18px; margin-bottom: 0; background: #fff; }
                .header-tbl td { border: 3px solid #000; padding: 6px; text-align: center; vertical-align: middle; }
                .bg-blue-dark { background-color: #1a4d94 !important; color: white !important; font-size: 26px !important; font-weight: bold; }
                .bg-yellow-print { background-color: #ffff00 !important; color: #000 !important; }
                .text-red { color: #ff0000 !important; font-size: 24px !important; font-weight: 900; }
                .bg-green-light { background-color: #8bc34a !important; color: #000 !important; font-size: 16px; }
                .grades-tbl { width: 100%; border-collapse: collapse; border: 3px solid #000 !important; border-top: none !important; font-weight: bold; text-align: center; background: #fff; }
                .grades-tbl th, .grades-tbl td { border: 3px solid #000 !important; padding: 2px !important; color: #000 !important; font-size: 16px; height: 35px; }
                .grades-tbl thead th { background-color: #fff !important; }
                .grades-tbl .bg-yellow { background-color: #ffff00 !important; }
                .grades-tbl th.bg-yellow { background-color: #ffff00 !important; }
                .grades-tbl input { font-size: 16px !important; font-weight: bold !important; color: #000 !important; background: transparent !important; width: 100% !important; border: none !important; text-align: center !important; }
                .grades-tbl input.sub-name { font-size: 18px !important; font-weight: 900 !important; }
                .grades-tbl thead tr:first-child th:first-child { color: #1a4d94 !important; font-size: 20px !important; }
            }
        </style>

        <table class="header-tbl">
            <tr>
                <td style="width: 8%;">التسلسل</td>
                <td class="bg-green-light" style="width: 8%;">س ${s.regId || '-'}<br>3</td>
                <td style="width: 8%;">الصف</td>
                <td class="bg-yellow-print" style="width: 15%;">${c ? c.name : ''} ${sc ? sc.name : ''}</td>
                <td class="bg-blue-dark">${db.schoolName}</td>
            </tr>
            <tr>
                <td>اسم الطالب</td>
                <td colspan="4" class="bg-yellow-print text-red">${s.name}</td>
            </tr>
        </table>
        
        ${tableHtml}
    </div>`;
    
    document.getElementById('print-area').innerHTML = html; 
    window.print(); 
}

function printReceipt() {
    let s = db.students.find(x => x.id === currentStudentId);
    let c = db.classes.find(x => x.id == s.classId);
    let sc = c ? c.sections.find(x => x.id == s.sectionId) : null;
    let totTuition = s.tuition + (s.siblings||[]).reduce((a,b)=>a+(b.fee||0),0);
    let p = s.payments.reduce((a, b) => a + b.amount, 0);
    
    let installment = totTuition / 8;
    let paidCount = s.payments.length;
    let latestRecNo = paidCount > 0 ? (s.payments[paidCount-1].receiptNo || '----') : '----';
    let curYear = db.schoolDate || new Date().getFullYear();

    let sibs = s.siblings || [];
    let b1 = sibs[0] || {}; let c1 = db.classes.find(x=>x.id==b1.classId);
    let b2 = sibs[1] || {}; let c2 = db.classes.find(x=>x.id==b2.classId);
    let b3 = sibs[2] || {}; let c3 = db.classes.find(x=>x.id==b3.classId);
    let b4 = sibs[3] || {}; let c4 = db.classes.find(x=>x.id==b4.classId);

    let generateHalf = (title) => `
    <div class="receipt-print-container" style="border: 2px solid #000; padding: 10px; font-family: Arial, sans-serif; direction: rtl; width: 100%; box-sizing: border-box; height: 140mm; display: flex; flex-direction: column; justify-content: space-between; margin: 0 auto;">
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; background: transparent; border: 2px solid #000;">
            <tr>
                <td style="width: 15%; border: 2px solid #000; text-align: center; font-weight: bold; font-size: 14px;">
                    ${new Date().toLocaleDateString('en-GB')}<br>
                    <span style="font-size: 16px;">No: <span style="color:#e74c3c;">${latestRecNo}</span></span>
                </td>
                <td style="width: 15%; border: 2px solid #000; text-align: center; font-weight: bold; font-size: 18px;">
                    <div style="border: 2px solid #000; border-radius: 50%; display: inline-block; padding: 5px 15px;">${curYear}</div>
                </td>
                <td style="width: 50%; border: 2px solid #000; text-align: center; font-weight: bold; font-size: 22px;">
                    ${db.schoolName}
                </td>
                <td style="width: 20%; border: 2px solid #000; text-align: center; font-weight: bold; font-size: 16px;">
                    القيد: ${s.regId || '-'}<br>
                    <span style="font-size: 12px; color: #555;">${title}</span>
                </td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; text-align: center; font-weight: bold; font-size: 14px; border: 2px solid #000;">
            <tr>
                <td style="width: 40%; border: 2px solid #000; padding: 4px;">${s.name}</td>
                <td style="width: 10%; border: 2px solid #000; padding: 4px; background: rgba(0,0,0,0.05);">الصف</td>
                <td style="width: 15%; border: 2px solid #000; padding: 4px;">${c ? c.name : ''} ${sc ? sc.name : ''}</td>
                <td style="width: 10%; border: 2px solid #000; padding: 4px; background: rgba(0,0,0,0.05);">عدد الإخوة</td>
                <td style="width: 25%; border: 2px solid #000; padding: 4px;">${sibs.length}</td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; text-align: center; font-weight: bold; font-size: 13px; border: 2px solid #000;">
            <tr>
                <td style="width: 15%; border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الأخ الأول</td>
                <td style="width: 35%; border: 2px solid #000; padding: 3px;">${b1.name || ''}</td>
                <td style="width: 15%; border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الصف</td>
                <td style="width: 35%; border: 2px solid #000; padding: 3px;">${c1 ? c1.name : ''}</td>
            </tr>
            <tr>
                <td style="border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الأخ الثاني</td>
                <td style="border: 2px solid #000; padding: 3px;">${b2.name || ''}</td>
                <td style="border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الصف</td>
                <td style="border: 2px solid #000; padding: 3px;">${c2 ? c2.name : ''}</td>
            </tr>
            <tr>
                <td style="border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الأخ الثالث</td>
                <td style="border: 2px solid #000; padding: 3px;">${b3.name || ''}</td>
                <td style="border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الصف</td>
                <td style="border: 2px solid #000; padding: 3px;">${c3 ? c3.name : ''}</td>
            </tr>
            <tr>
                <td style="border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الأخ الرابع</td>
                <td style="border: 2px solid #000; padding: 3px;">${b4.name || ''}</td>
                <td style="border: 2px solid #000; background: rgba(0,0,0,0.05); padding: 3px;">الصف</td>
                <td style="border: 2px solid #000; padding: 3px;">${c4 ? c4.name : ''}</td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; text-align: center; font-weight: bold; font-size: 14px; border: 2px solid #000;">
            <tr style="background: rgba(0,0,0,0.05);">
                <td style="border: 2px solid #000; padding: 4px;">المبلغ الكلي</td>
                <td style="border: 2px solid #000; padding: 4px;">القسط الواحد</td>
                <td style="border: 2px solid #000; padding: 4px;">عدد المدفوع</td>
                <td style="border: 2px solid #000; padding: 4px;">مجموع المدفوع</td>
                <td style="border: 2px solid #000; padding: 4px;">المتبقي</td>
                <td style="border: 2px solid #000; padding: 4px;">الحالة الاجتماعية</td>
            </tr>
            <tr>
                <td style="border: 2px solid #000; padding: 4px; color: #2980b9;">${totTuition.toLocaleString()}</td>
                <td style="border: 2px solid #000; padding: 4px;">${installment.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})}</td>
                <td style="border: 2px solid #000; padding: 4px;">${paidCount}</td>
                <td style="border: 2px solid #000; padding: 4px; color: #27ae60;">${p.toLocaleString()}</td>
                <td style="border: 2px solid #000; padding: 4px; color: #c0392b;">${(totTuition - p).toLocaleString()}</td>
                <td style="border: 2px solid #000; padding: 4px;">${s.socialStatus || '-'}</td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; text-align: center; font-weight: bold; font-size: 13px; border: 2px solid #000;">
            <tr style="background: rgba(0,0,0,0.05);">
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط الأول</td>
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط الثاني</td>
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط الثالث</td>
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط الرابع</td>
            </tr>
            <tr style="background: rgba(0,0,0,0.02); font-size: 11px;">
                <td style="border: 1px solid #000; width: 12.5%;">المبلغ</td><td style="border: 1px solid #000; width: 12.5%;">التاريخ</td>
                <td style="border: 1px solid #000; width: 12.5%;">المبلغ</td><td style="border: 1px solid #000; width: 12.5%;">التاريخ</td>
                <td style="border: 1px solid #000; width: 12.5%;">المبلغ</td><td style="border: 1px solid #000; width: 12.5%;">التاريخ</td>
                <td style="border: 1px solid #000; width: 12.5%;">المبلغ</td><td style="border: 1px solid #000; width: 12.5%;">التاريخ</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[0]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[0]?.date || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[1]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[1]?.date || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[2]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[2]?.date || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[3]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[3]?.date || '-'}</td>
            </tr>
            <tr style="background: rgba(0,0,0,0.05);">
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط الخامس</td>
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط السادس</td>
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط السابع</td>
                <td colspan="2" style="border: 2px solid #000; padding: 4px;">القسط الثامن</td>
            </tr>
            <tr style="background: rgba(0,0,0,0.02); font-size: 11px;">
                <td style="border: 1px solid #000;">المبلغ</td><td style="border: 1px solid #000;">التاريخ</td>
                <td style="border: 1px solid #000;">المبلغ</td><td style="border: 1px solid #000;">التاريخ</td>
                <td style="border: 1px solid #000;">المبلغ</td><td style="border: 1px solid #000;">التاريخ</td>
                <td style="border: 1px solid #000;">المبلغ</td><td style="border: 1px solid #000;">التاريخ</td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[4]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[4]?.date || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[5]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[5]?.date || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[6]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[6]?.date || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px;">${s.payments[7]?.amount?.toLocaleString() || '0'}</td><td style="border: 1px solid #000; padding: 5px;">${s.payments[7]?.date || '-'}</td>
            </tr>
        </table>
        
        <div style="font-size: 12px; text-align: center; margin-top: 8px; font-weight: bold;">
            ولي الأمر ملزم بدفع المبلغ كاملاً في بداية العام أو اقساط دون قطع أي مبلغ في حالة نقله أو تركه المدرسة أو مباشرته متأخر ${curYear}
        </div>
    </div>`;

    let html = `
    <div style="width:100%; box-sizing: border-box; background: #fff;">
        <div style="page-break-after: always; break-after: page; height: 100vh; padding-top: 0;">
            ${generateHalf('نسخة المدرسة')}
        </div>
        <div style="height: 100vh; padding-top: 0;">
            ${generateHalf('نسخة الطالب')}
        </div>
    </div>`;

    document.getElementById('print-area').innerHTML = html;
    window.print();
}

function exportStudentExcel() { 
    try {
        let s=db.students.find(x=>x.id===currentStudentId), c=db.classes.find(x=>x.id==s.classId), sc=c?c.sections.find(x=>x.id==s.sectionId):null, p=s.payments.reduce((a,b)=>a+b.amount,0); 
        let totTuition = s.tuition + (s.siblings||[]).reduce((a,b)=>a+(b.fee||0),0);
        let data=[["العلاقة","الاسم","القيد","الموبايل","ملاحظات","الحالة الاجتماعية","الصف","الشعبة","الكلي","الواصل","المتبقي"],["الرئيسي",s.name,s.regId||'',s.phone||'',s.notes||'',s.socialStatus||'',c?c.name:'',sc?sc.name:'',totTuition,p,totTuition-p]]; 
        if(s.siblings){s.siblings.forEach(sib=>{let xC=db.classes.find(y=>y.id==sib.classId), xS=xC?xC.sections.find(y=>y.id==sib.sectionId):null; data.push(["أخ/أخت",sib.name,sib.regId||'',"-","-","-",xC?xC.name:'',xS?xS.name:'',"","-","-"]);});} 
        data.push([],["الدفعات","التاريخ","المبلغ"]); s.payments.forEach((py,i)=>data.push([`دفعة ${i+1}`,py.date,py.amount])); 
        let wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"الحساب"); XLSX.writeFile(wb,`الطالب_${s.name}.xlsx`); 
    } catch(e) { customAlert("تأكد من توفر الاتصال بالإنترنت لتحميل ملف الإكسل", "error"); }
}
