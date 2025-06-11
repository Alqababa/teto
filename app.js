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

// تقارير المورد
async function getSupplierReport() {
  const supplierName = document.getElementById("supplierNameFilter").value.toLowerCase();
  const snapshot = await db.collection("invoices").get();
  let html = `<table class='table table-bordered'><thead><tr><th>المورد</th><th>التاريخ</th><th>المجموع</th></tr></thead><tbody>`;
  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.supplier && d.supplier.toLowerCase().includes(supplierName)) {
      html += `<tr><td>${d.supplier}</td><td>${d.invoiceDate}</td><td>${d.totalAmount.toFixed(2)} AED</td></tr>`;
    }
  });
  html += `</tbody></table>`;
  document.getElementById("supplierResults").innerHTML = html;
}

// تقرير المصاريف الشهرية
async function generateMonthlyReport() {
  const selectedMonth = document.getElementById("monthInput").value;
  if (!selectedMonth) return alert("يرجى اختيار شهر");

  const snapshot = await db.collection("invoices").get();
  const summary = {};

  snapshot.forEach(doc => {
    const d = doc.data();
    const date = new Date(d.invoiceDate);
    const month = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    const day = date.getDate();
    if (month === selectedMonth) {
      if (!summary[day]) summary[day] = 0;
      summary[day] += d.totalAmount;
    }
  });

  let html = `<table class='table table-striped'><thead><tr><th>اليوم</th><th>المجموع (AED)</th></tr></thead><tbody>`;
  for (const day in summary) {
    html += `<tr><td>${day}</td><td>${summary[day].toFixed(2)}</td></tr>`;
  }
  html += `</tbody></table>`;
  document.getElementById("monthlyResults").innerHTML = html;
}
