var DriveService = (function() {
  function DriveService() {}

  DriveService.prototype.saveUpload = function(data, fileName, mimeType) {
    var folderId = Settings.get('UPLOAD_FOLDER_ID');
    var blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);
    return file.getId();
  };

  DriveService.prototype.extractTextFromPdf = function(fileId) {
    var warnings = [];
    var text = '';
    var docId = null;
    try {
      docId = this.convertPdfToDoc_(fileId, false);
      text = this.getDocText_(docId);
      this.deleteFile_(docId);
    } catch (error) {
      warnings.push('PDF 변환 실패: ' + error.message);
    }

    if (!text) {
      try {
        docId = this.convertPdfToDoc_(fileId, true);
        text = this.getDocText_(docId);
        this.deleteFile_(docId);
        if (!text) {
          warnings.push('OCR 변환 후에도 텍스트가 비어 있습니다.');
        }
      } catch (error) {
        warnings.push('OCR 변환 실패: ' + error.message);
      }
    }

    return { text: text, warnings: warnings };
  };

  DriveService.prototype.convertPdfToDoc_ = function(fileId, useOcr) {
    var file = Drive.Files.copy(
      {
        title: 'TEMP_CONVERT_' + fileId,
        mimeType: 'application/vnd.google-apps.document'
      },
      fileId,
      {
        ocr: useOcr,
        ocrLanguage: 'ko'
      }
    );
    return file.id;
  };

  DriveService.prototype.getDocText_ = function(docId) {
    var doc = DocumentApp.openById(docId);
    return doc.getBody().getText();
  };

  DriveService.prototype.deleteFile_ = function(fileId) {
    if (!fileId) return;
    try {
      Drive.Files.remove(fileId);
    } catch (error) {
      // Ignore cleanup errors.
    }
  };

  return {
    getInstance: function() {
      return new DriveService();
    }
  };
})();
