var TestHarness = (function() {
  function runParserTests() {
    var tests = [];

    tests.push(testParseCompanyName());
    tests.push(testParseBizNo());
    tests.push(testParseDashValue());
    tests.push(testParseEmployeeCount());
    tests.push(testParseCreditEvents());
    tests.push(testParseFinancials());
    tests.push(testParseNegativeOpProfit());
    tests.push(testParseMissingSections());
    tests.push(testParseCorpNo());
    tests.push(testParseMajorProducts());

    var failed = tests.filter(function(result) {
      return !result.ok;
    });

    if (failed.length > 0) {
      throw new Error('테스트 실패: ' + failed.map(function(item) { return item.name; }).join(', '));
    }
    return '모든 테스트 통과';
  }

  function testParseCompanyName() {
    var text = '회사명: 테스트상사';
    var result = Parser.parseNiceReport(text);
    return assertEqual('회사명', result.data.company_name, '테스트상사');
  }

  function testParseBizNo() {
    var text = '사업자등록번호: 123-45-67890';
    var result = Parser.parseNiceReport(text);
    return assertEqual('사업자번호', result.data.biz_no, '123-45-67890');
  }

  function testParseDashValue() {
    var text = '주거래은행: -';
    var result = Parser.parseNiceReport(text);
    return assertEqual('대시 처리', result.data.main_bank, null);
  }

  function testParseEmployeeCount() {
    var text = '종업원수: 12';
    var result = Parser.parseNiceReport(text);
    return assertEqual('종업원수', result.data.employee_count, 12);
  }

  function testParseCreditEvents() {
    var text = '연체: 1\n대위변제: 0\n부도: -\n워크아웃: 2\n공공요금체납: -';
    var result = Parser.parseNiceReport(text);
    return assertEqual('신용이벤트', result.data.credit_events.workout_count, 2);
  }

  function testParseFinancials() {
    var text = '2022 100,000 50,000 70,000 10,000';
    var result = Parser.parseNiceReport(text);
    return assertEqual('재무', result.data.financials[0].assets, 100000);
  }

  function testParseNegativeOpProfit() {
    var text = '2024 100,000 50,000 70,000 -5,000';
    var result = Parser.parseNiceReport(text);
    return assertEqual('영업이익 음수', result.data.financials[2].op_profit, -5000);
  }

  function testParseMissingSections() {
    var text = '회사명: 테스트상사';
    var result = Parser.parseNiceReport(text);
    return assertEqual('누락 섹션', result.data.corp_no, null);
  }

  function testParseCorpNo() {
    var text = '법인등록번호: 110111-1234567';
    var result = Parser.parseNiceReport(text);
    return assertEqual('법인번호', result.data.corp_no, '110111-1234567');
  }

  function testParseMajorProducts() {
    var text = '주요제품: 테스트제품';
    var result = Parser.parseNiceReport(text);
    return assertEqual('주요제품', result.data.major_products, '테스트제품');
  }

  function assertEqual(name, actual, expected) {
    var ok = actual === expected;
    return { name: name, ok: ok, actual: actual, expected: expected };
  }

  return {
    runParserTests: runParserTests
  };
})();
