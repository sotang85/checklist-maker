function doGet() {
  requireDomainUser_();
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate().setTitle('구매거래처 체크리스트 생성기');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function uploadPdf(data, fileName) {
  requireDomainUser_();
  var service = DriveService.getInstance();
  var fileId = service.saveUpload(data, fileName, 'application/pdf');
  return { fileId: fileId };
}

function generateChecklist(fileId, metadata) {
  requireDomainUser_();
  var warnings = [];
  var service = DriveService.getInstance();
  var parsed = null;
  var textResult = service.extractTextFromPdf(fileId);
  if (!textResult.text) {
    warnings = warnings.concat(textResult.warnings);
  }

  if (textResult.text) {
    parsed = Parser.parseNiceReport(textResult.text);
    warnings = warnings.concat(parsed.warnings);
  } else {
    parsed = Parser.emptyResult();
    warnings.push('PDF 변환/텍스트 추출 실패로 기본값을 사용했습니다.');
  }

  var computed = Rules.deriveChecklist(parsed.data, metadata, { forceNeedsVerification: !textResult.text });
  warnings = warnings.concat(computed.warnings);

  var writer = SheetWriter.getInstance();
  var output = writer.createChecklist(parsed.data, computed.answers, metadata);

  LoggerService.appendLog({
    requestor: Session.getActiveUser().getEmail(),
    inputFileId: fileId,
    outputUrl: output.url,
    warnings: warnings
  });

  return {
    url: output.url,
    warnings: warnings
  };
}

function requireDomainUser_() {
  var allowedDomain = Settings.get('ALLOWED_DOMAIN');
  if (!allowedDomain) return;
  var email = Session.getActiveUser().getEmail();
  if (!email || email.split('@')[1] !== allowedDomain) {
    throw new Error('허용된 도메인 사용자만 접근 가능합니다.');
  }
}
