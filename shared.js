/*
 * 2026 台灣社會福利人員薪資待遇調查：題目、驗證與統計（共用）
 *
 * 這個檔案同時給三個地方用：
 *   1. survey.html    （問卷頁，產生題目與即時檢查）
 *   2. dashboard.html （統計頁的示範模式）
 *   3. Google Apps Script （貼成 Shared.gs，後端驗證與統計）
 * 改題目只要改這裡，三邊就會一致。請不要用 import/export 語法，Apps Script 不支援。
 */

var SURVEY_YEAR = 2026;

// 公開統計時，人數少於這個數字的組合一律遮蔽
var MIN_CELL = 5;

// 「38,999 元以下」視為未達或剛好達到公告起薪（114 年起薪 38,898 元）。
// 115 年起薪確定後，請確認這個切點是否仍合適。
var BELOW_START_MAX_BIN = '36,000–38,999';

var COUNTIES = ['基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '台中市',
  '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣',
  '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'];

var SALARY_BINS = (function () {
  function fmt(n) { return n.toLocaleString('en-US'); }
  var bins = ['未滿 30,000'];
  for (var lo = 30000; lo < 78000; lo += 3000) bins.push(fmt(lo) + '–' + fmt(lo + 2999));
  bins.push('78,000–79,999');
  bins.push('80,000 以上');
  return bins;
})();

// 自由接案的人跳過受僱才有的題目（單位、加給、年終、回捐、加班等）
var FREELANCE = '自由接案';
var NOT_FREELANCE = { q: 'A4', ne: FREELANCE };

// 有個案量的第一線職務（案量題只問這些人）
var FRONTLINE = ['社工員、社工專員或個案管理員', '社工助理', '學校社工、輔導人員或資源教室人員'];

var YEAR_BINS = ['未滿 1 年', '1–2 年', '3–4 年', '5–6 年', '7–10 年', '11–15 年', '16 年以上'];

var SECTIONS = [
  {
    id: 'A', title: '基本資料', questions: [
      // 在問卷首頁的同意聲明按「我同意」時填入，不在題目頁顯示；後端要求這題才收件
      { id: 'A0', label: '參與同意', type: 'radio', required: true, options: ['我同意參與'], consent: true },
      { id: 'A1', label: '你填的是哪份工作？', type: 'radio', required: true,
        options: ['現職', '一年內離開的前一份工作', '超過一年前的工作'],
        endIf: '超過一年前的工作',
        hint: '超過一年的工作待遇變動太大，這次先不收。' },
      { id: 'A2', label: '工作所在縣市', type: 'select', required: true, options: COUNTIES },
      { id: 'A3', label: '年齡', type: 'radio', required: true,
        options: ['24 歲以下', '25–29 歲', '30–34 歲', '35–39 歲', '40–44 歲', '45–49 歲', '50–54 歲', '55–59 歲', '60–64 歲', '65 歲以上'] },
      { id: 'A5', label: '性別', type: 'radio', required: true, options: ['女', '男', '其他', '不想回答'] },
      { id: 'A4', label: '工作型態', type: 'radio', required: true, options: ['全職受僱', '兼職受僱', FREELANCE],
        hint: '自由接案：沒有固定雇主，按案或按時數計酬，含開業的社工師。' }
    ]
  },
  {
    id: 'B', title: '工作單位', questions: [
      // 機構類型：參照衛福部「社會工作專職人員數統計」的單位分類，再把公部門拆成各系統
      { id: 'B1', label: '服務機構類型', type: 'select', required: true, options: [
        '地方政府社政單位（社會局處、社福中心）', '地方政府衛政單位（衛生局、心衛中心）',
        '中央政府機關', '公部門警政單位（如少輔會）', '公部門勞政單位（勞工局處、就服站）',
        '司法或矯正機關', '學校或教育單位（含大專校院、學生輔導諮商中心）',
        '醫院或其他醫事機構', '長照、安養或護理機構', '民間社福基金會、協會或團體',
        '社工師事務所或專業團體', '公司行號、企業基金會', '其他'], showIf: NOT_FREELANCE },
      // 服務方案類型：參照專科社工師五分科、社安網方案與歷年回覆中常見的職務
      { id: 'B1b', label: '主要服務方案類型', type: 'select', required: true, options: [
        '兒少保護（含家外安置）', '家暴、性侵害、性剝削防治', '社福中心、脆弱家庭服務',
        '兒少福利、收出養', '早期療育', '婦女、單親或新住民家庭服務',
        '老人福利服務', '長照個管或居服督導', '身心障礙個管或社區服務', '身心障礙日間或住宿機構',
        '醫務社工（含精神科社工）', '心理衛生、自殺防治或精神復健', '藥癮、毒品危害防制',
        '學校社工或學生輔導', '司法、觀護或更生保護', '社會救助、脫貧或無家者服務',
        '原住民族家庭服務', '就業服務或職業重建', '社區工作或社區發展',
        '募款、倡議或行政', '其他'],
        hint: '只問方案類型，不問單位名稱。' },
      { id: 'B2', label: '薪資經費來源', type: 'select', required: true, options: [
        '縣市政府自辦', '政府標案獲補助案', '公益彩券補助', '聯合勸募補助', '其他財源補助', '單位自籌', '我不知道'], showIf: NOT_FREELANCE },
      { id: 'B3', label: '職稱或職務', type: 'radio', required: true, options: [
        '社工員、社工專員或個案管理員', '社工助理', '學校社工、輔導人員或資源教室人員', '督導',
        '組長、主任或單位主管', '執行長、秘書長或機構負責人', '行政或募款人員', '其他社工相關職務'],
        hint: '有社工師執照的人請選實際職務，執照在後面的證照題勾選。', showIf: NOT_FREELANCE },
      { id: 'B4', label: '是否為保護業務工作人員', type: 'radio', required: true, options: ['是', '否'], showIf: NOT_FREELANCE },
      { id: 'B5', label: '有無領風險加給', type: 'radio', required: true, options: ['有', '無', '不知道'], showIf: NOT_FREELANCE },
      { id: 'B6', label: '單位規模（所在辦公室、科室或機構）', type: 'radio', required: true,
        options: ['5 人以下', '6–20 人', '21–50 人', '51–100 人', '101 人以上'],
        hint: '這題不會公開。', showIf: NOT_FREELANCE }
    ]
  },
  {
    id: 'C', title: '學歷與年資', questions: [
      { id: 'C1', label: '最高學歷', type: 'radio', required: true, options: ['專科', '學士', '碩士以上'] },
      { id: 'C1b', label: '最高學歷是社工相關系所嗎？', type: 'radio', required: true, options: ['是', '否'] },
      { id: 'C2', label: '證照（可複選）', type: 'checkbox', required: true,
        options: ['社會工作師執照', '專科社工師', '都沒有'], exclusive: ['都沒有'] },
      { id: 'C3', label: '社工總年資（所有社工工作加起來）', type: 'radio', required: true, options: YEAR_BINS },
      { id: 'C4', label: '現職年資（在這個單位）', type: 'radio', required: true, options: YEAR_BINS,
        hint: '不能大於社工總年資。', showIf: NOT_FREELANCE }
    ]
  },
  {
    id: 'D', title: '薪資與福利', questions: [
      { id: 'D1', label: '每月薪水（含各項加給，扣勞健保前的應發金額）', type: 'select', required: true,
        options: SALARY_BINS, showIf: { q: 'A4', eq: '全職受僱' } },
      { id: 'D1h', label: '時薪（兼職填）', type: 'radio', required: true,
        options: ['未滿 200', '200–249', '250–299', '300–349', '350–399', '400 以上'],
        showIf: { q: 'A4', eq: '兼職受僱' } },
      { id: 'D1f', label: '平均每月接案收入（扣除成本前）', type: 'select', required: true,
        options: SALARY_BINS, showIf: { q: 'A4', eq: FREELANCE } },
      { id: 'D1r', label: '最常見的鐘點費（每小時）', type: 'radio', required: true,
        options: ['未滿 800', '800–1,199', '1,200–1,599', '1,600–1,999', '2,000–2,999', '3,000 以上'],
        showIf: { q: 'A4', eq: FREELANCE } },
      { id: 'D1s', label: '主要案源（可複選）', type: 'checkbox', required: true, options: [
        '政府委託方案（訪視、評估、督導）', '民間單位外聘督導或講師', '法院相關（家事調查、監護或收出養評估）',
        '個人自費（諮商、家族工作）', '企業員工協助方案（EAP）', '學校', '其他'],
        showIf: { q: 'A4', eq: FREELANCE } },
      { id: 'D1i', label: '勞健保怎麼保？', type: 'radio', required: true,
        options: ['職業工會', '掛在其他單位', '自己沒有保', '其他'], showIf: { q: 'A4', eq: FREELANCE } },
      { id: 'D2', label: '有領到哪些加給？（可複選，不用填金額）', type: 'checkbox', required: true,
        options: ['學歷（碩士）', '證照', '專科社工師', '偏遠', '督導職務', '都沒有', '不知道'],
        exclusive: ['都沒有', '不知道'], showIf: NOT_FREELANCE },
      { id: 'D3', label: '每月回捐或被要求繳回的金額', type: 'radio', required: true,
        options: ['沒有', '1,000 以下', '1,000–2,999', '3,000–4,999', '5,000 以上'], showIf: NOT_FREELANCE },
      { id: 'D4', label: '2025 年度年終獎金', type: 'radio', required: true,
        options: ['沒有', '未滿 1 個月', '1 個月', '1.5 個月', '2 個月以上', '依考核不固定'], showIf: NOT_FREELANCE },
      { id: 'D5', label: '和去年同月比，你的薪水', type: 'radio', required: true,
        options: ['增加', '差不多', '減少', '去年不在此職'], showIf: NOT_FREELANCE },
      { id: 'D6', label: '2025 年 3% 調薪有沒有反映在你的薪水？', type: 'radio', required: true,
        options: ['有，全額', '有，部分', '沒有', '我不適用', '不知道'], showIf: NOT_FREELANCE },
      { id: 'D7', label: '有哪些福利？（可複選）', type: 'checkbox', required: false, options: [
        '公會年費補助', '交通或差旅補助', '員工健檢補助', '有調薪空間', '三節獎金或禮金',
        '員工旅遊或國旅卡', '供餐'], showIf: NOT_FREELANCE },
      { id: 'D8', label: '除了主要工作，有沒有另外接案？（如外聘督導、講課）', type: 'radio', required: true,
        options: ['有', '沒有'], showIf: NOT_FREELANCE }
    ]
  },
  {
    id: 'E', title: '工時與加班', questions: [
      { id: 'E1', label: '最近一個月，平均每週實際工時', type: 'radio', required: true,
        options: ['40 小時以下', '41–45 小時', '46–50 小時', '51–60 小時', '60 小時以上'] },
      { id: 'E2', label: '加班怎麼處理？（可複選）', type: 'checkbox', required: true,
        options: ['加班費', '補休', '部分給付', '無償', '不被允許申報', '沒有加班'], exclusive: ['沒有加班'],
        showIf: NOT_FREELANCE },
      { id: 'E3', label: '下班後需要待命（on-call）嗎？', type: 'radio', required: true,
        options: ['不需要', '需要，有津貼', '需要，沒有津貼'], showIf: NOT_FREELANCE },
      { id: 'E4', label: '目前在案量', type: 'radio', required: true,
        options: ['20 案以下', '21–40 案', '41–60 案', '61 案以上'], showIf: { q: 'B3', in: FRONTLINE } }
    ]
  },
  {
    id: 'F', title: '回捐與額外要求', questions: [
      { id: 'F1', label: '回捐的形式', type: 'radio', required: true,
        options: ['從薪資直接扣', '領現金後繳回', '以捐款名義', '從年終扣', '其他'],
        showIf: { q: 'D3', ne: '沒有' } },
      { id: 'F2', label: '回捐是自願的嗎？', type: 'radio', required: true,
        options: ['完全自願', '名義自願但有壓力', '被要求'], showIf: { q: 'D3', ne: '沒有' } },
      { id: 'F3', label: '是否被要求負責募款或業績？', type: 'radio', required: true,
        options: ['否', '是，沒有獎金', '是，有獎金'], showIf: NOT_FREELANCE }
    ]
  },
  {
    id: 'G', title: '職場安全與法律風險', questions: [
      { id: 'G1', label: '過去 12 個月，你在工作中遇過哪些事？（可複選）', type: 'checkbox', required: true,
        options: ['言語威脅', '肢體暴力', '跟蹤騷擾', '網路攻擊或肉搜', '被提告或被申訴', '都沒有'],
        exclusive: ['都沒有'] },
      { id: 'G2', label: '有執業責任險或法律協助嗎？', type: 'radio', required: true,
        hint: '受僱者請回答單位有沒有提供；自由接案請回答自己有沒有。',
        options: ['有責任險', '有法律協助', '兩者都有', '都沒有', '不知道'] },
      { id: 'G3', label: '2026 年剴剴案判決後，你的工作方式有沒有改變？（可複選）', type: 'checkbox', required: true,
        options: ['多寫紀錄自保', '不敢下專業判斷', '更常請示督導', '沒有改變'], exclusive: ['沒有改變'] }
    ]
  },
  {
    id: 'H', title: '留任與心聲', questions: [
      { id: 'H1', label: '未來 12 個月，你想離職的程度', type: 'scale', required: true,
        options: ['1', '2', '3', '4', '5'], scaleLabels: ['完全不想', '一定會走'] },
      { id: 'H2', label: '如果離開，最可能去哪裡？', type: 'radio', required: true,
        options: ['其他社福單位', '公部門', '非社福產業', '進修', '還沒想好'] },
      { id: 'H3', label: '最希望改善的三件事（最多選 3 項）', type: 'checkbox', required: true, max: 3,
        options: ['薪資', '加給', '工時與加班', '案量', '人身安全', '法律保障', '督導支持', '回捐', '其他'] },
      { id: 'H4', label: '留言板：想說的話（什麼都可以寫）', type: 'text', required: false, maxLength: 1000,
        hint: '請不要寫出機構或個人的名字。' },
      { id: 'H5', label: '你的留言可以公開嗎？', type: 'radio', required: true,
        options: ['同意匿名公開（經審核）', '不公開，只給飽螺看'], showIf: { q: 'H4', filled: true } }
    ]
  }
];

var QUESTIONS = [];
SECTIONS.forEach(function (s) { s.questions.forEach(function (q) { QUESTIONS.push(q); }); });

function findQuestion(id) {
  for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === id) return QUESTIONS[i];
  return null;
}

function isFilled(v) {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim() !== '';
}

function isVisible(q, answers) {
  var c = q.showIf;
  if (!c) return true;
  // 依據的題目本身不顯示（例如改選自由接案後留下的舊答案），這題也不顯示
  var dep = findQuestion(c.q);
  if (dep && !isVisible(dep, answers)) return false;
  var v = answers[c.q];
  if (c.eq !== undefined) return v === c.eq;
  if (c.in !== undefined) return c.in.indexOf(v) >= 0;
  if (c.ne !== undefined) return isFilled(v) && v !== c.ne;
  if (c.filled) return isFilled(v);
  return true;
}

// 回傳錯誤陣列 [{id, message}]；空陣列表示通過。onlyIds 可只檢查某一頁的題目。
function validateAnswers(answers, onlyIds) {
  var errors = [];
  QUESTIONS.forEach(function (q) {
    if (onlyIds && onlyIds.indexOf(q.id) < 0) return;
    if (!isVisible(q, answers)) return;
    var v = answers[q.id];
    if (!isFilled(v)) {
      if (q.required) errors.push({ id: q.id, message: '這題還沒填' });
      return;
    }
    if (q.type === 'text') {
      if (typeof v !== 'string' || v.length > (q.maxLength || 1000)) errors.push({ id: q.id, message: '字數太多' });
      return;
    }
    if (q.type === 'checkbox') {
      if (!Array.isArray(v) || v.some(function (x) { return q.options.indexOf(x) < 0; })) {
        errors.push({ id: q.id, message: '選項不正確' }); return;
      }
      if (q.max && v.length > q.max) errors.push({ id: q.id, message: '最多選 ' + q.max + ' 項' });
      if (q.exclusive && v.length > 1 && v.some(function (x) { return q.exclusive.indexOf(x) >= 0; })) {
        errors.push({ id: q.id, message: '「' + q.exclusive.join('／') + '」不能和其他選項一起選' });
      }
      return;
    }
    if (q.options.indexOf(v) < 0) errors.push({ id: q.id, message: '選項不正確' });
  });
  var c3 = YEAR_BINS.indexOf(answers.C3), c4 = YEAR_BINS.indexOf(answers.C4);
  if ((!onlyIds || onlyIds.indexOf('C4') >= 0) && c3 >= 0 && c4 > c3) {
    errors.push({ id: 'C4', message: '現職年資不能大於社工總年資' });
  }
  if (answers.A1 === '超過一年前的工作') errors.push({ id: 'A1', message: '這次只收一年內的工作' });
  return errors;
}

// 試算表欄位順序：每題一欄，複選題以「、」串起來
function toRowValues(answers) {
  return QUESTIONS.map(function (q) {
    if (!isVisible(q, answers)) return '';
    var v = answers[q.id];
    if (Array.isArray(v)) return v.join('、');
    return isFilled(v) ? String(v) : '';
  });
}

function rowValuesToAnswers(values) {
  var a = {};
  QUESTIONS.forEach(function (q, i) {
    var v = values[i] === undefined || values[i] === null ? '' : String(values[i]);
    if (q.type === 'checkbox') a[q.id] = v ? v.split('、') : [];
    else a[q.id] = v;
  });
  return a;
}

/* ---------- 統計 ---------- */

function binQuantile(sortedIdx, p) {
  return sortedIdx[Math.floor(p * (sortedIdx.length - 1))];
}

function salaryGroup(rows, qid, options) {
  return options.map(function (label) {
    var idx = rows.filter(function (r) { return r[qid] === label; })
      .map(function (r) { return SALARY_BINS.indexOf(r.D1); })
      .sort(function (a, b) { return a - b; });
    if (idx.length < MIN_CELL) return { label: label, suppressed: true };
    var belowMax = SALARY_BINS.indexOf(BELOW_START_MAX_BIN);
    return {
      label: label, n: idx.length,
      median: SALARY_BINS[binQuantile(idx, 0.5)],
      q1: SALARY_BINS[binQuantile(idx, 0.25)],
      q3: SALARY_BINS[binQuantile(idx, 0.75)],
      medianIdx: binQuantile(idx, 0.5), q1Idx: binQuantile(idx, 0.25), q3Idx: binQuantile(idx, 0.75),
      belowShare: idx.filter(function (i) { return i <= belowMax; }).length / idx.length
    };
  });
}

function distribution(rows, qid) {
  var q = findQuestion(qid);
  var base = rows.filter(function (r) { return isVisible(q, r) && isFilled(r[qid]); });
  if (base.length < MIN_CELL) return { question: q.label, suppressed: true };
  return {
    question: q.label, n: base.length, multi: q.type === 'checkbox',
    items: q.options.map(function (o) {
      var k = base.filter(function (r) {
        return q.type === 'checkbox' ? r[qid].indexOf(o) >= 0 : r[qid] === o;
      }).length;
      return { label: o, count: k, share: k / base.length };
    })
  };
}

// rows：rowValuesToAnswers 的結果，另可帶 _time（Date）、_approved（布林）、_reply（字串）
function aggregate(rows, now) {
  rows = rows.filter(function (r) { return r.A1 && r.A1 !== '超過一年前的工作'; });
  var full = rows.filter(function (r) { return r.A4 === '全職受僱' && SALARY_BINS.indexOf(r.D1) >= 0; });
  var emp = rows.filter(function (r) { return r.A4 !== FREELANCE; });
  var free = rows.filter(function (r) { return r.A4 === FREELANCE && SALARY_BINS.indexOf(r.D1f) >= 0; });
  var out = {
    year: SURVEY_YEAR, updatedAt: (now || new Date()).toISOString(),
    total: rows.length, fullTime: full.length, freelance: free.length, minCell: MIN_CELL,
    salaryBins: SALARY_BINS, belowStartMaxBin: BELOW_START_MAX_BIN
  };
  if (rows.length < MIN_CELL) { out.tooFew = true; out.comments = []; return out; }

  out.salaryDist = SALARY_BINS.map(function (b) {
    return { label: b, count: full.filter(function (r) { return r.D1 === b; }).length };
  });
  var overall = salaryGroup(full.map(function (r) { return { all: '全部', D1: r.D1 }; }), 'all', ['全部'])[0];
  out.overall = overall;
  // 回捐、加班只問受僱者，分母也只算受僱者
  var empN = Math.max(emp.length, 1);
  out.kpi = {
    refundShare: emp.filter(function (r) { return r.D3 && r.D3 !== '沒有'; }).length / empN,
    unpaidOvertimeShare: emp.filter(function (r) {
      return r.E2.indexOf('無償') >= 0 || r.E2.indexOf('不被允許申報') >= 0;
    }).length / empN,
    leaveShare: rows.filter(function (r) { return r.H1 === '4' || r.H1 === '5'; }).length / rows.length,
    violenceShare: rows.filter(function (r) { return r.G1.length && r.G1.indexOf('都沒有') < 0; }).length / rows.length
  };
  out.byYears = { C3: salaryGroup(full, 'C3', YEAR_BINS), C4: salaryGroup(full, 'C4', YEAR_BINS) };
  out.groups = {
    A2: salaryGroup(full, 'A2', COUNTIES),
    B1: salaryGroup(full, 'B1', findQuestion('B1').options),
    B1b: salaryGroup(full, 'B1b', findQuestion('B1b').options),
    B2: salaryGroup(full, 'B2', findQuestion('B2').options),
    B3: salaryGroup(full, 'B3', findQuestion('B3').options),
    B4: salaryGroup(full, 'B4', findQuestion('B4').options)
  };
  out.dists = {};
  ['D3', 'D4', 'D6', 'D7', 'D8', 'E1', 'E2', 'F2', 'G1', 'G2', 'G3', 'H1', 'H2', 'H3'].forEach(function (id) {
    out.dists[id] = distribution(rows, id);
  });
  // 自由接案另外統計，不混進受僱月薪
  out.free = {
    overall: salaryGroup(free.map(function (r) { return { all: '全部', D1: r.D1f }; }), 'all', ['全部'])[0],
    dists: {}
  };
  ['D1f', 'D1r', 'D1s', 'D1i'].forEach(function (id) { out.free.dists[id] = distribution(rows, id); });
  out.comments = rows.filter(function (r) {
    return r._approved && r.H5 === '同意匿名公開（經審核）' && isFilled(r.H4);
  }).map(function (r) {
    var t = r._time instanceof Date ? r._time : null;
    return {
      text: r.H4, reply: r._reply || '',
      month: t ? t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) : ''
    };
  }).reverse();
  return out;
}
