/* ============================================
   Choco Box — Google Apps Script API
   ============================================
   
   عند أول تشغيل، شغّل دالة setupSheets() من القائمة العلوية
   لإنشاء الأوراق والأعمدة تلقائياً.
   
   أعمدة Google Sheet (ورقة "Products"):
   A: اسم المنتج
   B: سعر المنتج
   C: وصف المنتج
   D: تقييم المنتج
   E: رابط صورة المنتج (من قوقل درايف)
   F: تصنيف المنتج (الواح - بوكس - متفرقات)
   G: النكهات (مفصولة بفاصلة: شوكولاتة داكنة,بيضاء,كراميل)
   
   ============================================ */

// ── إعداد أولي: شغّل هذه الدالة مرة واحدة فقط ──
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- ورقة Products ---
  let productsSheet = ss.getSheetByName('Products');
  if (!productsSheet) {
    productsSheet = ss.insertSheet('Products');
  }
  
  // تحقق إذا الصف الأول فارغ (أي لم تُضف عناوين بعد)
  const firstCell = productsSheet.getRange('A1').getValue();
  if (!firstCell) {
    const headers = ['اسم المنتج', 'سعر المنتج', 'وصف المنتج', 'تقييم المنتج', 'رابط صورة المنتج', 'تصنيف المنتج', 'الحشوات', 'الوحدة'];
    productsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const headerRange = productsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a2c2a');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    
    productsSheet.setColumnWidth(1, 200);
    productsSheet.setColumnWidth(2, 120);
    productsSheet.setColumnWidth(3, 300);
    productsSheet.setColumnWidth(4, 120);
    productsSheet.setColumnWidth(5, 350);
    productsSheet.setColumnWidth(6, 150);
    productsSheet.setColumnWidth(7, 250);  // الحشوات
    productsSheet.setColumnWidth(8, 120);  // الوحدة
    
    const categoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['الواح', 'بوكس', 'متفرقات'])
      .setAllowInvalid(false)
      .build();
    productsSheet.getRange('F2:F1000').setDataValidation(categoryRule);
    
    productsSheet.setFrozenRows(1);
  }
  
  // --- ورقة Customers ---
  let customersSheet = ss.getSheetByName('Customers');
  if (!customersSheet) {
    customersSheet = ss.insertSheet('Customers');
  }
  const firstCustCell = customersSheet.getRange('A1').getValue();
  if (!firstCustCell) {
    const custHeaders = ['رقم الهاتف', 'الاسم', 'المحافظة', 'العنوان', 'تاريخ التسجيل'];
    customersSheet.getRange(1, 1, 1, custHeaders.length).setValues([custHeaders]);
    const custHeaderRange = customersSheet.getRange(1, 1, 1, custHeaders.length);
    custHeaderRange.setFontWeight('bold');
    custHeaderRange.setBackground('#4a2c2a');
    custHeaderRange.setFontColor('#ffffff');
    custHeaderRange.setHorizontalAlignment('center');
    customersSheet.setColumnWidth(1, 150);
    customersSheet.setColumnWidth(2, 200);
    customersSheet.setColumnWidth(3, 150);
    customersSheet.setColumnWidth(4, 300);
    customersSheet.setColumnWidth(5, 180);
    customersSheet.setFrozenRows(1);
  }
  
  // --- ورقة Orders ---
  let ordersSheet = ss.getSheetByName('Orders');
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet('Orders');
  }
  
  const firstOrderCell = ordersSheet.getRange('A1').getValue();
  if (!firstOrderCell) {
    const orderHeaders = ['رقم الطلب', 'الاسم', 'الهاتف', 'المحافظة', 'العنوان', 'المنتجات', 'المجموع', 'الحالة', 'التاريخ', 'موقع العميل', 'موقع الموصل', 'ملاحظات'];
    ordersSheet.getRange(1, 1, 1, orderHeaders.length).setValues([orderHeaders]);
    
    const headerRange = ordersSheet.getRange(1, 1, 1, orderHeaders.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a2c2a');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    
    // قائمة منسدلة لعمود الحالة
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['جديد', 'يُحضّر', 'في الطريق', 'تم التوصيل'])
      .setAllowInvalid(false)
      .build();
    ordersSheet.getRange('H2:H1000').setDataValidation(statusRule);
    
    ordersSheet.setColumnWidth(1, 120);  // رقم الطلب
    ordersSheet.setColumnWidth(2, 150);  // الاسم
    ordersSheet.setColumnWidth(3, 130);  // الهاتف
    ordersSheet.setColumnWidth(4, 120);  // المحافظة
    ordersSheet.setColumnWidth(5, 250);  // العنوان
    ordersSheet.setColumnWidth(6, 300);  // المنتجات
    ordersSheet.setColumnWidth(7, 100);  // المجموع
    ordersSheet.setColumnWidth(8, 120);  // الحالة
    ordersSheet.setColumnWidth(9, 180);  // التاريخ
    ordersSheet.setColumnWidth(10, 180); // موقع العميل
    ordersSheet.setColumnWidth(11, 180); // موقع الموصل
    ordersSheet.setColumnWidth(12, 200); // ملاحظات
    
    ordersSheet.setFrozenRows(1);
  }
  
  // حذف الورقة الافتراضية "Sheet1" إذا موجودة
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  SpreadsheetApp.getUi().alert('✅ تم إعداد الأوراق والأعمدة بنجاح!\n\nالآن أضف منتجاتك في ورقة Products ثم انشر التطبيق.');
}

// ── API ──
function doGet(e) {
  const action = e.parameter.action;
  let result;

  switch(action) {
    case 'getProducts':
      result = getProducts();
      break;
    case 'getOrderStatus':
      result = getOrderStatus(e.parameter.orderId, e.parameter.phone);
      break;
    case 'getCustomer':
      result = getCustomer(e.parameter.phone);
      break;
    case 'getMyOrders':
      result = getMyOrders(e.parameter.phone);
      break;
    default:
      result = { status: 'error', message: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let result;

  switch(data.action) {
    case 'addOrder':
      result = addOrder(data);
      break;
    case 'saveCustomer':
      result = saveCustomer(data);
      break;
    default:
      result = { status: 'error', message: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// -- Products --
function getProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Products');
  
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName('Products');
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return { status: 'success', products: [] };
  
  const headers = data[0];
  const products = [];

  // Map headers to indices
  const mapping = {};
  headers.forEach((h, idx) => {
    const header = String(h).trim();
    if (header === 'اسم المنتج') mapping.name = idx;
    else if (header === 'سعر المنتج') mapping.price = idx;
    else if (header === 'وصف المنتج') mapping.description = idx;
    else if (header === 'تقييم المنتج') mapping.rating = idx;
    else if (header === 'رابط صورة المنتج') mapping.image = idx;
    else if (header === 'تصنيف المنتج') mapping.category = idx;
    else if (header === 'الحشوات' || header === 'النكهات') mapping.fillings = idx;
    else if (header === 'الوحدة') mapping.unit = idx;
  });

  // Default mapping if headers are missing
  const m = {
    name: mapping.name ?? 0,
    price: mapping.price ?? 1,
    description: mapping.description ?? 2,
    rating: mapping.rating ?? 3,
    image: mapping.image ?? 4,
    category: mapping.category ?? 5,
    fillings: mapping.fillings ?? 6,
    unit: mapping.unit ?? 7
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[m.name] && !row[m.price]) continue;
    
    products.push({
      id: String(i),
      name: String(row[m.name] || ''),
      price: row[m.price] || 0,
      description: String(row[m.description] || ''),
      rating: String(row[m.rating] || '5.0'),
      image: String(row[m.image] || ''),
      category: String(row[m.category] || 'متفرقات'),
      fillings: row[m.fillings] ? String(row[m.fillings]).split(/[،,]/).map(f => f.trim()).filter(f => f) : [],
      unit: String(row[m.unit] || '')
    });
  }
  return { status: 'success', products };
}

// -- Orders --
function addOrder(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Orders');
  
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName('Orders');
  }
  
  // توليد رقم طلب فريد
  const orderId = 'CB' + Date.now().toString().slice(-6);
  
  sheet.appendRow([
    orderId,                              // A: رقم الطلب
    data.customerName,                    // B: الاسم
    data.customerPhone,                   // C: الهاتف
    data.governorate,                     // D: المحافظة
    data.address,                         // E: العنوان
    data.products,                        // F: المنتجات
    data.total,                           // G: المجموع
    'جديد',                               // H: الحالة
    new Date().toISOString(),             // I: التاريخ
    data.customerLocation || '',          // J: موقع العميل (lat,lng)
    '',                                   // K: موقع الموصل
    data.notes || ''                      // L: ملاحظات
  ]);
  
  return { status: 'success', orderId: orderId };
}

// -- Order Tracking --
function getOrderStatus(orderId, phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  if (!sheet) return { status: 'error', message: 'لا توجد طلبات' };
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]) === String(orderId) && String(row[2]) === String(phone)) {
      return {
        status: 'success',
        order: {
          orderId: row[0],
          customerName: row[1],
          phone: row[2],
          governorate: row[3],
          address: row[4],
          products: row[5],
          total: row[6],
          orderStatus: row[7],           // جديد / يُحضّر / في الطريق / تم التوصيل
          date: row[8],
          customerLocation: row[9],      // "lat,lng"
          deliveryLocation: row[10]      // "lat,lng"
        }
      };
    }
  }
  
  return { status: 'error', message: 'لم يتم العثور على الطلب. تحقق من رقم الطلب ورقم الهاتف.' };
}

// -- Customers --
function getCustomer(phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');
  if (!sheet) return { status: 'error', message: 'لا توجد بيانات' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(phone)) {
      return {
        status: 'success',
        customer: {
          phone: data[i][0],
          name: data[i][1],
          governorate: data[i][2],
          address: data[i][3]
        }
      };
    }
  }
  return { status: 'not_found' };
}

function saveCustomer(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Customers');
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName('Customers');
  }
  
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(data.phone)) {
      // Update existing
      sheet.getRange(i + 1, 2).setValue(data.name);
      if (data.governorate) sheet.getRange(i + 1, 3).setValue(data.governorate);
      if (data.address) sheet.getRange(i + 1, 4).setValue(data.address);
      return { status: 'success', message: 'تم تحديث البيانات' };
    }
  }
  
  // New customer
  sheet.appendRow([
    data.phone,
    data.name,
    data.governorate || '',
    data.address || '',
    new Date().toISOString()
  ]);
  return { status: 'success', message: 'تم التسجيل' };
}

// -- My Orders --
function getMyOrders(phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  if (!sheet) return { status: 'success', orders: [] };
  
  const data = sheet.getDataRange().getValues();
  const orders = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[2]) === String(phone)) {
      orders.push({
        orderId: row[0],
        products: row[5],
        total: row[6],
        orderStatus: row[7],
        date: row[8]
      });
    }
  }
  
  return { status: 'success', orders: orders.reverse() };
}
