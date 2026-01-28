var SheetWriter = (function() {
  var bannerText = '내부 참고용 / 외부 공유 금지 / 최종 판단 책임은 작성부서에 있음';

  function SheetWriter() {}

  SheetWriter.prototype.createChecklist = function(data, answers, metadata) {
    var templateId = Settings.get('TEMPLATE_ID');
    var outputFolderId = Settings.get('OUTPUT_FOLDER_ID');
    if (!templateId || !outputFolderId) {
      throw new Error('TEMPLATE_ID 또는 OUTPUT_FOLDER_ID 설정이 필요합니다.');
    }
    var templateFile = DriveApp.getFileById(templateId);
    var outputFolder = DriveApp.getFolderById(outputFolderId);
    var copy = templateFile.makeCopy('체크리스트_' + (data.company_name || '미확인'), outputFolder);
    var spreadsheet = SpreadsheetApp.openById(copy.getId());

    this.applyBanner_(spreadsheet);
    this.applyConfigMappings_(spreadsheet, data, answers, metadata);

    return { url: spreadsheet.getUrl(), id: spreadsheet.getId() };
  };

  SheetWriter.prototype.applyBanner_ = function(spreadsheet) {
    var sheet = spreadsheet.getSheets()[0];
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, sheet.getMaxColumns())
      .setValue(bannerText)
      .setBackground('#fde9d9')
      .setFontWeight('bold');
  };

  SheetWriter.prototype.applyConfigMappings_ = function(spreadsheet, data, answers, metadata) {
    var config = spreadsheet.getSheetByName('CONFIG');
    if (!config) {
      throw new Error('CONFIG 시트가 필요합니다.');
    }
    var rows = config.getDataRange().getValues();
    var headers = rows.shift();
    rows.forEach(function(row) {
      var rowData = toRowObject(headers, row);
      if (!rowData.target_sheet || !rowData.search_text) return;
      var targetSheet = spreadsheet.getSheetByName(rowData.target_sheet);
      if (!targetSheet) return;

      var value = resolveValue_(rowData.value_key, data, answers, metadata);
      var range = null;
      if (rowData.write_mode === 'FIXED_CELL' && rowData.fixed_cell) {
        range = targetSheet.getRange(rowData.fixed_cell);
      } else {
        var finder = targetSheet.createTextFinder(rowData.search_text).matchCase(false).matchEntireCell(true);
        var found = finder.findNext();
        if (!found) return;
        range = found.offset(0, 1);
      }
      range.setValue(value);
      applyFormatting_(range, rowData.formatting);
    });
  };

  function toRowObject(headers, row) {
    var obj = {};
    headers.forEach(function(header, index) {
      obj[String(header).trim()] = row[index];
    });
    return obj;
  }

  function resolveValue_(key, data, answers, metadata) {
    if (!key) return '';
    if (key.indexOf('data.') === 0) {
      return getPathValue_(data, key.replace('data.', ''));
    }
    if (key.indexOf('answers.') === 0) {
      return getPathValue_(answers, key.replace('answers.', ''));
    }
    if (key.indexOf('metadata.') === 0) {
      return getPathValue_(metadata, key.replace('metadata.', ''));
    }
    return answers[key] || data[key] || metadata[key] || '';
  }

  function getPathValue_(source, path) {
    var current = source;
    path.split('.').forEach(function(segment) {
      if (!current) return;
      current = current[segment];
    });
    return current === null || current === undefined ? '' : current;
  }

  function applyFormatting_(range, formatting) {
    if (!formatting || formatting === 'AUTO') return;
    if (formatting === 'GREEN') {
      range.setBackground('#d9ead3');
    } else if (formatting === 'YELLOW') {
      range.setBackground('#fff2cc');
    }
  }

  return {
    getInstance: function() {
      return new SheetWriter();
    }
  };
})();
