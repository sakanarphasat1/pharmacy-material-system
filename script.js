<script>
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚙️ Firebase Config ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyC-IKwMD7-vkuG0mOT24EAsSyxaV8Xty6c",
  authDomain: "pharmacy-material-system.firebaseapp.com",
  projectId: "pharmacy-material-system",
  storageBucket: "pharmacy-material-system.firebasestorage.app",
  messagingSenderId: "605650439921",
  appId: "1:605650439921:web:a351896936ba83d1e2e350"
};

const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; // URL ของ Apps Script คุณ

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 🔑 ฟังก์ชันล็อกอิน
window.loginWithGoogle = async function() {
  try {
    const result = await signInWithPopup(auth, provider);
    const userEmail = result.user.email;

    document.getElementById('loginStatus').innerText = "กำลังตรวจสอบสิทธิ์...";

    // ส่งไปเช็คสิทธิ์กับ Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: "checkUser", email: userEmail })
    });
    const data = await response.json();

    if (data.isAllowed) {
      // 📂 ดึงไฟล์ Form.html มาแสดงผลในหน้าเว็บ
      await loadComponent('Form.html', 'formSection');
      
      document.getElementById('loginSection').classList.add('hidden');
      document.getElementById('formSection').classList.remove('hidden');
      document.getElementById('requesterName').value = data.fullName;
    } else {
      alert(data.message || "ไม่มีสิทธิ์เข้าใช้งาน");
      signOut(auth);
    }
  } catch (error) {
    console.error("Login Error:", error);
  }
};

// 🛠️ ฟังก์ชันสำหรับดึงไฟล์ HTML ย่อย (เช่น Form.html, Preview.html) มาแทรกในหน้าเว็บ
async function loadComponent(fileUrl, targetElementId) {
  const res = await fetch(fileUrl);
  const htmlText = await res.text();
  document.getElementById(targetElementId).innerHTML = htmlText;
}

/**
 * ฟังก์ชันลบแถวรายการพัสดุ
 */
function deleteRow(button) {
    const row = button.parentNode.parentNode;
    const tbody = row.parentNode;
    if(tbody.rows.length > 1) {
        row.remove();
        reIndexRows();
    } else {
        alert("ต้องมีรายการวัสดุอย่างน้อย 1 รายการครับ");
    }
}

/**
 * จัดลำดับตัวเลขหน้าแถวตารางใหม่
 */
function reIndexRows() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rowCount = 0;
    rows.forEach((row) => {
        rowCount++;
        row.querySelector('.row-index').innerText = rowCount;
    });
}

/**
 * จัดการรวบรวมค่าแล้ว Submit ไปหาเซิร์ฟเวอร์
 */
// 💡 เปลี่ยนชื่อกลับเป็น handleFormSubmit เพื่อให้ระบบฟอร์มรู้จักเหมือนเดิม
function handleFormSubmit(actionType) {
    // ป้องกันไม่ให้หน้าเว็บรีเฟรชตัวเอง (ใส่เผื่อไว้)
    if (window.event) window.event.preventDefault();
    
    // 1. ประกาศตัวแปรอาร์เรย์ไว้สำหรับรวบรวมรายการพัสดุ
    const items = [];
    
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rows.forEach(row => {
        const nameSelect = row.querySelector('.item-name');
        const name = nameSelect ? nameSelect.value.trim() : '';
        const qtyInput = row.querySelector('.item-qty');
        const qty = qtyInput ? qtyInput.value.trim() : '0';
        const unitInput = row.querySelector('.item-unit');
        const unit = unitInput ? unitInput.value.trim() : '';
        const codeInput = row.querySelector('.item-code');
        const code = codeInput ? codeInput.value.trim() : '-';
        
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
        }
    });

    // 2. ดึงค่าวันที่มาสลับและแปลงปีให้เป็น พ.ศ. ก่อนส่งไป Sheets
    const docDateEl = document.getElementById('docDate');
    const rawDate = docDateEl ? docDateEl.value : ''; 
    let formattedBEData = rawDate;
    
    if (rawDate) {
        const dateParts = rawDate.split('-');
        if (dateParts.length === 3) {
            let year = parseInt(dateParts[0], 10);
            if (year < 2500) year = year + 543;
            formattedBEData = `${dateParts[2]}/${dateParts[1]}/${year}`;
        }
    }

    // 3. รวบรวมข้อมูลทั้งหมดเข้าด้วยกัน
    const formData = {
        organization: document.getElementById('organization') ? document.getElementById('organization').value.trim() : '-',
        docDate: formattedBEData, 
        moneySource: document.getElementById('moneySource') ? document.getElementById('moneySource').value.trim() : '-',
        workPlan: document.getElementById('workPlan') ? document.getElementById('workPlan').value.trim() : '-',
        items: items, 
        requesterName: document.getElementById('requesterName') ? document.getElementById('requesterName').value.trim() : '-',
        supplyHeadName: document.getElementById('supplyHeadName') ? document.getElementById('supplyHeadName').value.trim() : '-',
        approverName: (document.getElementById('approverName') && document.getElementById('approverName').value.trim()) || "..........................................................",
        accountantName: document.getElementById('accountantName') ? document.getElementById('accountantName').value.trim() : '-',
        payerName: document.getElementById('payerName') ? document.getElementById('payerName').value.trim() : '-'
    };

    // 4. แยกการทำงานตามปุ่มที่กดใช้งานจริง
    // 💥 เช็คช่วงท้ายของฟังก์ชัน handleFormSubmit ใน Script.html แล้วปรับตรงนี้ครับ

    if (actionType === 'save') {
        // ---- ส่วนบันทึกเดิมของคุณ (ที่ใช้งานได้ดีอยู่แล้ว) ----
        document.getElementById('loadingOverlay').classList.remove('hidden');
        google.script.run
            .withSuccessHandler(response => {
                document.getElementById('loadingOverlay').classList.add('hidden');
                if(response.success) {
                    mapDataToA4Preview(formData);
                    document.getElementById('successPopup').classList.remove('hidden');
                    
                    // 🔓 [จุดที่เพิ่ม 1] บันทึกสำเร็จแล้ว สั่งเปิดแสดงปุ่มสองอันใน Preview.html ทันที
                    const postSaveBox = document.getElementById('postSaveActions');
                    if (postSaveBox) {
                        postSaveBox.style.display = 'block'; 
                    }
                    
                    if (typeof resetForm === "function") resetForm();
                } else {
                    alert("เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์: " + response.message);
                }
            })
            .withFailureHandler(err => {
                document.getElementById('loadingOverlay').classList.add('hidden');
                alert("การเชื่อมต่อล้มเหลว: " + err.toString());
            })
            .saveData(formData);
            
    } else {
        // 👁️ สำหรับปุ่มดูพรีวิว (actionType เป็นค่าอื่นที่ไม่ใช่ 'save')
        
        // 1. สั่งวาดข้อมูลลงตารางพรีวิว A4
        mapDataToA4Preview(formData);
        
        // 🔒 [จุดที่เพิ่ม 2] สั่งซ่อนปุ่มสองอันใน Preview.html ไว้ก่อนเสมอตอนดูพรีวิว
        const postSaveBox = document.getElementById('postSaveActions');
        if (postSaveBox) {
            postSaveBox.style.display = 'none'; 
        }
        
        // 2. ปลดล็อกการซ่อนหน้าพรีวิวเดิมของคุณ
        const previewSection = document.getElementById('previewSection');
        if (previewSection) {
            previewSection.style.display = 'block'; 
            previewSection.removeAttribute('hidden');
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            alert("👁️ อัปเดตข้อมูลไปที่หน้าพรีวิว A4 ด้านล่างเรียบร้อยแล้วครับ ลองเลื่อนจอลงไปตรวจเช็คได้เลย!");
        }
    }
}

/**
 * นำข้อมูลไปเรนเดอร์แสดงบนหน้ากระดาษ A4 (แก้ไขปีกกาและพารามิเตอร์แล้ว)
 */
function mapDataToA4Preview(data) {
    // เช็คข้อมูล แหล่งเงิน ถ้ามีค่าให้เอาเส้นจุดไข่ปลาออก (ปรับสไตล์เส้นขอบล่างเป็น none)
    const moneySourceEl = document.getElementById('viewMoneySource');
    if (moneySourceEl) {
        moneySourceEl.innerText = data.moneySource || "-";
        if (data.moneySource && data.moneySource !== "-") {
            moneySourceEl.parentElement.style.borderBottom = "none";
        } else {
            moneySourceEl.parentElement.style.borderBottom = "1px dotted #000";
        }
    }
    
    // เช็คข้อมูล หน่วยงาน ถ้ามีค่าให้เอาเส้นจุดไข่ปลาออก (ปรับสไตล์เส้นขอบล่างเป็น none)
    const orgEl = document.getElementById('viewOrganization');
    if (orgEl) {
        orgEl.innerText = data.organization || "-";
        if (data.organization && data.organization !== "-") {
            orgEl.parentElement.style.borderBottom = "none";
        } else {
            orgEl.parentElement.style.borderBottom = "1px dotted #000";
        }
    }

    if(document.getElementById('viewWorkPlan')) {
        document.getElementById('viewWorkPlan').innerText = data.workPlan;
    }
    
    // แปลงฟอร์แมตวันที่ให้อ่านง่าย (วว/ดด/ปปปป) และซ่อนเส้นไข่ปลาเมื่อมีข้อมูล
    // เช็คข้อมูล วันที่ ในหน้าพรีวิว
    const docDateEl = document.getElementById('viewDocDate');
    if(docDateEl && data.docDate) {
        // นำค่าวันที่ที่เป็น พ.ศ. เรียบร้อยแล้วมาโชว์ได้เลย
        docDateEl.innerText = data.docDate;
        
        if (data.docDate && data.docDate !== "-") {
            docDateEl.parentElement.style.borderBottom = "none";
        } else {
            docDateEl.parentElement.style.borderBottom = "1px dotted #000";
        }
    }
    
    // รายชื่อลายเซ็นท้ายกระดาษ
    if(document.getElementById('viewRequesterName')) document.getElementById('viewRequesterName').innerText = data.requesterName;
    if(document.getElementById('viewSupplyHeadName')) document.getElementById('viewSupplyHeadName').innerText = data.supplyHeadName;
    if(document.getElementById('viewApproverName')) document.getElementById('viewApproverName').innerText = data.approverName;
    if(document.getElementById('viewAccountantName')) document.getElementById('viewAccountantName').innerText = data.accountantName;
    if(document.getElementById('viewPayerName')) document.getElementById('viewPayerName').innerText = data.payerName;

    // เคลียร์รายการเก่าในตารางพรีวิวออกก่อน จากนั้นวนลูปวาดแถวใหม่
    const tbody = document.getElementById('previewTableBody');
    if(tbody) {
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

/**
 * ฟังก์ชันทำงานเมื่อกดปุ่ม "ตกลง" บน Pop-up สำเร็จ
 */
function closePopup() {
    document.getElementById('successPopup').classList.add('hidden');
    
    // ซ่อนฝั่งหน้าฟอร์มกรอกข้อมูล และเปิดหน้าแสดงผลพรีวิว A4 ขึ้นมาแทน
    const formSec = document.getElementById('formSection');
    const prevSec = document.getElementById('previewSection');
    
    if(formSec && prevSec) {
        formSec.classList.remove('active-view');
        prevSec.classList.add('active-view');
        window.scrollTo(0, 0); // ดึงหน้าจอกลับไปด้านบนสุดเพื่อให้เห็นหัวกระดาษพรีวิว
    }
}

function backToForm() {
    // 🔒 1. สั่งให้ซ่อนกลุ่มปุ่มพิมพ์/แก้ไขกลับไปทันที (เคลียร์ปัญหาปุ่มลอยเกยตื้น)
    const postSaveBox = document.getElementById('postSaveActions');
    if (postSaveBox) {
        postSaveBox.style.display = 'none';
    }

    // 🔄 2. สลับหน้าจอโดยใช้ระบบคลาสเดิมของคุณเป๊ะๆ
    document.getElementById('previewSection').classList.remove('active-view');
    document.getElementById('formSection').classList.add('active-view');
    
    // 🚀 3. สั่งให้หน้าจอสมูทสไลด์กลับขึ้นไปด้านบนสุด เพื่อให้พร้อมกรอกฟอร์มใหม่ทันที
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 🔥 [จุดที่เพิ่มใหม่] สั่งให้ระบบแอบรีเฟรชโหลดสต็อกล่าสุดจากชีตทันทีที่กลับมาหน้านี้!
    refreshMaterialData();
}

function printDoc() { window.print(); }

function resetForm() {
    // 1. สั่งล้างฟอร์มหลัก (ชื่อผู้เบิก, แผนงาน) ให้เสร็จสิ้นก่อนเพื่อน
    if(document.getElementById('materialForm')) {
        document.getElementById('materialForm').reset();
    }
    
    // 2. เคลียร์ตารางพัสดุและสร้างแถวที่ 1 ขึ้นมาใหม่ (ย้ายมาทำทีหลังเพื่อไม่ให้โดนล้างค่า)
    const tbody = document.getElementById('itemsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td class="row-index">1</td>
                <td>
                    <select id="itemSelect1" class="item-name" style="width: 100%; padding: 6px; border-radius: 4px;" required onchange="onMaterialChange(this)">
                        <option value="">-- เลือกรายการพัสดุ --</option>
                    </select>
                </td>
                <td><input type="number" class="item-qty" min="1" required placeholder="0"></td>
                <td><input type="text" class="item-unit" required readonly placeholder="หน่วยนับ" style="background-color: #f3f4f6;"></td>
                <td><input type="text" class="item-code" readonly placeholder="รหัสวัสดุ" style="background-color: #f3f4f6;"></td>
                
                <td><input type="text" class="item-req-no" value="800000"></td>
                <td><input type="text" class="item-pay-no" value="490000"></td>
                
                <td><button type="button" class="btn-delete-row" onclick="deleteRow(this)">❌</button></td>
            </tr>
        `;
    }
    
    // 3. รีเซ็ตตัวนับแถวกลับไปเริ่มต้นที่ 1
    rowCount = 1; 
    
    // 4. โหลดรายการพัสดุจาก Excel มาใส่ในดรอปดาวน์แถวที่ 1 ทันที
    if(document.getElementById('itemSelect1')) {
        updateMaterialDropdown(document.getElementById('itemSelect1'));
    }
    
    // 5. จัดเรียงลำดับแถวใหม่
    if(typeof reIndexRows === 'function') {
        reIndexRows();
    }
    
    // 6. ดึงวันที่ปัจจุบันมาแปลงเป็น พ.ศ. เติมกลับเข้าช่อง docDate เสมอ
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyyBE = today.getFullYear() + 543;
    if(document.getElementById('docDate')) {
        document.getElementById('docDate').value = `${yyyyBE}-${mm}-${dd}`; 
    }
}

// ==========================================================
// 💥 ส่วนที่ 1: ประกาศตัวแปรส่วนกลาง (มีแค่อย่างละ 1 อันเท่านั้น!)
// ==========================================================
let rowCount = 1;
let globalMaterialList = []; 

// ฟังก์ชันทำงานทันทีเมื่อเปิดหน้าเว็บ
window.addEventListener('DOMContentLoaded', () => {
    // 1. ตั้งค่าวันที่เริ่มต้นเป็น พ.ศ.
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyyBE = today.getFullYear() + 543;
    if(document.getElementById('docDate')) {
        document.getElementById('docDate').value = `${yyyyBE}-${mm}-${dd}`; 
    }
    
    // 2. วิ่งไปดึงรายชื่อของทั้งหมดจาก Google Sheets หลังบ้าน
    google.script.run
        .withSuccessHandler(response => {
            if(response.success) {
                globalMaterialList = response.data;
                // เติมข้อมูลใส่ดร็อปดาวน์ของแถวแรก (Row 1) ทันที
                updateMaterialDropdown(document.getElementById('itemSelect1'));
            } else {
                alert("โหลดข้อมูลพัสดุล้มเหลว: " + response.message);
            }
        })
        .getMaterialList();
});

// ==========================================================
// 💥 ส่วนที่ 2: ฟังก์ชันจัดการระบบดร็อปดาวน์และการเพิ่มแถว
// ==========================================================

/**
 * ฟังก์ชันสร้างตัวเลือก (Option) ใส่ในแท็ก <select>
 */
function updateMaterialDropdown(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = `<option value="">-- เลือกรายการพัสดุ --</option>`;
    if (globalMaterialList && globalMaterialList.length > 0) {
        globalMaterialList.forEach(mat => {
            const opt = document.createElement('option');
            opt.value = mat.name;
            
            // 🎨 ปรับปรุง: โชว์ รหัส - ชื่อพัสดุ และระบุจำนวนคงเหลือพ่วงท้ายเข้าไปด้วย
            opt.text = `${mat.code} - ${mat.name} (คงเหลือ: ${mat.stock} ${mat.unit})`; 
            
            opt.setAttribute('data-code', mat.code);
            opt.setAttribute('data-unit', mat.unit);
            opt.setAttribute('data-stock', mat.stock); // 📦 ฝังยอดสต็อกคงเหลือเก็บไว้ใช้งานต่อ
            
            // 🚨 ดักจับ: ถ้าสินค้าชิ้นนี้ของหมดเกลี้ยง (เหลือ 0) จะเปลี่ยนตัวหนังสือเป็นสีแดงเด่นๆ
            if (mat.stock <= 0) {
                opt.style.color = "red";
                // opt.text = `❌ [หมด] ${mat.code} - ${mat.name}`; // ปลดคอมเมนต์บรรทัดนี้ได้ถ้าอยากให้มีคำว่า [หมด] นำหน้า
            }
            
            selectElement.appendChild(opt);
        });
    } else {
        selectElement.innerHTML = `<option value="">-- ไม่มีข้อมูลพัสดุในระบบ --</option>`;
    }
}

/**
 * ฟังก์ชันเมื่อเลือกของปุ๊บ ให้รหัสและหน่วยนับเด้งมาล็อกอัตโนมัติ
 */
function onMaterialChange(selectEl) {
    const row = selectEl.closest('tr');
    if (!row) return;
    
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const codeInput = row.querySelector('.item-code');
    const unitInput = row.querySelector('.item-unit');
    
    if (selectedOption && selectEl.value !== "") {
        if(codeInput) codeInput.value = selectedOption.getAttribute('data-code') || "-";
        if(unitInput) unitInput.value = selectedOption.getAttribute('data-unit') || "-";
        
        // 🔒 ดักตรวจสอบแบบ Real-time: ถ้าคนใช้งานมาคลิกเลือกพัสดุที่ยอดสต็อกเป็น 0 
        const currentStock = Number(selectedOption.getAttribute('data-stock') || 0);
        if (currentStock <= 0) {
            alert(`❌ รายการพัสดุนี้หมดคลังแล้วครับ (คงเหลือ 0) ไม่สามารถเลือกเบิกได้ครับ`);
            selectEl.value = ""; // เด้งค่าย้อนกลับไปที่ค่าว่างเริ่มต้นทันที
            if(codeInput) codeInput.value = "";
            if(unitInput) unitInput.value = "";
        }
    } else {
        if(codeInput) codeInput.value = "";
        if(unitInput) unitInput.value = "";
    }
}

/**
 * 💡 ฟังก์ชันพิเศษโหลดสต็อกพัสดุล่าสุดจาก Google Sheets แบบเรียลไทม์
 */
function refreshMaterialData() {
    // เรียกใช้ฟังก์ชัน getMaterialList ที่อยู่ใน รหัส.gs
    google.script.run.withSuccessHandler(function(response) {
        if (response && response.success) {
            // 1. อัปเดตค่าสต็อกล่าสุดลงในตัวแปรส่วนกลางของหน้าบ้าน
            globalMaterialList = response.data;
            
            // 2. ค้นหาดร็อปดาวน์พัสดุทุกแถวในตารางกรอกข้อมูลตอนนี้ แล้วสั่งอัปเดตข้อความสต็อกใหม่ทั้งหมด
            const allSelects = document.querySelectorAll('table select');
            allSelects.forEach(selectEl => {
                const currentSelectedValue = selectEl.value; // จำค่าที่ผู้ใช้เลือกไว้ตอนนี้ก่อน
                
                // สั่งวาด Option ในดร็อปดาวน์นั้นใหม่ด้วยค่าสต็อกล่าสุด
                updateMaterialDropdown(selectEl);
                
                // ใส่ค่าที่เลือกกลับคืนไป (ป้องกันค่าหลุด)
                selectEl.value = currentSelectedValue;
            });
            console.log("🔄 อัปเดตยอดสต็อกในฟอร์มเรียบร้อยแล้ว!");
        }
    }).getMaterialList();
}
/**
 * 💡 เพิ่มฟังก์ชันนี้ใน Script.html เพื่อตรวจเช็คไม่ให้กรอกจำนวนเกินสต็อกจริง
 * ให้ผูกฟังก์ชันนี้กับ event 'oninput' หรือ 'onchange' ของช่องจำนวนเบิกพัสดุครับ
 */
function checkQuantityLimit(inputEl) {
    const row = inputEl.closest('tr');
    if (!row) return;
    
    const selectEl = row.querySelector('select'); // หาตัวดรอปดาวน์พัสดุในแถวนั้น
    if (!selectEl) return;
    
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (!selectedOption || selectEl.value === "") return;
    
    // ดึงจำนวนคงเหลือพัสดุชิ้นนี้ออกมา
    const maxStock = Number(selectedOption.getAttribute('data-stock') || 0);
    const enteredQty = Number(inputEl.value || 0);
    
    // ถ้ากรอกตัวเลขเป็นลบหรือเป็น 0
    if (enteredQty <= 0 && inputEl.value !== "") {
        alert("❌ กรุณากรอกจำนวนเบิกให้มากกว่า 0 ครับ");
        inputEl.value = "";
        return;
    }
    
    // 🔥 ดักจับถ้ากรอกจำนวนเบิกมากกว่าของที่มีอยู่ในคลัง
    if (enteredQty > maxStock) {
        alert(`❌ ไม่สามารถเบิกได้เนื่องจากจำนวนสินค้าไม่พอ\n(พัสดุชิ้นนี้คงเหลือในคลังเพียง ${maxStock} เท่านั้น)`);
        inputEl.value = maxStock; // บังคับรีเซ็ตตัวเลขให้เท่ากับจำนวนสูงสุดที่เบิกได้ทันที
    }
}
/**
 * ฟังก์ชันเพิ่มแถวรายการใหม่ (เวอร์ชันดร็อปดาวน์ - มีแค่อันนี้อันเดียวพอครับ!)
 */
function addNewRow() {
    rowCount++;
    const tbody = document.getElementById('itemsTableBody');
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td class="row-index">${rowCount}</td>
        <td>
            <select class="item-name" style="width:100%; padding:6px; border-radius:4px;" required onchange="onMaterialChange(this)">
                </select>
        </td>
        <td><input type="number" class="item-qty" min="1" required placeholder="0"></td>
        <td><input type="text" class="item-unit" required readonly placeholder="หน่วยนับ" style="background-color: #f3f4f6;"></td>
        <td><input type="text" class="item-code" readonly placeholder="รหัสวัสดุ" style="background-color: #f3f4f6;"></td>
        <td><input type="text" class="item-req-no" value="800000"></td>
        <td><input type="text" class="item-pay-no" value="490000"></td>
        <td><button type="button" class="btn-delete-row" onclick="deleteRow(this)">❌</button></td>
    `;
    tbody.appendChild(tr);
    
    // สั่งเติมข้อมูลสิ่งของลงในดร็อปดาวน์ของแถวใหม่ที่เพิ่งสร้างขึ้นมา
    const newSelect = tr.querySelector('.item-name');
    updateMaterialDropdown(newSelect);
}
// 💡 ฟังก์ชันสำหรับกดปุ่มแล้วดึงไฟล์ PDF รายการพัสดุมาโชว์ใน Modal
function openDriveFolder() {
    // 🚨 สำคัญมาก: ให้คู่หูนำ "ไอดีไฟล์ PDF" บน Google Drive มาวางแทนที่ตรงนี้ครับ
    // (วิธีหาไอดีไฟล์: ไปที่ลิงก์แชร์ของ PDF นั้น แล้วก๊อบปี้ข้อความรหัสยาวๆ ระหว่าง /d/ และ /view)
    const pdfFileId = "1qsFQ01jGrgofyYvxxxrJ6rOPYJyoIZBW"; 
    
    // แปลงโครงสร้างลิงก์ให้เป็นเวอร์ชันสำหรับฝังพรีวิว (Preview)
    const driveUrl = "https://drive.google.com/file/d/" + pdfFileId + "/preview";
    
    // ยิงลิงก์เข้าสู่ iframe และสั่งให้กล่อง Modal แสดงผลขึ้นมาทันที
    document.getElementById('driveIframe').src = driveUrl;
    document.getElementById('driveModal').style.display = 'flex';
}

// 💡 ฟังก์ชันสำหรับกดปิดกล่อง Modal
function closeDriveModal() {
    document.getElementById('driveModal').style.display = 'none';
    document.getElementById('driveIframe').src = ''; // เคลียร์หน้าเพจทิ้งเมื่อปิดเพื่อไม่ให้เปลืองเน็ต
}

</script>
