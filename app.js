// app.js

// إعداد Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDDy_qWmMa1qWyz2C50h0SFd25ZN6Re6N0",
  authDomain: "invoices-a26f7.firebaseapp.com",
  projectId: "invoices-a26f7",
  storageBucket: "invoices-a26f7.firebasestorage.app",
  messagingSenderId: "104648548938",
  appId: "1:104648548938:web:7631ae5941fc3c20ab3cb3"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// تسجيل فاتورة
const form = document.getElementById("invoiceForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const invoiceDate = document.getElementById("invoiceDate").value;
  const supplier = document.getElementById("supplier").value;
  const notes = document.getElementById("notes").value;
  const items = [...document.querySelectorAll(".item-row")].map(row => ({
    name: row.querySelector(".item-name").value,
    quantity: parseFloat(row.querySelector(".item-qty").value),
    price: parseFloat(row.querySelector(".item-price").value),
    total: parseFloat(row.querySelector(".item-qty").value) * parseFloat(row.querySelector(".item-price").value),
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  await db.collection("invoices").add({
    supplier,
    invoiceDate,
    notes,
    items,
    totalAmount,
    createdAt: new Date().toISOString()
  });

  form.reset();
  document.getElementById("itemsContainer").innerHTML = "";
  document.getElementById("totalAmount").textContent = "0.00";
  document.getElementById("successAlert").style.display = "block";
});

// إضافة مادة جديدة
const addItemBtn = document.getElementById("addItemBtn");
addItemBtn.addEventListener("click", () => {
  const container = document.getElementById("itemsContainer");
  const itemRow = document.createElement("div");
  itemRow.classList.add("row", "item-row");
  itemRow.innerHTML = `
    <div class="col-md-4">
      <input type="text" class="form-control item-name" placeholder="اسم المادة" required />
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control item-qty" placeholder="الكمية" required />
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control item-price" placeholder="سعر المفرد" required />
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-danger remove-item">🗑️</button>
    </div>`;
  container.appendChild(itemRow);

  itemRow.querySelector(".remove-item").addEventListener("click", () => {
    itemRow.remove();
    updateTotal();
  });

  itemRow.querySelector(".item-qty").addEventListener("input", updateTotal);
  itemRow.querySelector(".item-price").addEventListener("input", updateTotal);
});

function updateTotal() {
  const items = [...document.querySelectorAll(".item-row")];
  let total = 0;
  items.forEach(row => {
    const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
    const price = parseFloat(row.querySelector(".item-price").value) || 0;
    total += qty * price;
  });
  document.getElementById("totalAmount").textContent = total.toFixed(2);
  document.getElementById("totalAmountInput").value = total.toFixed(2);
}

// تصدير جدول إلى Excel
function exportTableToExcel(tableId, filename = '') {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"});
  XLSX.writeFile(wb, filename || 'تقرير.xlsx');
}

// تصدير جدول إلى PDF
function exportTableToPDF(tableId) {
  const table = document.getElementById(tableId);
  const doc = new jspdf.jsPDF('p', 'pt', 'a4');
  doc.autoTable({ html: table });
  doc.save('تقرير.pdf');
}

// تقارير المورد (عرض جميع الموردين مع مجموع فواتيرهم + تصفية حسب الشهر)
async function getSupplierReport() {
  const supplierName = document.getElementById("supplierNameFilter").value.toLowerCase();
  const selectedMonth = document.getElementById("supplierMonthFilter")?.value; // صيغة YYYY-MM

  const snapshot = await db.collection("invoices").get();
  const suppliers = {};

  snapshot.forEach(doc => {
    const d = doc.data();
    const invoiceMonth = new Date(d.invoiceDate);
    const invoiceMonthStr = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;

    // إذا كان هناك تصفية بالشهر وتطابق اسم المورد (إن وجد)
    if ((!selectedMonth || invoiceMonthStr === selectedMonth) && 
        (!supplierName || (d.supplier && d.supplier.toLowerCase().includes(supplierName)))) {
      const supplierKey = d.supplier || "غير معروف";
      if (!suppliers[supplierKey]) {
        suppliers[supplierKey] = {
          count: 0,
          total: 0,
          invoices: []
        };
      }
      suppliers[supplierKey].count++;
      suppliers[supplierKey].total += d.totalAmount || 0;
      suppliers[supplierKey].invoices.push(d);
    }
  });

  let html = `<div class="mb-3">
    <label for="supplierMonthFilter">الشهر:</label>
    <input type="month" id="supplierMonthFilter" class="form-control mb-2" onchange="getSupplierReport()" />
    <button class="btn btn-secondary mb-2" onclick="document.getElementById('supplierMonthFilter').value = ''; getSupplierReport();">عرض الكل</button>
  </div>

  <table id="supplierTable" class='table table-bordered'>
    <thead>
      <tr>
        <th>اسم المورد</th>
        <th>عدد الفواتير</th>
        <th>إجمالي المبلغ</th>
        <th>تفاصيل</th>
      </tr>
    </thead>
    <tbody>`;

  // فرز الموردين حسب مجموع الفواتير (من الأكبر إلى الأصغر)
  const sortedSuppliers = Object.entries(suppliers).sort((a, b) => b[1].total - a[1].total);

  if (sortedSuppliers.length === 0) {
    html += `<tr><td colspan="4" class="text-center">لا توجد فواتير مطابقة للبحث</td></tr>`;
  } else {
    sortedSuppliers.forEach(([supplier, data]) => {
      html += `
        <tr>
          <td>${supplier}</td>
          <td>${data.count}</td>
          <td>${data.total.toFixed(2)} AED</td>
          <td><button class="btn btn-sm btn-info" onclick="showSupplierDetails('${supplier.replace(/'/g, "\\'")}')">عرض التفاصيل</button></td>
        </tr>`;
    });
  }

  html += `</tbody></table>`;

  html += `<div class="mt-3">
    <button class='btn btn-outline-primary me-2' onclick="exportTableToExcel('supplierTable')">📥 تصدير Excel</button>
    <button class='btn btn-outline-danger' onclick="exportTableToPDF('supplierTable')">📄 تصدير PDF</button>
  </div>`;

  document.getElementById("supplierResults").innerHTML = html;
}

// عرض تفاصيل فواتير مورد معين
async function showSupplierDetails(supplierName) {
  const selectedMonth = document.getElementById("supplierMonthFilter")?.value;
  
  const snapshot = await db.collection("invoices").where("supplier", "==", supplierName).get();
  let detailsHtml = `<div class="mb-3">
    <button class="btn btn-secondary" onclick="getSupplierReport()">← العودة للقائمة</button>
  </div>
  <h4 class="mb-3">تفاصيل فواتير المورد: ${supplierName}</h4>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>تاريخ الفاتورة</th>
          <th>الملاحظات</th>
          <th>عدد المواد</th>
          <th>المجموع</th>
        </tr>
      </thead>
      <tbody>`;
  
  let totalSum = 0;
  let count = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    const invoiceMonth = new Date(d.invoiceDate);
    const invoiceMonthStr = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;

    if (!selectedMonth || invoiceMonthStr === selectedMonth) {
      detailsHtml += `
        <tr>
          <td>${d.invoiceDate}</td>
          <td>${d.notes || '-'}</td>
          <td>${d.items.length}</td>
          <td>${(d.totalAmount || 0).toFixed(2)} AED</td>
        </tr>`;
      totalSum += d.totalAmount || 0;
      count++;
    }
  });

  detailsHtml += `
      </tbody>
      <tfoot>
        <tr class="table-info">
          <td colspan="2"><strong>المجموع</strong></td>
          <td>${count}</td>
          <td>${totalSum.toFixed(2)} AED</td>
        </tr>
      </tfoot>
    </table>`;
  
  document.getElementById("supplierResults").innerHTML = detailsHtml;
}

// تقرير المصاريف الشهرية
async function generateMonthlyReport() {
  const selectedMonth = document.getElementById("monthInput").value;
  
  if (!selectedMonth) {
    alert("الرجاء اختيار شهر");
    return;
  }

  const snapshot = await db.collection("invoices").get();
  const monthlyData = {};

  snapshot.forEach(doc => {
    const d = doc.data();
    const invoiceMonth = new Date(d.invoiceDate);
    const invoiceMonthStr = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;

    if (invoiceMonthStr === selectedMonth) {
      const supplier = d.supplier || "غير معروف";
      if (!monthlyData[supplier]) {
        monthlyData[supplier] = {
          count: 0,
          total: 0
        };
      }
      monthlyData[supplier].count++;
      monthlyData[supplier].total += d.totalAmount || 0;
    }
  });

  let html = `<h4 class="mb-3">تقرير مصاريف شهر ${selectedMonth}</h4>
    <table id="monthlyTable" class="table table-bordered">
      <thead>
        <tr>
          <th>اسم المورد</th>
          <th>عدد الفواتير</th>
          <th>إجمالي المبلغ</th>
        </tr>
      </thead>
      <tbody>`;

  const sortedData = Object.entries(monthlyData).sort((a, b) => b[1].total - a[1].total);
  let grandTotal = 0;
  let invoiceCount = 0;

  sortedData.forEach(([supplier, data]) => {
    html += `
      <tr>
        <td>${supplier}</td>
        <td>${data.count}</td>
        <td>${data.total.toFixed(2)} AED</td>
      </tr>`;
    grandTotal += data.total;
    invoiceCount += data.count;
  });

  html += `
      </tbody>
      <tfoot>
        <tr class="table-info">
          <td><strong>المجموع الكلي</strong></td>
          <td>${invoiceCount}</td>
          <td>${grandTotal.toFixed(2)} AED</td>
        </tr>
      </tfoot>
    </table>
    <div class="mt-3">
      <button class='btn btn-outline-primary me-2' onclick="exportTableToExcel('monthlyTable')">📥 تصدير Excel</button>
      <button class='btn btn-outline-danger' onclick="exportTableToPDF('monthlyTable')">📄 تصدير PDF</button>
    </div>`;

  document.getElementById("monthlyResults").innerHTML = html;
}
