// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDDy_qWmMa1qWyz2C50h0SFd25ZN6Re6N0",
  authDomain: "invoices-a26f7.firebaseapp.com",
  projectId: "invoices-a26f7",
  storageBucket: "invoices-a26f7.firebasestorage.app",
  messagingSenderId: "104648548938",
  appId: "1:104648548938:web:7631ae5941fc3c20ab3cb3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// متغيرات DOM
const invoiceForm = document.getElementById('invoiceForm');
const itemsContainer = document.getElementById('itemsContainer');
const addItemBtn = document.getElementById('addItemBtn');
const totalAmountElement = document.getElementById('totalAmount');
const successAlert = document.getElementById('successAlert');

// إضافة عنصر جديد
addItemBtn.addEventListener('click', addItemRow);

// إرسال النموذج
invoiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (validateForm()) {
    const invoiceData = prepareInvoiceData();
    
    try {
      // حفظ في Firebase
      await db.collection('invoices').add(invoiceData);
      
      // محاولة المزامنة مع Google Sheets (مع التعامل مع الأخطاء)
      try {
        await syncWithGoogleSheets(invoiceData);
      } catch (googleError) {
        console.warn('فشلت مزامنة جوجل شيتس، لكن البيانات حفظت في Firebase:', googleError);
      }
      
      showSuccessMessage();
      resetForm();
    } catch (firebaseError) {
      console.error('Error:', firebaseError);
      alert('حدث خطأ أثناء حفظ البيانات في Firebase');
    }
  }
});

// وظائف مساعدة
function addItemRow() {
  const row = document.createElement('div');
  row.className = 'item-row row mb-3';
  row.innerHTML = `
    <div class="col-md-4">
      <input type="text" class="form-control item-name" placeholder="اسم المادة" required>
      <div class="error-message item-name-error">يجب إدخال اسم المادة</div>
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control item-quantity" placeholder="الكمية" min="1" required>
      <div class="error-message item-quantity-error">يجب إدخال الكمية</div>
    </div>
    <div class="col-md-2">
      <input type="number" step="0.01" class="form-control item-price" placeholder="السعر" required>
      <div class="error-message item-price-error">يجب إدخال السعر</div>
    </div>
    <div class="col-md-2">
      <input type="number" step="0.01" class="form-control item-total" placeholder="الإجمالي" readonly>
    </div>
    <div class="col-md-2 d-flex align-items-end">
      <button type="button" class="btn btn-danger remove-item">حذف</button>
    </div>
  `;
  itemsContainer.appendChild(row);
  
  // إضافة مستمعين للأحداث
  row.querySelector('.item-quantity').addEventListener('input', calculateRowTotal);
  row.querySelector('.item-price').addEventListener('input', calculateRowTotal);
  row.querySelector('.remove-item').addEventListener('click', () => {
    row.remove();
    calculateTotal();
  });
}

function calculateRowTotal(e) {
  const row = e.target.closest('.item-row');
  const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
  const price = parseFloat(row.querySelector('.item-price').value) || 0;
  const total = quantity * price;
  row.querySelector('.item-total').value = total.toFixed(2);
  calculateTotal();
}

function calculateTotal() {
  let total = 0;
  document.querySelectorAll('.item-total').forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  totalAmountElement.textContent = total.toFixed(2);
  document.getElementById('totalAmountInput').value = total.toFixed(2);
}

function validateForm() {
  let isValid = true;
  
  // التحقق من الحقول الأساسية
  const requiredFields = [
    { id: 'invoiceNumber', errorId: 'invoiceNumberError' },
    { id: 'invoiceDate', errorId: 'invoiceDateError' },
    { id: 'supplier', errorId: 'supplierError' }
  ];
  
  requiredFields.forEach(field => {
    const element = document.getElementById(field.id);
    const errorElement = document.getElementById(field.errorId);
    
    if (!element.value.trim()) {
      errorElement.style.display = 'block';
      element.style.borderColor = 'red';
      isValid = false;
    } else {
      errorElement.style.display = 'none';
      element.style.borderColor = '';
    }
  });
  
  // التحقق من المواد
  const itemRows = document.querySelectorAll('.item-row');
  if (itemRows.length === 0) {
    alert('يجب إضافة مادة واحدة على الأقل');
    return false;
  }
  
  itemRows.forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const quantity = row.querySelector('.item-quantity').value.trim();
    const price = row.querySelector('.item-price').value.trim();
    
    const nameError = row.querySelector('.item-name-error');
    const quantityError = row.querySelector('.item-quantity-error');
    const priceError = row.querySelector('.item-price-error');
    
    if (!name) {
      nameError.style.display = 'block';
      row.querySelector('.item-name').style.borderColor = 'red';
      isValid = false;
    } else {
      nameError.style.display = 'none';
      row.querySelector('.item-name').style.borderColor = '';
    }
    
    if (!quantity) {
      quantityError.style.display = 'block';
      row.querySelector('.item-quantity').style.borderColor = 'red';
      isValid = false;
    } else {
      quantityError.style.display = 'none';
      row.querySelector('.item-quantity').style.borderColor = '';
    }
    
    if (!price) {
      priceError.style.display = 'block';
      row.querySelector('.item-price').style.borderColor = 'red';
      isValid = false;
    } else {
      priceError.style.display = 'none';
      row.querySelector('.item-price').style.borderColor = '';
    }
  });
  
  return isValid;
}

function prepareInvoiceData() {
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    items.push({
      name: row.querySelector('.item-name').value,
      quantity: parseFloat(row.querySelector('.item-quantity').value),
      price: parseFloat(row.querySelector('.item-price').value),
      total: parseFloat(row.querySelector('.item-total').value)
    });
  });
  
  return {
    invoiceNumber: document.getElementById('invoiceNumber').value,
    invoiceDate: document.getElementById('invoiceDate').value,
    supplier: document.getElementById('supplier').value,
    totalAmount: parseFloat(totalAmountElement.textContent),
    items: items,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function syncWithGoogleSheets(data) {
  const scriptUrl = 'https://script.google.com/macros/s/AKfycby_7uC692B8rj7q1kNSW9H7e-2ocrdlrzBzZZU1SlPXp8pOJoFR1wgyRyDBMe88ku_5/exec';
  

  
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error; // نعيد الخطأ للتعامل معه في الدالة الرئيسية
  }
}

function showSuccessMessage() {
  successAlert.style.display = 'block';
  setTimeout(() => {
    successAlert.style.display = 'none';
  }, 5000);
}

function resetForm() {
  invoiceForm.reset();
  itemsContainer.innerHTML = '';
  totalAmountElement.textContent = '0.00';
  document.getElementById('totalAmountInput').value = '';
  
   // تحقق من وجود العنصر قبل تعيين القيمة
  const totalInput = document.getElementById('totalAmountInput');
  if (totalInput) {
    totalInput.value = '';
  }
  // إخفاء جميع رسائل الخطأ
  document.querySelectorAll('.error-message').forEach(el => {
    el.style.display = 'none';
  });
  
  // إعادة تعيين حدود الحقول
  document.querySelectorAll('input, select').forEach(el => {
    el.style.borderColor = '';
  });
  
  // إضافة صف مادة جديد بعد الإعادة
  addItemRow();
}

// إضافة صف مادة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
  // إضافة مستمع حدث لحساب المجموع عند تغيير أي حقل
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('item-quantity') || 
        e.target.classList.contains('item-price')) {
      calculateTotal();
    }
  });
  
  addItemRow();
});
