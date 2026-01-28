var Parser = (function() {
  function emptyResult() {
    return {
      data: {
        company_name: null,
        biz_no: null,
        corp_no: null,
        ceo: null,
        established_date: null,
        closed_date: null,
        address_hq: null,
        phone: null,
        main_bank: null,
        employee_count: null,
        industry: null,
        major_products: null,
        credit_grade: null,
        watch_grade: null,
        financials: [
          { year: 2022, assets: null, liabilities: null, sales: null, op_profit: null, audit_opinion: null },
          { year: 2023, assets: null, liabilities: null, sales: null, op_profit: null, audit_opinion: null },
          { year: 2024, assets: null, liabilities: null, sales: null, op_profit: null, audit_opinion: null }
        ],
        credit_events: {
          delinquency_count: null,
          subrogation_count: null,
          dishonor_count: null,
          workout_count: null,
          public_arrears_count: null
        }
      },
      warnings: []
    };
  }

  function parseNiceReport(text) {
    var warnings = [];
    var result = emptyResult();

    result.data.company_name = matchValue(text, /회사명\s*[:：]?\s*([^\n]+)/);
    result.data.biz_no = matchValue(text, /사업자등록번호\s*[:：]?\s*([0-9\-]+)/);
    result.data.corp_no = matchValue(text, /법인등록번호\s*[:：]?\s*([0-9\-]+)/);
    result.data.ceo = matchValue(text, /(대표자|대표이사)\s*[:：]?\s*([^\n]+)/, 2);
    result.data.established_date = matchValue(text, /설립일\s*[:：]?\s*([0-9.\-\/]+)/);
    result.data.closed_date = matchValue(text, /(폐업일자|휴업일자)\s*[:：]?\s*([0-9.\-\/]+)/, 2);
    result.data.address_hq = matchValue(text, /(본점|주소)\s*[:：]?\s*([^\n]+)/, 2);
    result.data.phone = matchValue(text, /(전화번호|연락처)\s*[:：]?\s*([0-9\-]+)/, 2);
    result.data.main_bank = matchValue(text, /주거래은행\s*[:：]?\s*([^\n]+)/);
    result.data.employee_count = parseNumber(matchValue(text, /종업원수\s*[:：]?\s*([0-9,\-]+)/));
    result.data.industry = matchValue(text, /(업종|산업분류)\s*[:：]?\s*([^\n]+)/, 2);
    result.data.major_products = matchValue(text, /(주요제품|주요사업)\s*[:：]?\s*([^\n]+)/, 2);
    result.data.credit_grade = matchValue(text, /(신용등급|기업신용등급)\s*[:：]?\s*([^\n]+)/, 2);
    result.data.watch_grade = matchValue(text, /(감시등급|유의등급)\s*[:：]?\s*([^\n]+)/, 2);

    result.data.financials = parseFinancials(text, warnings);
    result.data.credit_events = parseCreditEvents(text);

    if (!result.data.company_name) warnings.push('회사명을 추출하지 못했습니다.');
    if (!result.data.biz_no) warnings.push('사업자등록번호를 추출하지 못했습니다.');
    if (!result.data.corp_no) warnings.push('법인등록번호를 추출하지 못했습니다.');
    if (!result.data.employee_count && result.data.employee_count !== 0) warnings.push('종업원수를 추출하지 못했습니다.');

    return { data: result.data, warnings: warnings };
  }

  function matchValue(text, regex, groupIndex) {
    var match = text.match(regex);
    if (!match) return null;
    var value = match[groupIndex || 1];
    return normalizeDash(value.trim());
  }

  function matchRaw(text, regex, groupIndex) {
    var match = text.match(regex);
    if (!match) return null;
    return match[groupIndex || 1].trim();
  }

  function normalizeDash(value) {
    if (!value) return null;
    if (value === '-' || value === '—' || value === '없음') {
      return null;
    }
    return value;
  }

  function parseNumber(value) {
    if (value === null || value === undefined) return null;
    if (value === '-' || value === '—') return null;
    var normalized = String(value).replace(/[,\s]/g, '');
    if (normalized === '') return null;
    var number = Number(normalized);
    return isNaN(number) ? null : number;
  }

  function parseCount(value) {
    if (value === null || value === undefined) return null;
    if (value === '-' || value === '—') return 0;
    var number = parseNumber(value);
    return number === null ? null : number;
  }

  function parseFinancials(text, warnings) {
    var years = [2022, 2023, 2024];
    var financials = years.map(function(year) {
      return { year: year, assets: null, liabilities: null, sales: null, op_profit: null, audit_opinion: null };
    });

    var lines = text.split(/\n/);
    lines.forEach(function(line) {
      var yearMatch = line.match(/(2022|2023|2024)/);
      if (!yearMatch) return;
      var year = Number(yearMatch[1]);
      var numbers = line.match(/[-]?[0-9,]+/g) || [];
      if (numbers.length < 4) return;
      var target = financials.find(function(item) {
        return item.year === year;
      });
      if (!target) return;
      target.assets = parseNumber(numbers[0]);
      target.liabilities = parseNumber(numbers[1]);
      target.sales = parseNumber(numbers[2]);
      target.op_profit = parseNumber(numbers[3]);
      if (line.indexOf('감사의견') !== -1) {
        target.audit_opinion = matchValue(line, /감사의견\s*[:：]?\s*([^\n]+)/);
      }
    });

    if (financials.every(function(item) { return item.sales === null; })) {
      warnings.push('최근 3년 매출 데이터를 찾지 못했습니다.');
    }

    return financials;
  }

  function parseCreditEvents(text) {
    var events = {
      delinquency_count: parseCount(matchRaw(text, /연체\s*[:：]?\s*([0-9\-]+)/)),
      subrogation_count: parseCount(matchRaw(text, /대위변제\s*[:：]?\s*([0-9\-]+)/)),
      dishonor_count: parseCount(matchRaw(text, /부도\s*[:：]?\s*([0-9\-]+)/)),
      workout_count: parseCount(matchRaw(text, /워크아웃\s*[:：]?\s*([0-9\-]+)/)),
      public_arrears_count: parseCount(matchRaw(text, /공공요금체납\s*[:：]?\s*([0-9\-]+)/))
    };
    return events;
  }

  return {
    parseNiceReport: parseNiceReport,
    emptyResult: emptyResult
  };
})();
