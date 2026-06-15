/**
 * BSF BioManager - Backend API Serverless
 * 
 * Este script se publica como una Aplicación Web en Google Apps Script.
 * Proporciona una interfaz segura de 3 capas para evitar que los operarios
 * tengan acceso directo al Spreadsheet de base de datos o a la carpeta de fotos en Google Drive.
 * 
 * CONFIGURACIÓN DE PUBLICACIÓN:
 * - Ejecutar como: Mi cuenta (tu_usuario@gmail.com) [Propietario]
 * - Quién tiene acceso: Cualquiera (incluso anónimo/con Google)
 */

function doGet(e) {
  try {
    var action = e.parameter.action;
    var spreadsheetId = e.parameter.spreadsheetId;
    
    if (!spreadsheetId) {
      return JSONResponse({ success: false, error: "Falta el Spreadsheet ID" });
    }
    
    if (action === 'read') {
      var range = e.parameter.range;
      if (!range) return JSONResponse({ success: false, error: "Falta el parámetro range" });
      
      var values = SpreadsheetApp.openById(spreadsheetId).getRange(range).getValues();
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
    
    if (!spreadsheetId && action !== 'uploadImage') {
      return JSONResponse({ success: false, error: "Falta el Spreadsheet ID" });
    }
    
    // 1. APPEND ROW(S) TO SHEET
    if (action === 'append') {
      var range = payload.range;
      var values = payload.values;
      if (!range || !values || !values.length) {
        return JSONResponse({ success: false, error: "Rango o valores vacíos" });
      }
      
      var sheetName = range.split('!')[0];
      var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
      if (!sheet) return JSONResponse({ success: false, error: "Hoja no encontrada: " + sheetName });
      
      var lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
      } else {
        sheet.getRange(lastRow + 1, 1, values.length, values[0].length).setValues(values);
      }
      return JSONResponse({ success: true });
    }
    
    // 2. UPDATE CELL RANGE
    if (action === 'update') {
      var range = payload.range;
      var values = payload.values;
      if (!range || !values) return JSONResponse({ success: false, error: "Rango o valores vacíos" });
      
      SpreadsheetApp.openById(spreadsheetId).getRange(range).setValues(values);
      return JSONResponse({ success: true });
    }
    
    // 3. CLEAR CELL RANGE
    if (action === 'clear') {
      var range = payload.range;
      if (!range) return JSONResponse({ success: false, error: "Rango vacío" });
      
      SpreadsheetApp.openById(spreadsheetId).getRange(range).clearContent();
      return JSONResponse({ success: true });
    }
    
    // 4. UPLOAD IMAGE TO DRIVE (RECEIVE BASE64)
    if (action === 'uploadImage') {
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
      
      // Permitir acceso de visualización pública mediante el enlace
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return JSONResponse({ success: true, fileId: file.getId() });
    }

    // 5. DETERMINE ROLE (SERVER-SIDE VALIDATION)
    if (action === 'determineUserRole') {
      var email = payload.email.toLowerCase().trim();
      var name = payload.name;
      
      if (!email) return JSONResponse({ success: false, error: "Falta el Email del operario" });
      
      var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Usuarios');
      if (!sheet) return JSONResponse({ success: false, error: "Hoja de Usuarios no configurada" });
      
      var rows = sheet.getDataRange().getValues();
      
      // Si la tabla de usuarios está vacía (solo cabecera), registrar como Administrador
      if (rows.length <= 1) {
        sheet.appendRow([email, name, 'Administrador']);
        return JSONResponse({ success: true, role: 'Administrador' });
      }
      
      var role = 'Observador';
      var userFound = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toLowerCase().trim() === email) {
          role = rows[i][2] || 'Observador';
          userFound = true;
          break;
        }
      }
      
      // Registrar por defecto como observador si no estaba en la lista
      if (!userFound) {
        sheet.appendRow([email, name, 'Observador']);
      }
      
      return JSONResponse({ success: true, role: role });
    }
    
    return JSONResponse({ success: false, error: "Acción POST no válida o no implementada" });
  } catch (err) {
    return JSONResponse({ success: false, error: err.toString() });
  }
}

/**
 * Helper: Responder con cabeceras JSON limpias
 */
function JSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
