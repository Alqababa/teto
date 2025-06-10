// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAEC782OWjcyI7uAcJ2oOvgFwav9jiThNg",
  authDomain: "new22-44c31.firebaseapp.com",
  databaseURL: "https://new22-44c31-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "new22-44c31",
  storageBucket: "new22-44c31.firebasestorage.app",
  messagingSenderId: "335133543637",
  appId: "1:335133543637:web:ddba6ee5cb6c0f48fba65c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// متغيرات DOM
const invoiceForm = document.getElementById('invoiceForm');
const itemsContainer = document.getElementById('itemsContainer');
const addItemBtn = document.getElementById('addItem');
const successAlert = document.getElementById('successAlert');

// إضافة عنصر جديد
addItemBtn.addEventListener('click', addNewItemRow);

// حساب الإجمالي تلقائياً
itemsContainer.addEventListener('input', function(e) {
    if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
        const row = e.target.closest('.item-row');
        calculateRowTotal(row);
    }
});

// حذف عنصر
itemsContainer.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-item')) {
        e.target.closest('.item-row').remove();
    }
});

// إرسال النموذج
invoiceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (validateForm()) {
        const invoiceData = prepareInvoiceData();
        
        try {
            // حفظ في Firebase
            await saveToFirebase(invoiceData);
            
            // إرسال إلى Google Script
            await sendToGoogleScript(invoiceData);
            
            // عرض رسالة النجاح
            showSuccessMessage();
            invoiceForm.reset();
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ أثناء حفظ البيانات');
        }
    }
});

// وظائف مساعدة
function addNewItemRow() {
    const newRow = document.createElement('div');
    newRow.className = 'item-row row mb-3';
    newRow.innerHTML = `
        <div class="col-md-4">
            <label class="form-label">اسم المادة</label>
            <input type="text" class="form-control item-name" required>
            <div class="error-message item-name-error">يجب إدخال اسم المادة</div>
        </div>
        <div class="col-md-2">
            <label class="form-label">الكمية</label>
            <input type="number" class="form-control item-quantity" required>
            <div class="error-message item-quantity-error">يجب إدخال الكمية</div>
        </div>
        <div class="col-md-2">
            <label class="form-label">سعر الوحدة</label>
            <input type="number" step="0.01" class="form-control item-price" required>
            <div class="error-message item-price-error">يجب إدخال سعر الوحدة</div>
        </div>
        <div class="col-md-2">
            <label class="form-label">الإجمالي</label>
            <input type="number" step="0.01" class="form-control item-total" readonly>
        </div>
        <div class="col-md-2 d-flex align-items-end">
            <button type="button" class="btn btn-danger remove-item">حذف</button>
        </div>
    `;
    itemsContainer.appendChild(newRow);
}

function calculateRowTotal(row) {
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const total = quantity * price;
    row.querySelector('.item-total').value = total.toFixed(2);
}

function validateForm() {
    let isValid = true;
    
    // التحقق من الحقول الأساسية
    const requiredFields = [
        { id: 'invoiceNumber', errorId: 'invoiceNumberError' },
        { id: 'invoiceDate', errorId: 'invoiceDateError' },
        { id: 'supplier', errorId: 'supplierError' },
        { id: 'totalAmount', errorId: 'totalAmountError' }
    ];
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        const errorElement = document.getElementById(field.errorId);
        
        if (!element.value.trim()) {
            errorElement.style.display = 'block';
            isValid = false;
        } else {
            errorElement.style.display = 'none';
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
            isValid = false;
        } else {
            nameError.style.display = 'none';
        }
        
        if (!quantity) {
            quantityError.style.display = 'block';
            isValid = false;
        } else {
            quantityError.style.display = 'none';
        }
        
        if (!price) {
            priceError.style.display = 'block';
            isValid = false;
        } else {
            priceError.style.display = 'none';
        }
    });
    
    return isValid;
}

function prepareInvoiceData() {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const supplier = document.getElementById('supplier').value;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    
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
        invoiceNumber,
        invoiceDate,
        supplier,
        totalAmount,
        items,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
}

async function saveToFirebase(data) {
    await db.collection('invoices').add(data);
}

async function sendToGoogleScript(data) {
    const scriptUrl = 'YOUR_GOOGLE_SCRIPT_URL';
    
    const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error('Failed to send data to Google Sheets');
    }
}

function showSuccessMessage() {
    successAlert.style.display = 'block';
    setTimeout(() => {
        successAlert.style.display = 'none';
    }, 5000);
}

// إضافة صف مادة عند التحميل
document.addEventListener('DOMContentLoaded', addNewItemRow);