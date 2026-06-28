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
    setupWeatherTrigger();
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
      var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Usuarios');
      if (!sheet) return JSONResponse({ success: false, error: "Hoja de Usuarios no configurada" });
      
      var rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) {
        sheet.appendRow([email, name, 'Administrador']);
        CacheService.getScriptCache().remove("CACHE_DATA_Usuarios");
        return JSONResponse({ success: true, role: 'Administrador' });
      }
      
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
        CacheService.getScriptCache().remove("CACHE_DATA_Usuarios");
      }
      return JSONResponse({ success: true, role: role });
    }
    
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sysDateTimeStr = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd HH:mm:ss");

    // ==========================================
    // ACCIÓN: manage_asset (Solo Operario/Socio/Admin)
    // ==========================================
    if (action === 'manage_asset') {
      if (role === 'Observador') {
        return JSONResponse({ success: false, error: "Acceso denegado: Permisos insuficientes." });
      }
      
      var assetIds = payload.assetIds;
      var operation = payload.operation; // 'Alta' o 'Baja'
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return JSONResponse({ success: false, error: "Faltan IDs de bandeja" });
      }
      
      var camSheet = ss.getSheetByName('Camas');
      if (!camSheet) return JSONResponse({ success: false, error: "Hoja Camas no encontrada" });
      
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado. Intente de nuevo." });
      }
      
      try {
        var data = camSheet.getDataRange().getValues();
        var idMap = {};
        for (var i = 1; i < data.length; i++) {
          idMap[data[i][0].toString().trim()] = i + 1; // row index (1-based)
        }
        
        if (operation === 'Alta') {
          var newRows = [];
          for (var j = 0; j < assetIds.length; j++) {
            var aId = assetIds[j].toString().trim();
            if (idMap[aId]) {
              // Si estaba de baja o inactivo, lo reactiva a Disponible
              var rowIdx = idMap[aId];
              camSheet.getRange(rowIdx, 2, 1, 3).setValues([['Disponible', '', '']]);
            } else {
              newRows.push([aId, 'Disponible', '', '']);
            }
          }
          if (newRows.length > 0) {
            camSheet.getRange(camSheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
          }
        } else if (operation === 'Baja') {
          for (var j = 0; j < assetIds.length; j++) {
            var aId = assetIds[j].toString().trim();
            if (!idMap[aId]) {
              return JSONResponse({ success: false, error: "La bandeja " + aId + " no existe en el inventario." });
            }
            var rowIdx = idMap[aId];
            var currentStatus = camSheet.getRange(rowIdx, 2).getValue().toString().trim();
            if (currentStatus === 'En Servicio') {
              return JSONResponse({ success: false, error: "La bandeja " + aId + " está 'En Servicio' y no se puede dar de baja." });
            }
            camSheet.getRange(rowIdx, 2, 1, 3).setValues([['Baja', '', '']]);
          }
        } else {
          return JSONResponse({ success: false, error: "Operación no válida: " + operation });
        }
        
        CacheService.getScriptCache().remove("CACHE_DATA_Camas");
        return JSONResponse({ success: true });
      } finally {
        lock.releaseLock();
      }
    }

    // ==========================================
    // ACCIÓN: start_batch (Operario/Socio/Admin)
    // ==========================================
    if (action === 'start_batch') {
      if (role === 'Observador') {
        return JSONResponse({ success: false, error: "Acceso denegado: Permisos insuficientes." });
      }
      
      var assetIds = payload.assetIds;
      var grupo = payload.grupo;
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return JSONResponse({ success: false, error: "Faltan bandejas para armar el lote." });
      }
      if (!grupo) {
        return JSONResponse({ success: false, error: "Falta el nombre del grupo/lote." });
      }
      
      var camSheet = ss.getSheetByName('Camas');
      if (!camSheet) return JSONResponse({ success: false, error: "Hoja Camas no encontrada" });
      
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado. Intente de nuevo." });
      }
      
      try {
        var data = camSheet.getDataRange().getValues();
        var idMap = {};
        for (var i = 1; i < data.length; i++) {
          idMap[data[i][0].toString().trim()] = { row: i + 1, estado: data[i][1].toString().trim() };
        }
        
        // Validación en caliente: Verificar que todas las bandejas sigan Disponibles
        for (var j = 0; j < assetIds.length; j++) {
          var aId = assetIds[j].toString().trim();
          if (!idMap[aId]) {
            return JSONResponse({ success: false, error: "La bandeja " + aId + " no existe." });
          }
          if (idMap[aId].estado !== 'Disponible') {
            // Retornar error HTTP 400 (simulado en JSONResponse)
            return JSONResponse({ success: false, error: "Colisión: La bandeja " + aId + " ya no está disponible (Estado: " + idMap[aId].estado + ")." });
          }
        }
        
        // Iniciar Lote y generar Ciclo_ID
        var timestamp = Date.now();
        var cleanGrupo = grupo.replace(/[^a-zA-Z0-9]/g, '_');
        var cicloId = cleanGrupo + "-" + timestamp;
        
        // Actualizar hoja Camas
        for (var j = 0; j < assetIds.length; j++) {
          var aId = assetIds[j].toString().trim();
          var rowIdx = idMap[aId].row;
          camSheet.getRange(rowIdx, 2, 1, 3).setValues([['En Servicio', grupo, cicloId]]);
        }
        
        // Escribir en Registro_Etapas
        var stageSheet = ss.getSheetByName('Registro_Etapas');
        if (stageSheet) {
          var stageRows = [];
          for (var j = 0; j < assetIds.length; j++) {
            stageRows.push([
              "STAGE_" + timestamp + "_" + Math.floor(Math.random()*1000) + "_" + j,
              assetIds[j].toString().trim(),
              sysDateTimeStr,
              "Disponible",
              "Neonatos",
              "Inicio de lote " + grupo + " (" + cicloId + ")",
              name
            ]);
          }
          stageSheet.getRange(stageSheet.getLastRow() + 1, 1, stageRows.length, 7).setValues(stageRows);
          CacheService.getScriptCache().remove("CACHE_DATA_Registro_Etapas");
        }
        
        CacheService.getScriptCache().remove("CACHE_DATA_Camas");
        return JSONResponse({ success: true, cicloId: cicloId });
      } finally {
        lock.releaseLock();
      }
    }

    // ==========================================
    // ACCIÓN: close_batch (Operario/Socio/Admin)
    // ==========================================
    if (action === 'close_batch') {
      if (role === 'Observador') {
        return JSONResponse({ success: false, error: "Acceso denegado: Permisos insuficientes." });
      }
      
      var cicloId = payload.cicloId;
      var biomasaCosechada = parseFloat(payload.biomasaCosechada) || 0;
      
      if (!cicloId) {
        return JSONResponse({ success: false, error: "Falta el Ciclo ID" });
      }
      
      var camSheet = ss.getSheetByName('Camas');
      if (!camSheet) return JSONResponse({ success: false, error: "Hoja Camas no encontrada" });
      
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado. Intente de nuevo." });
      }
      
      try {
        var data = camSheet.getDataRange().getValues();
        var traysToRelease = [];
        var grupo = '';
        
        for (var i = 1; i < data.length; i++) {
          if (data[i][3] && data[i][3].toString().trim() === cicloId) {
            traysToRelease.push({ row: i + 1, id: data[i][0] });
            if (!grupo) grupo = data[i][2];
          }
        }
        
        if (traysToRelease.length === 0) {
          return JSONResponse({ success: false, error: "No se encontraron bandejas activas para el ciclo: " + cicloId });
        }
        
        // Sumar todos los kilos de alimento suministrados a este Ciclo_ID de Registro_Alimentacion
        var totalAlimento = 0;
        var alimSheet = ss.getSheetByName('Registro_Alimentacion');
        if (alimSheet) {
          var alimData = alimSheet.getDataRange().getValues();
          for (var m = 1; m < alimData.length; m++) {
            if (alimData[m][8] && alimData[m][8].toString().trim() === cicloId) {
              totalAlimento += parseFloat(alimData[m][5]) || 0;
            }
          }
        }
        
        // Obtener fecha de inicio desde Registro_Etapas
        var fechaInicio = '';
        var stageSheet = ss.getSheetByName('Registro_Etapas');
        if (stageSheet) {
          var stageData = stageSheet.getDataRange().getValues();
          for (var n = 1; n < stageData.length; n++) {
            var obs = stageData[n][5] ? stageData[n][5].toString() : '';
            if (obs.indexOf(cicloId) !== -1) {
              fechaInicio = stageData[n][2];
              break;
            }
          }
        }
        if (!fechaInicio) {
          var parts = cicloId.split('-');
          var ts = parseInt(parts[parts.length - 1]);
          if (!isNaN(ts)) {
            fechaInicio = Utilities.formatDate(new Date(ts), "America/Lima", "yyyy-MM-dd HH:mm:ss");
          } else {
            fechaInicio = sysDateTimeStr;
          }
        }
        
        // Guardar registro histórico en Historico_Ciclos
        var histSheet = ss.getSheetByName('Historico_Ciclos');
        if (!histSheet) {
          ss.insertSheet('Historico_Ciclos');
          histSheet = ss.getSheetByName('Historico_Ciclos');
          histSheet.appendRow(['Ciclo_ID', 'Grupo', 'Bandejas_IDs', 'Fecha_Inicio', 'Fecha_Cierre', 'Alimento_Consumido_Kg', 'Biomasa_Cosechada_Kg', 'Usuario']);
        }
        var trayIdsList = traysToRelease.map(function(t) { return t.id; }).join(', ');
        histSheet.appendRow([cicloId, grupo || 'Sin Grupo', trayIdsList, fechaInicio, sysDateTimeStr, totalAlimento, biomasaCosechada, name]);
        
        // Escribir en Registro_Etapas el fin del ciclo
        if (stageSheet) {
          var stageRows = [];
          var nowTs = Date.now();
          for (var k = 0; k < traysToRelease.length; k++) {
            stageRows.push([
              "STAGE_" + nowTs + "_" + Math.floor(Math.random()*1000) + "_" + k,
              traysToRelease[k].id,
              sysDateTimeStr,
              "En Servicio",
              "Disponible",
              "Lote cerrado y cosechado (" + cicloId + "). Cosecha: " + biomasaCosechada.toFixed(2) + " kg. Alimento: " + totalAlimento.toFixed(2) + " kg.",
              name
            ]);
          }
          stageSheet.getRange(stageSheet.getLastRow() + 1, 1, stageRows.length, 7).setValues(stageRows);
          CacheService.getScriptCache().remove("CACHE_DATA_Registro_Etapas");
        }
        
        // Libera las bandejas: vuelven a Disponible, limpia grupo y ciclo
        for (var k = 0; k < traysToRelease.length; k++) {
          camSheet.getRange(traysToRelease[k].row, 2, 1, 3).setValues([['Disponible', '', '']]);
        }
        
        CacheService.getScriptCache().remove("CACHE_DATA_Camas");
        CacheService.getScriptCache().remove("CACHE_DATA_Historico_Ciclos");
        return JSONResponse({ success: true });
      } finally {
        lock.releaseLock();
      }
    }

    // ==========================================
    // ACCIÓN: transfer_asset (Operario/Socio/Admin)
    // ==========================================
    if (action === 'transfer_asset') {
      if (role === 'Observador') {
        return JSONResponse({ success: false, error: "Acceso denegado: Permisos insuficientes." });
      }
      
      var oldAssetId = payload.oldAssetId;
      var newAssetId = payload.newAssetId;
      var discardOld = payload.discardOld;
      
      if (!oldAssetId || !newAssetId) {
        return JSONResponse({ success: false, error: "Faltan las bandejas origen o destino." });
      }
      
      var camSheet = ss.getSheetByName('Camas');
      if (!camSheet) return JSONResponse({ success: false, error: "Hoja Camas no encontrada" });
      
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado. Intente de nuevo." });
      }
      
      try {
        var data = camSheet.getDataRange().getValues();
        var oldRowIdx = -1;
        var newRowIdx = -1;
        
        var oldGroup = '';
        var oldCicloId = '';
        var oldEstado = '';
        
        for (var i = 1; i < data.length; i++) {
          var idStr = data[i][0].toString().trim();
          if (idStr === oldAssetId.toString().trim()) {
            oldRowIdx = i + 1;
            oldEstado = data[i][1].toString().trim();
            oldGroup = data[i][2] || 'Sin Grupo';
            oldCicloId = data[i][3] || '';
          }
          if (idStr === newAssetId.toString().trim()) {
            newRowIdx = i + 1;
            var newEstado = data[i][1].toString().trim();
            if (newEstado !== 'Disponible') {
              return JSONResponse({ success: false, error: "La tina destino " + newAssetId + " ya no está Disponible (Estado: " + newEstado + ")" });
            }
          }
        }
        
        if (oldRowIdx === -1) {
          return JSONResponse({ success: false, error: "La tina de origen " + oldAssetId + " no existe." });
        }
        if (newRowIdx === -1) {
          return JSONResponse({ success: false, error: "La tina de destino " + newAssetId + " no existe." });
        }
        if (oldEstado !== 'En Servicio') {
          return JSONResponse({ success: false, error: "La tina de origen " + oldAssetId + " no está En Servicio." });
        }
        
        // Realizar Traspaso en la hoja Camas
        // 1. Asignar el lote y el ciclo a la nueva tina
        camSheet.getRange(newRowIdx, 2, 1, 3).setValues([['En Servicio', oldGroup, oldCicloId]]);
        
        // 2. Liberar o dar de baja la tina de origen
        var oldNewEstado = discardOld ? 'Baja' : 'Disponible';
        camSheet.getRange(oldRowIdx, 2, 1, 3).setValues([[oldNewEstado, '', '']]);
        
        // 3. Escribir en Registro_Etapas
        var stageSheet = ss.getSheetByName('Registro_Etapas');
        if (stageSheet) {
          var timestamp = Date.now();
          
          // Registro para la tina de origen
          var logOld = [
            "STAGE_" + timestamp + "_" + Math.floor(Math.random()*1000) + "_old",
            oldAssetId,
            sysDateTimeStr,
            "En Servicio",
            oldNewEstado,
            "Traspaso de contenido realizado a tina " + newAssetId + " (Ciclo: " + oldCicloId + ")",
            name
          ];
          
          // Registro para la tina de destino
          var logNew = [
            "STAGE_" + timestamp + "_" + Math.floor(Math.random()*1000) + "_new",
            newAssetId,
            sysDateTimeStr,
            "Disponible",
            "En Servicio",
            "Traspaso recibido de tina " + oldAssetId + " (Ciclo: " + oldCicloId + ")",
            name
          ];
          
          stageSheet.appendRow(logOld);
          stageSheet.appendRow(logNew);
          CacheService.getScriptCache().remove("CACHE_DATA_Registro_Etapas");
        }
        
        CacheService.getScriptCache().remove("CACHE_DATA_Camas");
        return JSONResponse({ success: true });
        
      } finally {
        lock.releaseLock();
      }
    }

    // ==========================================
    // ACCIÓN: sync_weather (Cualquier Rol)
    // ==========================================
    if (action === 'sync_weather') {
      cronFetchWeather();
      return JSONResponse({ success: true });
    }

    // ==========================================
    // ACCIÓN: add_clima (Operario/Socio/Admin)
    // ==========================================
    if (action === 'add_clima') {
      if (role === 'Observador') {
        return JSONResponse({ success: false, error: "Acceso denegado: Permisos insuficientes." });
      }
      
      var temp = parseFloat(payload.temp);
      var hum = parseFloat(payload.hum);
      var obs = payload.obs || '';
      
      if (isNaN(temp) || isNaN(hum)) {
        return JSONResponse({ success: false, error: "Temperatura y humedad deben ser valores numéricos válidos." });
      }
      
      var climaSheet = ss.getSheetByName('Clima');
      if (!climaSheet) {
        climaSheet = ss.insertSheet('Clima');
        climaSheet.appendRow(['ID_Registro', 'Fecha_Hora', 'Temperatura', 'Humedad', 'Origen', 'Observacion']);
      }
      
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado. Intente de nuevo." });
      }
      
      try {
        var id = "WEATHER_" + Date.now();
        var sysDateTimeStr = Utilities.formatDate(new Date(), "America/Lima", "yyyy-MM-dd HH:mm:ss");
        
        climaSheet.appendRow([id, sysDateTimeStr, temp, hum, 'Manual - Planta', obs]);
        CacheService.getScriptCache().remove("CACHE_DATA_Clima");
        return JSONResponse({ success: true });
      } finally {
        lock.releaseLock();
      }
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
        lock.waitLock(10000);
      } catch (lockErr) {
        return JSONResponse({ success: false, error: "Servidor ocupado (Lock Timeout). Por favor, reintente en unos instantes." });
      }
    }
    
    try {
      if (isInventoryWrite && payload.values && payload.values.length > 0) {
        var insumosSheet = ss.getSheetByName('Insumos');
        var insumosData = insumosSheet.getDataRange().getValues();
        
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
      
      if (action === 'append') {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) return JSONResponse({ success: false, error: "Hoja no encontrada: " + sheetName });
        
        var values = payload.values;
        // Inyectar Ciclo_ID si viene en el payload y no está en la fila
        if (sheetName === 'Registro_Alimentacion' || sheetName === 'Reportes') {
          var cicloId = payload.cicloId || '';
          var colCount = sheetName === 'Registro_Alimentacion' ? 9 : 7;
          for (var i = 0; i < values.length; i++) {
            var row = values[i];
            if (row.length < colCount) {
              while (row.length < colCount - 1) {
                row.push('');
              }
              row.push(cicloId);
            } else if (!row[colCount - 1] && cicloId) {
              row[colCount - 1] = cicloId;
            }
          }
        }
        
        var lastRow = sheet.getLastRow();
        if (lastRow === 0) {
          sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
        } else {
          sheet.getRange(lastRow + 1, 1, values.length, values[0].length).setValues(values);
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

function decodeJwt(idToken) {
  if (!idToken) return null;
  var parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    var decodedPayload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString();
    var parsed = JSON.parse(decodedPayload);
    
    var nowSecs = Date.now() / 1000;
    if (parsed.exp && nowSecs > parsed.exp) {
      return null;
    }
    return parsed;
  } catch (err) {
    return null;
  }
}

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

function isActionAllowed(role, action, range, values) {
  if (role === 'Administrador' || role === 'Socio') {
    return true;
  }
  if (role === 'Observador') {
    return false;
  }
  if (role === 'Operario') {
    var sheetName = range.split('!')[0];
    if (sheetName === 'Finanzas') {
      if (values && values.length > 0) {
        for (var i = 0; i < values.length; i++) {
          var id = values[i][0] ? values[i][0].toString() : '';
          var desc = values[i][6] ? values[i][6].toString() : '';
          
          var isAutoInsumo = id.indexOf('FIN_') === 0 && id.indexOf('_SUP') !== -1;
          var isAutoMaquinaria = id.indexOf('TX_') === 0 && desc.indexOf('Compra de activo:') !== -1;
          
          if (!isAutoInsumo && !isAutoMaquinaria) {
            return false;
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

function JSONResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function cronFetchWeather() {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) {
    var files = DriveApp.getFilesByName("BSF BioManager");
    if (files.hasNext()) {
      activeSpreadsheet = SpreadsheetApp.open(files.next());
    }
  }
  
  if (!activeSpreadsheet) {
    Logger.log("No active spreadsheet found");
    return;
  }
  
  var climaSheet = activeSpreadsheet.getSheetByName('Clima');
  if (!climaSheet) {
    climaSheet = activeSpreadsheet.insertSheet('Clima');
    climaSheet.appendRow(['ID_Registro', 'Fecha_Hora', 'Temperatura', 'Humedad', 'Origen', 'Observacion']);
  }
  
  var now = new Date();
  var formattedHour = Utilities.formatDate(now, "America/Lima", "yyyy-MM-dd HH");
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    Logger.log("Could not obtain lock");
    return;
  }
  
  try {
    var data = climaSheet.getDataRange().getValues();
    var alreadyHasEntry = false;
    for (var i = 1; i < data.length; i++) {
      var rowDateStr = data[i][1] ? data[i][1].toString() : '';
      var rowOrigen = data[i][4] ? data[i][4].toString() : '';
      if (rowDateStr.indexOf(formattedHour) === 0 && rowOrigen === 'API Open-Meteo') {
        alreadyHasEntry = true;
        break;
      }
    }
    
    if (alreadyHasEntry) {
      Logger.log("Already has API entry for " + formattedHour);
      return;
    }
    
    // Fetch from internet
    var url = "https://api.open-meteo.com/v1/forecast?latitude=-11.0543&longitude=-75.3306&current=temperature_2m,relative_humidity_2m&timezone=America/Lima";
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());
    var temp = json.current.temperature_2m;
    var hum = json.current.relative_humidity_2m;
    
    var sysDateTimeStr = Utilities.formatDate(now, "America/Lima", "yyyy-MM-dd HH:mm:ss");
    var id = "API_" + now.getTime();
    
    climaSheet.appendRow([id, sysDateTimeStr, temp, hum, 'API Open-Meteo', '']);
    CacheService.getScriptCache().remove("CACHE_DATA_Clima");
    Logger.log("Successfully recorded API weather for " + sysDateTimeStr);
  } catch (e) {
    Logger.log("Error fetching weather: " + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function setupWeatherTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'cronFetchWeather') {
      exists = true;
      break;
    }
  }
  if (!exists) {
    ScriptApp.newTrigger('cronFetchWeather')
      .timeBased()
      .everyHours(1)
      .create();
  }
}
