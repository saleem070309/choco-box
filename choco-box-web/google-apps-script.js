/**
 * ============================================
 * Choco Box — Google Apps Script
 * ============================================
 * 
 * تعليمات الإعداد:
 * 1. أنشئ Google Sheet جديد
 * 2. اذهب إلى Extensions → Apps Script
 * 3. احذف الكود الموجود والصق هذا الكود
 * 4. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. انسخ الرابط واستخدمه في الموقع
 * 
 * ملاحظة: الكود سيقوم بإنشاء الصفحات (Products, Orders, Settings) تلقائياً عند أول طلب.
 */

// ── Main Entry Point ──
function doGet(e) {
  try {
    setupSheets();
    const action = e.parameter.action;
    let result;

    switch(action) {
      case 'ping':
        result = { status: 'success', message: 'Pong! Script is alive and responding.' };
        break;
      case 'getProducts':
        result = getProducts();
        break;
      case 'getOrders':
        result = getOrders();
        break;
      case 'trackOrders':
        result = trackOrders(e.parameter);
        break;
      default:
        result = { status: 'error', message: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    setupSheets();
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON body: ' + err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let result;

    switch(data.action) {
      case 'addProduct':
        result = addProduct(data);
        break;
      case 'updateProduct':
        result = updateProduct(data);
        break;
      case 'deleteProduct':
        result = deleteProduct(data);
        break;
      case 'addOrder':
        result = addOrder(data);
        break;
      case 'updateOrder':
        result = updateOrder(data);
        break;
      case 'login':
        result = login(data);
        break;
      case 'saveChat':
        result = saveChat(data);
        break;
      default:
        result = { status: 'error', message: 'Unknown POST action: ' + data.action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Server Side Error: ' + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Products ──
function getProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue; // Skip empty rows
    
    products.push({
      id: row[0] || i,
      name: row[1] || '',
      price: row[2] || 'اسأل عن السعر',
      image: row[3] || '',
      description: row[4] || '',
      category: row[5] || '',
      available: row[6] !== false && row[6] !== 'false' && row[6] !== 'FALSE'
    });
  }

  return { status: 'success', products };
}

function addProduct(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 0 ? lastRow : 1;

  sheet.appendRow([
    newId,
    data.name || '',
    data.price || 'اسأل عن السعر',
    data.image || '',
    data.description || '',
    data.category || '',
    data.available !== false
  ]);

  return { status: 'success', id: newId };
}

function updateProduct(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][0]) === String(data.id)) {
      const row = i + 1;
      if (data.name) sheet.getRange(row, 2).setValue(data.name);
      if (data.price) sheet.getRange(row, 3).setValue(data.price);
      if (data.image !== undefined) sheet.getRange(row, 4).setValue(data.image);
      if (data.description !== undefined) sheet.getRange(row, 5).setValue(data.description);
      if (data.category !== undefined) sheet.getRange(row, 6).setValue(data.category);
      if (data.available !== undefined) sheet.getRange(row, 7).setValue(data.available);
      
      return { status: 'success' };
    }
  }

  return { status: 'error', message: 'Product not found' };
}

function deleteProduct(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }

  return { status: 'error', message: 'Product not found' };
}

// ── Orders ──
function getOrders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  const orders = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;

    orders.push({
      id: row[0] || i,
      customerName: row[1] || '',
      customerPhone: row[2] || '',
      productName: row[3] || '',
      details: row[4] || '',
      status: row[5] || 'جديد',
      date: row[6] || ''
    });
  }

  // Return newest first
  orders.reverse();
  return { status: 'success', orders };
}

function addOrder(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 0 ? lastRow : 1;

  sheet.appendRow([
    newId,
    data.customerName || '',
    data.customerPhone || '',
    data.productName || '',
    data.details || '',
    data.status || 'جديد',
    data.date || new Date().toISOString()
  ]);

  return { status: 'success', id: newId };
}

function updateOrder(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][0]) === String(data.id)) {
      if (data.status) sheet.getRange(i + 1, 6).setValue(data.status);
      return { status: 'success' };
    }
  }

  return { status: 'error', message: 'Order not found' };
}

function trackOrders(params) {
  if (!params.phone) return { status: 'error', message: 'Phone number required' };
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if (!sheet) return { status: 'error', message: 'Orders sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const phone = String(params.phone).trim();
  const orders = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[2]).trim() === phone) {
      orders.push({
        id: row[0],
        productName: row[3],
        status: row[5],
        date: row[6]
      });
    }
  }

  orders.reverse(); // newest first
  return { status: 'success', orders };
}

// ── Chats ──
function saveChat(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Chats');
  if (!sheet) return { status: 'error', message: 'Chats sheet not found' };

  sheet.appendRow([
    data.sessionId || 'Unknown',
    data.sender || 'Unknown',
    data.message || '',
    new Date().toLocaleString('ar-JO')
  ]);

  return { status: 'success' };
}

// ── Auth ──
function login(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 0; i < dataRange.length; i++) {
    if (dataRange[i][0] === 'adminPassword') {
      if (dataRange[i][1] === data.password) {
        return { status: 'success' };
      } else {
        return { status: 'error', message: 'Wrong password' };
      }
    }
  }

  // Default password if not set in sheet
  if (data.password === 'choco2026') {
    return { status: 'success' };
  }

  return { status: 'error', message: 'Wrong password' };
}

// ── Setup ──
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsConfig = {
    'Products': ['id', 'name', 'price', 'imageLight', 'imageDark', 'description', 'category', 'available'],
    'Orders': ['id', 'customerName', 'customerPhone', 'location', 'productName', 'details', 'status', 'date'],
    'Chats': ['sessionId', 'sender', 'message', 'date'],
    'Settings': ['key', 'value']
  };
  
  for (let name in sheetsConfig) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    
    const expectedHeaders = sheetsConfig[name];
    let currentHeaders = [];
    
    if (sheet.getLastRow() > 0) {
      currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    } else {
      sheet.appendRow(expectedHeaders);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
      // Auto-populate default settings if needed
      if (name === 'Settings') {
        sheet.appendRow(['adminPassword', 'choco2026']);
      }
      continue;
    }
    
    // Add missing columns if schema changed
    expectedHeaders.forEach(header => {
      if (currentHeaders.indexOf(header) === -1) {
        const nextCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextCol).setValue(header);
        currentHeaders.push(header);
      }
    });

    // Apply formatting to all headers (including newly added ones)
    sheet.getRange(1, 1, 1, currentHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");

    // Auto-populate default settings if needed (only if sheet was not empty initially and settings are missing)
    if (name === 'Settings') {
      let adminPasswordFound = false;
      for (let i = 0; i < sheet.getLastRow(); i++) {
        if (sheet.getRange(i + 1, 1).getValue() === 'adminPassword') {
          adminPasswordFound = true;
          break;
        }
      }
      if (!adminPasswordFound) {
        sheet.appendRow(['adminPassword', 'choco2026']);
      }
    }
  }
  
  // Remove default "Sheet1" if it's empty and we have other sheets
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}
