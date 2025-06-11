// app.js

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

function formatDateToDDMMYYYY(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

document.getElementById("addItemBtn").addEventListener("click", () => {
  const container = document.getElementById("itemsContainer");
  const div = document.createElement("div");
  div.className = "item-row row";
  div.innerHTML = `
    <div class="col-md-3">
      <input type="text" class="form-control" placeholder="اسم المادة" required />
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control" placeholder="الكمية" required />
    </div>
    <div class="col-md-2">
      <input type="number" step="0.01" class="form-control" placeholder="سعر الوحدة" required />
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control total-field" placeholder="الإجمالي" readonly />
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-danger remove-item">🗑️</button>
    </div>
  `;
  container.appendChild(div);
  attachListeners(div);
});

function attachListeners(row) {
  const [name, qty, price, total] = row.querySelectorAll("input");

  const updateTotal = () => {
    const quantity = parseFloat(qty.value) || 0;
    const unitPrice = parseFloat(price.value) || 0;
    const totalValue = quantity * unitPrice;
    total.value = totalValue.toFixed(2);
    calculateTotalAmount();
  };

  qty.addEventListener("input", updateTotal);
  price.addEventListener("input", updateTotal);

  row.querySelector(".remove-item").addEventListener("click", () => {
    row.remove();
    calculateTotalAmount();
  });
}

function calculateTotalAmount() {
  let total = 0;
  document.querySelectorAll(".total-field").forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  document.getElementById("totalAmount").textContent = total.toFixed(2);
  document.getElementById("totalAmountInput").value = total.toFixed(2);
}

document.getElementById("invoiceForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const invoiceDate = document.getElementById("invoiceDate").value;
  const supplier = document.getElementById("supplier").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const totalAmount = parseFloat(document.getElementById("totalAmountInput").value);

  const items = [];
  document.querySelectorAll("#itemsContainer .item-row").forEach(row => {
    const inputs = row.querySelectorAll("input");
    items.push({
      name: inputs[0].value,
      quantity: parseFloat(inputs[1].value),
      price: parseFloat(inputs[2].value),
      total: parseFloat(inputs[3].value)
    });
  });

  if (!invoiceDate || !supplier || items.length === 0 || isNaN(totalAmount)) {
    alert("يرجى تعبئة جميع الحقول بشكل صحيح.");
    return;
  }

  const formattedDate = formatDateToDDMMYYYY(invoiceDate);

  try {
    await db.collection("invoices").add({
      invoiceDate: invoiceDate,
      supplier: supplier,
      notes: notes,
      totalAmount: totalAmount,
      items: items,
      createdAt: new Date().toISOString()
    });
    document.getElementById("invoiceForm").reset();
    document.getElementById("itemsContainer").innerHTML = "";
    document.getElementById("totalAmount").textContent = "0.00";
    document.getElementById("successAlert").style.display = "block";
    setTimeout(() => {
      document.getElementById("successAlert").style.display = "none";
    }, 3000);
  } catch (error) {
    console.error("Error saving invoice:", error);
    alert("حدث خطأ أثناء الحفظ. يرجى المحاولة لاحقًا.");
  }
});
