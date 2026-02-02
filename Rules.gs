var Rules = (function() {
  function deriveChecklist(data, metadata, options) {
    var warnings = [];
    var answers = {};
    var shouldForceNeeds = options && options.forceNeedsVerification;

    if (shouldForceNeeds) {
      return { answers: buildNeedsVerificationAnswers_(metadata), warnings: warnings };
    }

    answers.company_name = data.company_name || 'NEEDS_VERIFICATION';
    answers.biz_no = data.biz_no || 'NEEDS_VERIFICATION';
    answers.corp_no = data.corp_no || 'NEEDS_VERIFICATION';
    answers.ceo = data.ceo || 'NEEDS_VERIFICATION';
    answers.address_hq = data.address_hq || 'NEEDS_VERIFICATION';
    answers.phone = data.phone || 'NEEDS_VERIFICATION';
    answers.main_bank = data.main_bank || 'NEEDS_VERIFICATION';
    answers.employee_count = data.employee_count !== null ? data.employee_count : 'NEEDS_VERIFICATION';
    answers.industry = data.industry || 'NEEDS_VERIFICATION';
    answers.major_products = data.major_products || 'NEEDS_VERIFICATION';
    answers.metadata_dept = metadata.dept || 'NEEDS_VERIFICATION';
    answers.metadata_owner = metadata.owner || 'NEEDS_VERIFICATION';
    answers.metadata_start_date = metadata.startDate || 'NEEDS_VERIFICATION';

    var closedAnswer = data.closed_date ? 'YES' : 'NO';
    var closedEvidence = data.closed_date ? data.closed_date : '폐업일자: -';
    var closedNext = data.closed_date ? '' : '국세청 홈택스 사업자상태 조회 권장';
    answers.closed_status_answer = closedAnswer;
    answers.closed_status_evidence = closedEvidence;
    answers.closed_status_next_action = closedNext;

    var creditEvents = data.credit_events || {};
    var creditCount = sumCounts([
      creditEvents.delinquency_count,
      creditEvents.subrogation_count,
      creditEvents.dishonor_count,
      creditEvents.workout_count,
      creditEvents.public_arrears_count
    ]);
    var creditAnswer = creditCount > 0 ? 'YES' : 'NO';
    var creditEvidence = creditCount > 0
      ? '연체:' + safeCount(creditEvents.delinquency_count) +
        ', 대위변제:' + safeCount(creditEvents.subrogation_count) +
        ', 부도:' + safeCount(creditEvents.dishonor_count) +
        ', 워크아웃:' + safeCount(creditEvents.workout_count) +
        ', 공공요금체납:' + safeCount(creditEvents.public_arrears_count)
      : '신용도판단정보: -';
    answers.credit_event_answer = creditAnswer;
    answers.credit_event_evidence = creditEvidence;
    answers.credit_event_next_action = creditCount > 0 ? '' : '신용정보원/금융기관 확인 권장';

    var salesAnswer = isSalesDecreasing(data.financials) ? 'YES' : 'NO';
    answers.sales_decline_answer = salesAnswer;
    answers.sales_decline_evidence = salesEvidence(data.financials);

    var lossAnswer = isOpLossTwoYears(data.financials) ? 'YES' : 'NO';
    answers.op_loss_answer = lossAnswer;
    answers.op_loss_evidence = opLossEvidence(data.financials);

    var debtResult = debtRatioDecision(data.financials);
    answers.debt_ratio_answer = debtResult.answer;
    answers.debt_ratio_evidence = debtResult.evidence;

    addGenericChecklistDefaults(answers);

    if (!data.financials || data.financials.length === 0) {
      warnings.push('재무 정보가 부족합니다.');
    }

    return { answers: answers, warnings: warnings };
  }

  function buildNeedsVerificationAnswers_(metadata) {
    var answers = {
      company_name: 'NEEDS_VERIFICATION',
      biz_no: 'NEEDS_VERIFICATION',
      corp_no: 'NEEDS_VERIFICATION',
      ceo: 'NEEDS_VERIFICATION',
      address_hq: 'NEEDS_VERIFICATION',
      phone: 'NEEDS_VERIFICATION',
      main_bank: 'NEEDS_VERIFICATION',
      employee_count: 'NEEDS_VERIFICATION',
      industry: 'NEEDS_VERIFICATION',
      major_products: 'NEEDS_VERIFICATION',
      metadata_dept: metadata.dept || 'NEEDS_VERIFICATION',
      metadata_owner: metadata.owner || 'NEEDS_VERIFICATION',
      metadata_start_date: metadata.startDate || 'NEEDS_VERIFICATION',
      closed_status_answer: 'NEEDS_VERIFICATION',
      closed_status_evidence: 'NEEDS_VERIFICATION',
      closed_status_next_action: '국세청 홈택스 사업자상태 조회 권장',
      credit_event_answer: 'NEEDS_VERIFICATION',
      credit_event_evidence: 'NEEDS_VERIFICATION',
      credit_event_next_action: '신용정보원/금융기관 확인 권장',
      sales_decline_answer: 'NEEDS_VERIFICATION',
      sales_decline_evidence: 'NEEDS_VERIFICATION',
      op_loss_answer: 'NEEDS_VERIFICATION',
      op_loss_evidence: 'NEEDS_VERIFICATION',
      debt_ratio_answer: 'NEEDS_VERIFICATION',
      debt_ratio_evidence: 'NEEDS_VERIFICATION'
    };
    addGenericChecklistDefaults(answers);
    return answers;
  }

  function addGenericChecklistDefaults(answers) {
    var defaults = {
      litigation_answer: 'NEEDS_VERIFICATION',
      litigation_next_action: 'DART/언론검색/공정위·식약처 제재 조회 + 거래처 확인서 요청',
      compliance_answer: 'NEEDS_VERIFICATION',
      compliance_next_action: 'ISO/법적 인증서류 확인 및 담당부서 검토',
      security_answer: 'NEEDS_VERIFICATION',
      security_next_action: '정보보안 정책/개인정보보호 서약서 확인',
      onsite_answer: 'NEEDS_VERIFICATION',
      onsite_next_action: '현장 실사 또는 화상 인터뷰 진행'
    };
    Object.keys(defaults).forEach(function(key) {
      if (!answers[key]) {
        answers[key] = defaults[key];
      }
    });
  }

  function sumCounts(values) {
    var sum = 0;
    var hasValue = false;
    values.forEach(function(value) {
      if (value === null || value === undefined) return;
      hasValue = true;
      sum += value;
    });
    return hasValue ? sum : 0;
  }

  function safeCount(value) {
    if (value === null || value === undefined) return '-';
    return value;
  }

  function isSalesDecreasing(financials) {
    var yearData = mapYears(financials);
    if (!yearData[2022] || !yearData[2023] || !yearData[2024]) return false;
    if (yearData[2022].sales === null || yearData[2023].sales === null || yearData[2024].sales === null) return false;
    return yearData[2022].sales > yearData[2023].sales && yearData[2023].sales > yearData[2024].sales;
  }

  function isOpLossTwoYears(financials) {
    var yearData = mapYears(financials);
    if (!yearData[2023] || !yearData[2024]) return false;
    if (yearData[2023].op_profit === null || yearData[2024].op_profit === null) return false;
    return yearData[2023].op_profit < 0 && yearData[2024].op_profit < 0;
  }

  function debtRatioDecision(financials) {
    var yearData = mapYears(financials);
    var target = yearData[2024] || yearData[2023] || yearData[2022];
    if (!target || target.assets === null || target.liabilities === null) {
      return { answer: 'NEEDS_VERIFICATION', evidence: '재무제표 확인 필요' };
    }
    var equity = target.assets - target.liabilities;
    if (equity <= 0) {
      return { answer: 'YES', evidence: '자본잠식/자본음수' };
    }
    var ratio = (target.liabilities / equity) * 100;
    return { answer: ratio >= 100 ? 'YES' : 'NO', evidence: '부채비율: ' + ratio.toFixed(1) + '%' };
  }

  function mapYears(financials) {
    var map = {};
    (financials || []).forEach(function(item) {
      map[item.year] = item;
    });
    return map;
  }

  function salesEvidence(financials) {
    var yearData = mapYears(financials);
    return '매출(2022/2023/2024): ' +
      [yearData[2022], yearData[2023], yearData[2024]].map(function(item) {
        return item && item.sales !== null ? item.sales : '-';
      }).join(' / ');
  }

  function opLossEvidence(financials) {
    var yearData = mapYears(financials);
    return '영업이익(2023/2024): ' +
      [yearData[2023], yearData[2024]].map(function(item) {
        return item && item.op_profit !== null ? item.op_profit : '-';
      }).join(' / ');
  }

  return {
    deriveChecklist: deriveChecklist
  };
})();
