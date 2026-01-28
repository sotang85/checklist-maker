var LoggerService = (function() {
  function appendLog(entry) {
    var logSheetId = Settings.get('LOG_SHEET_ID');
    if (!logSheetId) return;
    var sheet = SpreadsheetApp.openById(logSheetId).getSheetByName('MasterLog');
    if (!sheet) return;
    sheet.appendRow([
      new Date(),
      entry.requestor || '',
      entry.inputFileId || '',
      entry.outputUrl || '',
      (entry.warnings || []).join(' | ')
    ]);
  }

  return {
    appendLog: appendLog
  };
})();
