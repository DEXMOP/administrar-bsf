/**
 * BSF BioManager - Backend API Serverless
 * 
 * Este script se publica como una Aplicación Web en Google Apps Script.
 * Proporciona una interfaz segura de 3 capas con validación de JWT,
 * control de concurrencia mediante LockService, caché dinámico y auditoría.
 * 
 * CONFIGURACIÓN DE PUBLICACIÓN:
 * - Ejecutar como: Mi cuenta (tu_usuario@gmail.com) [Propietario]
 * - Quién tiene acceso: Cualquiera (incluso anónimo/con Google)
 */

function doGet(e) {
  try {
    var action = e.parameter.action;
    var spreadsheetId = e.parameter.spreadsheetId;
    var idToken = e.parameter.token;
    
    if (!spreadsheetId) {
      return JSONResponse({ success: false, error: "Falta el Spreadsheet ID" });
    }
    if (!idToken) {
      return JSONResponse({ success: false, error: "Falta el token de autenticación (JWT)" });
    }
    
    // 1. Decodificar JWT y verificar rol
    var userPayload = decodeJwt(idToken);
    if (!userPayload || !userPayload.email) {
      return JSONResponse({ success: false, error: "Token JWT inválido o expirado" });
    }
    
    var email = userPayload.email.toLowerCase().trim();
    var role = getUserRole(email, spreadsheetId);
    
    // 2. Procesar acción GET
    if (action === 'read') {
      var range = e.parameter.range;
      if (!range) return JSONResponse({ success: false, error: "Falta el parámetro range" });
      
      var sheetName = range.split('!')[0];
      var cacheKey = "CACHE_DATA_" + sheetName;
      
      // Intentar leer de caché determinista
      var cache = CacheService.getScriptCache();
      var cached = cache.get(cacheKey);
      if (cached) {
        return JSONResponse({ success: true, values: JSON.parse(cached) });
      }
      
      // Si no hay caché, leer de Google Sheets
      var values = SpreadsheetApp.openById(spreadsheetId).getRange(range).getValues();
      
      // Guardar en caché por 6 horas (21600 segundos)
      try {
        cache.put(cacheKey, JSON.stringify(values), 21600);
      } catch (cacheErr) {
        Logger.log("Error al escribir en caché " + cacheKey + ": " + cacheErr.toString());
      }
      
      return JSONResponse({ success: true, values: values });
    }
    
    return JSONResponse({ success: false, error: "Acción GET no válida o no implementada" });
  } catch (err) {
    return JSONResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var spreadsheetId = payload.spreadsheetId;
    var idToken = payload.token;
    
    if (!spreadsheetId && action !== 'uploadImage') {
      return JSONResponse({ success: false, error: "Falta el Spreadsheet ID" });
    }
    if (!idToken) {
      return JSONResponse({ success: false, error: "Falta el token de autenticación (JWT)" });
    }
    
    // 1. Decodificar JWT y verificar rol
    var userPayload = decodeJwt(idToken);
    if (!userPayload || !userPayload.email) {
      return JSONResponse({ success: false, error: "Token JWT inválido o expirado" });
    }
    
    var email = userPayload.email.toLowerCase().trim();
    var name = userPayload.name || "Usuario de Campo";
    var role = getUserRole(email, spreadsheetId);
    
    // Validar inicio de sesión/determinación de rol directo
    if (action === 'determineUserRole') {
      // Si la tabla de usuarios está vacía, registrar como Admin, sino devolver rol obtenido
      var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Usuarios');
      if (!sheet) return JSONResponse({ success: false, error: "Hoja de Usuarios no configurada" });
      
      var rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) {
        sheet.appendRow([email, name, 'Administrador']);
        // Limpiar caché de Usuarios
        CacheService.getScriptCache().remove("CACHE_DATA_Usuarios");
        return JSONResponse({ success: true, role: 'Administrador' });
      }
      
      // Si no existía el usuario, añadirlo como Observador
      var userFound = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toLowerCase().trim() === email) {
          role = rows[i][2] || 'Observador';
          userFound = true;
          break;
        }
      }
      if (!userFound) {
        sheet.appendRow([email, name, 'Observador']);
        role = 'Observador';
        // Limpiar caché de Usuarios
        CacheService.getScriptCache().remove("CACHE_DATA_Usuarios");
      }
      return JSONResponse({ success: true, role: role });
    }
    
    // 2. Control de accesos por roles (RBAC Server-Side)
    var range = payload.range;
    var sheetName = range ? range.split('!')[0] : '';
    
    if (action === 'append' || action === 'update' || action === 'clear') {
      if (!isActionAllowed(role, action, range, payload.values)) {
        return JSONResponse({ success: false, error: "Acceso denegado: Permisos insuficientes para realizar esta operación." });
      }
    }
    
    // 3. Auditoría Inmutable Server-Side (Zona Horaria Perú)
    if ((action === 'append' || action === 'update') && payload.values) {
      try {
        applyServerSideAuditing(sheetName, payload.values, role);
      } catch (auditErr) {
        return JSONResponse({ success: false, error: auditErr.message });
      }
    }
    
    // 4. Atomicidad y Concurrencia (LockService para Insumos)
    var isInventoryWrite = (sheetName === 'Insumos' && (action === 'append' || action === 'update'));
    var lock = LockService.getScriptLock();
    
    if (isInventoryWrite) {
      try {
        lock.waitLock(10000); // Bloqueo por hasta 10 segundos
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado (Lock Timeout). Por favor, reintente en unos instantes." });
      }
    }
    
    try {
      // Lógica de validación de Stock Negativo estricta en caliente
      if (isInventoryWrite && payload.values && payload.values.length > 0) {
        var insumosSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Insumos');
        var insumosData = insumosSheet.getDataRange().getValues();
        
        // Calcular stock actual en caliente
        var stockMap = {};
        for (var k = 1; k < insumosData.length; k++) {
          var insName = insumosData[k][3] ? insumosData[k][3].toString().toLowerCase().trim() : '';
          var insAct = insumosData[k][4] ? insumosData[k][4].toString().trim() : '';
          var insQty = parseFloat(insumosData[k][5]) || 0;
          if (insName) {
            if (!stockMap[insName]) stockMap[insName] = 0;
            if (insAct === 'Adición') stockMap[insName] += insQty;
            else if (insAct === 'Utilización') stockMap[insName] -= insQty;
          }
        }
        
        // Validar transacciones entrantes
        for (var i = 0; i < payload.values.length; i++) {
          var row = payload.values[i];
          var nameCheck = row[3] ? row[3].toString().toLowerCase().trim() : '';
          var actionCheck = row[4] ? row[4].toString().trim() : '';
          var qtyCheck = parseFloat(row[5]) || 0;
          
          if (actionCheck === 'Utilización' && nameCheck) {
            var currentStock = stockMap[nameCheck] || 0;
            if (currentStock - qtyCheck < 0) {
              return JSONResponse({ 
                success: false, 
                error: "Stock insuficiente para \"" + row[3] + "\". Disponible: " + currentStock.toFixed(2) + ", Solicitado: " + qtyCheck.toFixed(2) 
              });
            }
            stockMap[nameCheck] -= qtyCheck;
          }
        }
      }
      
      // Ejecución de escrituras
      var ss = SpreadsheetApp.openById(spreadsheetId);
      
      if (action === 'append') {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) return JSONResponse({ success: false, error: "Hoja no encontrada: " + sheetName });
        
        var lastRow = sheet.getLastRow();
        if (lastRow === 0) {
          sheet.getRange(1, 1, payload.values.length, payload.values[0].length).setValues(payload.values);
        } else {
          sheet.getRange(lastRow + 1, 1, payload.values.length, payload.values[0].length).setValues(payload.values);
        }
      }
      
      else if (action === 'update') {
        ss.getRange(range).setValues(payload.values);
      }
      
      else if (action === 'clear') {
        ss.getRange(range).clearContent();
      }
      
      else if (action === 'uploadImage') {
        var base64Data = payload.base64Data;
        var fileName = payload.fileName;
        var mimeType = payload.mimeType;
        var folderId = payload.folderId;
        
        if (!base64Data || !fileName || !mimeType || !folderId) {
          return JSONResponse({ success: false, error: "Faltan parámetros de imagen" });
        }
        
        var folder = DriveApp.getFolderById(folderId);
        var decodedBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        var file = folder.createFile(blob);
        
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return JSONResponse({ success: true, fileId: file.getId() });
      }
      
      // 5. Invalidación Determinista de Caché al escribir
      if (sheetName) {
        CacheService.getScriptCache().remove("CACHE_DATA_" + sheetName);
      }
      
      return JSONResponse({ success: true });
      
    } finally {
      if (isInventoryWrite) {
        lock.releaseLock();
      }
    }
  } catch (err) {
    return JSONResponse({ success: false, error: err.toString() });
  }
}

/**
 * Auxiliar: Decodificar payload de JWT sin librerías externas
 */
function decodeJwt(idToken) {
  if (!idToken) return null;
  var parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    var decodedPayload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString();
    var parsed = JSON.parse(decodedPayload);
    
    // Verificar expiración del token
    var nowSecs = Date.now() / 1000;
    if (parsed.exp && nowSecs > parsed.exp) {
      return null; // Token expirado
    }
    return parsed;
  } catch (err) {
    return null;
  }
}

/**
 * Auxiliar: Obtener rol del usuario en la base de datos
 */
function getUserRole(email, spreadsheetId) {
  try {
    var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Usuarios');
    if (!sheet) return 'Observador';
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].toLowerCase().trim() === email.toLowerCase().trim()) {
        return rows[i][2] || 'Observador';
      }
    }
    return 'Observador';
  } catch (e) {
    return 'Observador';
  }
}

/**
 * Auxiliar: Validar permisos de roles en el servidor (RBAC)
 */
function isActionAllowed(role, action, range, values) {
  if (role === 'Administrador' || role === 'Socio') {
    return true;
  }
  if (role === 'Observador') {
    return false;
  }
  if (role === 'Operario') {
    var sheetName = range.split('!')[0];
    // Operarios no pueden escribir libremente en la hoja de Finanzas
    if (sheetName === 'Finanzas') {
      if (values && values.length > 0) {
        for (var i = 0; i < values.length; i++) {
          var id = values[i][0] ? values[i][0].toString() : '';
          var desc = values[i][6] ? values[i][6].toString() : '';
          
          var isAutoInsumo = id.indexOf('FIN_') === 0 && id.indexOf('_SUP') !== -1;
          var isAutoMaquinaria = id.indexOf('TX_') === 0 && desc.indexOf('Compra de activo:') !== -1;
          
          if (!isAutoInsumo && !isAutoMaquinaria) {
            return false; // Bloquear escrituras manuales en finanzas
          }
        }
        return true;
      }
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Auxiliar: Registrar firma de auditoría inmutable en fechas retroactivas (Lima/Perú)
 */
function applyServerSideAuditing(sheetName, values, role) {
  var peruToday = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd");
  var sysDateTimeStr = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd HH:mm:ss");
  var auditTag = " \n[Ingreso al Sistema: " + sysDateTimeStr + "]";
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowDate = '';
    
    if (sheetName === 'Reportes') {
      rowDate = row[1] ? row[1].toString().substring(0, 10) : '';
      if (rowDate && rowDate < peruToday) {
        if (role !== 'Administrador') {
          throw new Error("Acceso denegado: Solo el Administrador puede registrar fechas atrasadas.");
        }
        row[2] = (row[2] || '') + auditTag;
      }
    } else if (sheetName === 'Finanzas') {
      rowDate = row[2] ? row[2].toString().substring(0, 10) : '';
      if (rowDate && rowDate < peruToday) {
        if (role !== 'Administrador') {
          throw new Error("Acceso denegado: Solo el Administrador puede registrar fechas atrasadas.");
        }
        row[6] = (row[6] || '') + auditTag;
      }
    } else if (sheetName === 'Maquinaria') {
      rowDate = row[2] ? row[2].toString().substring(0, 10) : '';
      if (rowDate && rowDate < peruToday) {
        if (role !== 'Administrador') {
          throw new Error("Acceso denegado: Solo el Administrador puede registrar fechas atrasadas.");
        }
        row[5] = (row[5] || '') + auditTag;
      }
    } else if (sheetName === 'Insumos') {
      rowDate = row[2] ? row[2].toString().substring(0, 10) : '';
      if (rowDate && rowDate < peruToday && role !== 'Administrador') {
        throw new Error("Acceso denegado: Solo el Administrador puede registrar fechas atrasadas.");
      }
    }
  }
}

/**
 * Responder con formato JSON limpio
 */
function JSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
