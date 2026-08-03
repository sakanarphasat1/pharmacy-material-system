// ==========================================================
// 💥 ส่วนที่ 1: การตั้งค่าระบบ (Configuration)
// ==========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚙️ 1.1 นำค่า firebaseConfig จริงจาก Firebase Console มาวางตรงนี้ครับ
const firebaseConfig = {
  apiKey: "AIzaSyC-IKwMD7-vkuG0moT24EAsSyxaV8Xty6c", // 👈 ใส่ API Key จริงของคุณตรงนี้ (ห้ามใช้ตัวอักษรสมมุติ)
  authDomain: "pharmacy-material-system.firebaseapp.com",
  projectId: "pharmacy-material-system",
  storageBucket: "pharmacy-material-system.firebasestorage.app",
  messagingSenderId: "605650439921",
  appId: "1:605650439921:web:a351896936ba83d1e2e350",
  measurementId: "G-EE28Y1L35G"
};

// 🔗 1.2 Web App URL จาก Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydRhaIaJH41mwiMMg-6qTTrhTfWIbOCNb9FwH5zEyZDQ-MrRmAm3gMpuG16e5XEi-1/exec";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ตัวแปรส่วนกลาง
let rowCount = 1;
let globalMaterialList = [];

// ==========================================================
// 💥 ส่วนที่ 2: ระบบยืนยันตัวตน (Authentication) & โหลดหน้าเว็บ
// ==========================================================

// ฟังก์ชันล็อกอินด้วย Google
window.loginWithGoogle = async function() {
    const statusEl = document.getElementById('loginStatus');
    const alertEl = document.getElementById('authAlert');
    if (alertEl) alertEl.style.display = 'none';
    if (statusEl) statusEl.innerText = "กำลังเชื่อมต่อ Google...";

    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed:", error);
        if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.innerText = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + error.message;
        }
        if (statusEl) statusEl.innerText = "";
    }
};

// ตรวจสอบสถานะการเข้าสู่ระบบ
onAuthStateChanged(auth, async (user) => {
    const loginSec = document.getElementById('loginSection');
    const formSec = document.getElementById('formSection');
    const statusEl = document.getElementById('loginStatus');

    if (user) {
        if (statusEl) statusEl.innerText = "กำลังตรวจสอบสิทธิ์...";

        try {
            // ส่งไปตรวจสอบสิทธิ์และดึงข้อมูลพัสดุจาก Apps Script
            if (loginSec) loginSec.classList.add('hidden');
            
            // โหลดเนื้อหาไฟล์ form.html และ preview.html เข้ามาแทรกในหน้าหลัก
            await loadComponent('formSection', 'form.html');
            await loadComponent('previewSection', 'preview.html');
            
            if (formSec) formSec.classList.remove('hidden');
            
            // ดึงรายการวัสดุและใส่ชื่อผู้ใช้
            const requesterInput = document.getElementById('requesterName');
            if (requesterInput) requesterInput.value = user.displayName || user.email;

            await fetchMaterialList();
            initDefaultDate();
            if (statusEl) statusEl.innerText = "";

        } catch (err) {
            console.error("Error loading user session:", err);
            if (statusEl) statusEl.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        }
    } else {
        if (loginSec) loginSec.classList.remove('hidden');
        if (formSec) formSec.classList.add('hidden');
    }
});

// ฟังก์ชันดึงไฟล์ HTML ย่อยมาแสดงผล
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = html;
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
    }
}

// ตั้งค่าวันที่เริ่มต้นเป็น พ.ศ.
function initDefaultDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyyBE = today.getFullYear() + 543;
    const docDateInput = document.getElementById('docDate');
    if (docDateInput) {
        docDateInput.value = `${yyyyBE}-${mm}-${dd}`;
    }
}

// ==========================================================
// 💥 ส่วนที่ 3: จัดการข้อมูลรายการพัสดุ (เชื่อมต่อ Apps Script)
// ==========================================================

// ดึงข้อมูลรายการวัสดุจาก Google Sheet ผ่าน Apps Script
async function fetchMaterialList() {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "getMaterials" })
        });
        const result = await response.json();
        
        if (result.success) {
            globalMaterialList = result.data;
            const selectEl = document.getElementById('itemSelect1') || document.querySelector('.item-name');
            if (selectEl) {
                updateMaterialDropdown(selectEl);
            }
        } else {
            console.error("โหลดข้อมูลพัสดุล้มเหลว:", result.message);
        }
    } catch (error) {
        console.error("Error fetching materials:", error);
    }
}

// อัปเดตตัวเลือกใน Dropdown
window.updateMaterialDropdown = function(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = `<option value="">-- เลือกรายการพัสดุ --</option>`;
    if (globalMaterialList && globalMaterialList.length > 0) {
        globalMaterialList.forEach(mat => {
            const opt = document.createElement('option');
            opt.value = mat.name;
            opt.text = `${mat.code} - ${mat.name} (คงเหลือ: ${mat.stock} ${mat.unit})`; 
            
            opt.setAttribute('data-code', mat.code);
            opt.setAttribute('data-unit', mat.unit);
            opt.setAttribute('data-stock', mat.stock);
            
            if (mat.stock <= 0) {
                opt.style.color = "red";
            }
            selectElement.appendChild(opt);
        });
    } else {
        selectElement.innerHTML = `<option value="">-- ไม่มีข้อมูลพัสดุในระบบ --</option>`;
    }
};

// เมื่อผู้ใช้เลือกรายการวัสดุ
window.onMaterialChange = function(selectEl) {
    const row = selectEl.closest('tr');
    if (!row) return;
    
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const codeInput = row.querySelector('.item-code');
    const unitInput = row.querySelector('.item-unit');
    const qtyInput = row.querySelector('.item-qty');
    
    if (selectedOption && selectEl.value !== "") {
        const currentStock = Number(selectedOption.getAttribute('data-stock') || 0);
        
        if (currentStock <= 0) {
            alert(`❌ รายการพัสดุนี้หมดคลังแล้วครับ (คงเหลือ 0) ไม่สามารถเลือกเบิกได้ครับ`);
            selectEl.value = "";
            if (codeInput) codeInput.value = "";
            if (unitInput) unitInput.value = "";
            return;
        }

        if (codeInput) codeInput.value = selectedOption.getAttribute('data-code') || "-";
        if (unitInput) unitInput.value = selectedOption.getAttribute('data-unit') || "-";
        
        if (qtyInput) {
            qtyInput.oninput = () => checkQuantityLimit(qtyInput);
        }
    } else {
        if (codeInput) codeInput.value = "";
        if (unitInput) unitInput.value = "";
    }
};

// ตรวจสอบจำนวนเบิกไม่ให้เกินสต็อก
window.checkQuantityLimit = function(inputEl) {
    const row = inputEl.closest('tr');
    if (!row) return;
    
    const selectEl = row.querySelector('select');
    if (!selectEl) return;
    
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (!selectedOption || selectEl.value === "") return;
    
    const maxStock = Number(selectedOption.getAttribute('data-stock') || 0);
    const enteredQty = Number(inputEl.value || 0);
    
    if (enteredQty <= 0 && inputEl.value !== "") {
        alert("❌ กรุณากรอกจำนวนเบิกให้มากกว่า 0 ครับ");
        inputEl.value = "";
        return;
    }
    
    if (enteredQty > maxStock) {
        alert(`❌ ไม่สามารถเบิกได้เนื่องจากจำนวนสินค้าไม่พอ\n(พัสดุชิ้นนี้คงเหลือในคลังเพียง ${maxStock} เท่านั้น)`);
        inputEl.value = maxStock;
    }
};

// ==========================================================
// 💥 ส่วนที่ 4: การเพิ่ม/ลบ แถวในตาราง
// ==========================================================

window.addNewRow = function() {
    rowCount++;
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="row-index" style="text-align: center;">${rowCount}</td>
        <td>
            <select class="item-name" style="width:100%; padding:8px; border-radius:6px; border:1px solid #BDC3C7;" required onchange="onMaterialChange(this)"></select>
        </td>
        <td><input type="number" class="item-qty" min="1" required placeholder="0"></td>
        <td><input type="text" class="item-unit" required readonly placeholder="หน่วยนับ" style="background-color: #f3f4f6;"></td>
        <td><input type="text" class="item-code" readonly placeholder="รหัสวัสดุ" style="background-color: #f3f4f6;"></td>
        <td><input type="text" class="item-req-no" value="800000"></td>
        <td><input type="text" class="item-pay-no" value="490000"></td>
        <td style="text-align: center;"><button type="button" class="btn-delete-row" onclick="deleteRow(this)">❌</button></td>
    `;
    tbody.appendChild(tr);
    
    const newSelect = tr.querySelector('.item-name');
    updateMaterialDropdown(newSelect);
};

window.deleteRow = function(button) {
    const row = button.closest('tr');
    const tbody = row.parentNode;
    if (tbody.rows.length > 1) {
        row.remove();
        reIndexRows();
    } else {
        alert("ต้องมีรายการวัสดุอย่างน้อย 1 รายการครับ");
    }
};

function reIndexRows() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let index = 0;
    rows.forEach((row) => {
        index++;
        const idxCell = row.querySelector('.row-index');
        if (idxCell) idxCell.innerText = index;
    });
    rowCount = index;
}

// ==========================================================
// 💥 ส่วนที่ 5: จัดการ Form Submission & Save to Google Sheets
// ==========================================================

window.handleFormSubmit = async function(actionType) {
    if (window.event) window.event.preventDefault();
    
    const items = [];
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let hasError = false;

    rows.forEach(row => {
        const nameSelect = row.querySelector('.item-name');
        const name = nameSelect ? nameSelect.value.trim() : '';
        const qty = row.querySelector('.item-qty') ? row.querySelector('.item-qty').value.trim() : '0';
        const unit = row.querySelector('.item-unit') ? row.querySelector('.item-unit').value.trim() : '';
        const code = row.querySelector('.item-code') ? row.querySelector('.item-code').value.trim() : '-';
        
        let reqNoValue = row.querySelector('.item-req-no') ? row.querySelector('.item-req-no').value.trim() : '';
        let payNoValue = row.querySelector('.item-pay-no') ? row.querySelector('.item-pay-no').value.trim() : '';
        
        let reqNo = (reqNoValue === "" || reqNoValue === "800000") ? "800000..............." : reqNoValue;
        let payNo = (payNoValue === "" || payNoValue === "490000") ? "490000..............." : payNoValue;
        
        if (name !== "") {
            items.push({
                index: row.querySelector('.row-index') ? row.querySelector('.row-index').innerText : '',
                name: name,
                qty: qty,
                unit: unit,
                code: code,
                reqNo: reqNo,
                payNo: payNo
            });
        } else {
            hasError = true;
        }
    });

    if (items.length === 0 || hasError) {
        alert("กรุณาเลือกรายการพัสดุให้ครบถ้วนก่อนดำเนินการครับ");
        return;
    }

    const rawDate = document.getElementById('docDate') ? document.getElementById('docDate').value : ''; 
    let formattedBEData = rawDate;
    if (rawDate) {
        const dateParts = rawDate.split('-');
        if (dateParts.length === 3) {
            let year = parseInt(dateParts[0], 10);
            if (year < 2500) year += 543;
            formattedBEData = `${dateParts[2]}/${dateParts[1]}/${year}`;
        }
    }

    const formData = {
        organization: document.getElementById('organization')?.value.trim() || '-',
        docDate: formattedBEData, 
        moneySource: document.getElementById('moneySource')?.value.trim() || '-',
        items: items, 
        requesterName: document.getElementById('requesterName')?.value.trim() || '-',
        supplyHeadName: document.getElementById('supplyHeadName')?.value.trim() || '-',
        approverName: "..........................................................",
        accountantName: document.getElementById('accountantName')?.value.trim() || '-',
        payerName: document.getElementById('payerName')?.value.trim() || '-'
    };

    if (actionType === 'save') {
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.classList.remove('hidden');

        try {
            // ส่งข้อมูลไปบันทึกผ่าน Apps Script Web App
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: "saveData", formData: formData })
            });
            const result = await response.json();

            if (loading) loading.classList.add('hidden');

            if (result.success) {
                mapDataToA4Preview(formData);
                
                const popup = document.getElementById('successPopup');
                if (popup) popup.classList.remove('hidden');

                const postSaveBox = document.getElementById('postSaveActions');
                if (postSaveBox) postSaveBox.style.display = 'flex';

                resetForm();
                await fetchMaterialList(); // โหลดสต็อกล่าสุดกลับมา
            } else {
                alert("เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์: " + result.message);
            }

        } catch (error) {
            if (loading) loading.classList.add('hidden');
            console.error("Save failed:", error);
            alert("การบันทึกล้มเหลว: " + error.message);
        }

    } else {
        // กรณีดูพรีวิว (Preview)
        mapDataToA4Preview(formData);
        
        const postSaveBox = document.getElementById('postSaveActions');
        if (postSaveBox) postSaveBox.style.display = 'none';
        
        const previewSection = document.getElementById('previewSection');
        if (previewSection) {
            previewSection.classList.remove('hidden');
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};

// ==========================================================
// 💥 ส่วนที่ 6: Mapping เอกสาร A4 & Helper Functions
// ==========================================================

function mapDataToA4Preview(data) {
    const moneySourceEl = document.getElementById('viewMoneySource');
    if (moneySourceEl) {
        moneySourceEl.innerText = data.moneySource || "-";
        moneySourceEl.parentElement.style.borderBottom = (data.moneySource && data.moneySource !== "-") ? "none" : "1px dotted #000";
    }
    
    const orgEl = document.getElementById('viewOrganization');
    if (orgEl) {
        orgEl.innerText = data.organization || "-";
        orgEl.parentElement.style.borderBottom = (data.organization && data.organization !== "-") ? "none" : "1px dotted #000";
    }

    const docDateEl = document.getElementById('viewDocDate');
    if (docDateEl && data.docDate) {
        docDateEl.innerText = data.docDate;
        docDateEl.parentElement.style.borderBottom = (data.docDate && data.docDate !== "-") ? "none" : "1px dotted #000";
    }
    
    if (document.getElementById('viewRequesterName')) document.getElementById('viewRequesterName').innerText = data.requesterName;
    if (document.getElementById('viewSupplyHeadName')) document.getElementById('viewSupplyHeadName').innerText = data.supplyHeadName;
    if (document.getElementById('viewApproverName')) document.getElementById('viewApproverName').innerText = data.approverName;
    if (document.getElementById('viewAccountantName')) document.getElementById('viewAccountantName').innerText = data.accountantName;
    if (document.getElementById('viewPayerName')) document.getElementById('viewPayerName').innerText = data.payerName;

    const tbody = document.getElementById('previewTableBody');
    if (tbody) {
        tbody.innerHTML = "";
        data.items.forEach((item) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="center-text">${item.index}</td>
                <td>${item.name}</td>
                <td class="center-text">${item.qty}</td>
                <td class="center-text">${item.unit}</td>
                <td class="center-text">${item.code}</td>
                <td class="center-text">${item.reqNo}</td>
                <td class="center-text">${item.payNo}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.closePopup = function() {
    // ซ่อน Popup
    const popup = document.getElementById('successPopup');
    if (popup) popup.classList.add('hidden');
    
    const formSec = document.getElementById('formSection');
    const prevSec = document.getElementById('previewSection');
    
    // 🙈 ซ่อนหน้าฟอร์มกรอกข้อมูล
    if (formSec) formSec.classList.add('hidden');
    
    // 👁️ แสดงเฉพาะหน้า A4 Preview
    if (prevSec) {
        prevSec.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนขึ้นบนสุด
    }
};

// 2. เมื่อผู้ใช้กดปุ่ม "กลับไปหน้าฟอร์ม" จากหน้า Preview
window.backToForm = function() {
    const prevSec = document.getElementById('previewSection');
    const formSec = document.getElementById('formSection');

    // 🙈 ซ่อนหน้า A4 Preview
    if (prevSec) prevSec.classList.add('hidden');
    
    // 👁️ แสดงเฉพาะหน้าฟอร์ม
    if (formSec) {
        formSec.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.resetForm = function() {
    const form = document.getElementById('materialForm');
    if (form) form.reset();
    
    const tbody = document.getElementById('itemsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td class="row-index" style="text-align: center;">1</td>
                <td>
                    <select id="itemSelect1" class="item-name" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #BDC3C7;" required onchange="onMaterialChange(this)">
                        <option value="">-- เลือกรายการพัสดุ --</option>
                    </select>
                </td>
                <td><input type="number" class="item-qty" min="1" required placeholder="0"></td>
                <td><input type="text" class="item-unit" required readonly placeholder="หน่วยนับ" style="background-color: #f3f4f6;"></td>
                <td><input type="text" class="item-code" readonly placeholder="รหัสวัสดุ" style="background-color: #f3f4f6;"></td>
                <td><input type="text" class="item-req-no" value="800000"></td>
                <td><input type="text" class="item-pay-no" value="490000"></td>
                <td style="text-align: center;"><button type="button" class="btn-delete-row" onclick="deleteRow(this)">❌</button></td>
            </tr>
        `;
    }
    
    rowCount = 1;
    const firstSelect = document.getElementById('itemSelect1');
    if (firstSelect) updateMaterialDropdown(firstSelect);
    
    initDefaultDate();
};

window.printDoc = function() {
    window.print();
};

window.openDriveFolder = function() {
    const pdfFileId = "1qsFQ01jGrgofyYvxxxrJ6rOPYJyoIZBW"; 
    const driveUrl = "https://drive.google.com/file/d/" + pdfFileId + "/preview";
    
    const iframe = document.getElementById('driveIframe');
    const modal = document.getElementById('driveModal');
    
    if (iframe) iframe.src = driveUrl;
    if (modal) modal.style.display = 'flex';
};

window.closeDriveModal = function() {
    const modal = document.getElementById('driveModal');
    const iframe = document.getElementById('driveIframe');
    
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = '';
};
