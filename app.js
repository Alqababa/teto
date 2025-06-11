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

// تقارير المورد (عرض مورد واحد كمجموع فقط + اختيار شهر)
async function getSupplierReport() {
  const supplierName = document.getElementById("supplierNameFilter").value.toLowerCase();
  const selectedMonth = document.getElementById("supplierMonthFilter").value; // صيغة YYYY-MM

  const snapshot = await db.collection("invoices").get();
  let totalSum = 0;
  let count = 0;
  let supplierLabel = "";

  snapshot.forEach(doc => {
    const d = doc.data();
    const invoiceMonth = new Date(d.invoiceDate);
    const invoiceMonthStr = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;

    if (
      d.supplier && d.supplier.toLowerCase().includes(supplierName) &&
      (!selectedMonth || invoiceMonthStr === selectedMonth)
    ) {
      totalSum += d.totalAmount;
      count++;
      supplierLabel = d.supplier;
    }
  });

  let html = `<table id="supplierTable" class='table table-bordered'>
    <thead>
      <tr>
        <th>اسم المورد</th>
        <th>عدد الفواتير</th>
        <th>إجمالي المبلغ</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${supplierLabel || "غير معروف"}</td>
        <td>${count}</td>
        <td>${totalSum.toFixed(2)} AED</td>
      </tr>
    </tbody>
  </table>`;

  html += `<button class='btn btn-outline-primary me-2' onclick="exportTableToExcel('supplierTable')">📥 تصدير Excel</button>`;
  html += `<button class='btn btn-outline-danger' onclick="exportTableToPDF('supplierTable')">📄 تصدير PDF</button>`;

  document.getElementById("supplierResults").innerHTML = html;
}
