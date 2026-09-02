/* ============================================================
 * AI 활용역량 로드맵 - 구글시트 자동 수집 웹훅
 *
 * 이 파일은 이 저장소가 아니라 "구글시트의 Apps Script 편집기"에
 * 붙여넣어서 사용하는 서버리스 스크립트입니다. (설치 방법은
 * README 안내 또는 대화 내 설명 참고)
 *
 * 참여자의 브라우저(app.js)가 진단/Challenge/설문을 완료할 때마다
 * 이 스크립트로 데이터를 fire-and-forget 방식(no-cors)으로 전송하면,
 * 이 스크립트가 참여코드(participantId) 기준으로 시트의 행을
 * upsert(있으면 갱신, 없으면 추가)합니다.
 *
 * - AssessmentData 시트: 진단/Challenge/설문 데이터 (연락처 없음)
 * - RewardData 시트: 경품 응모 연락처만 별도 저장 (진단 데이터와 분리)
 * ============================================================ */

// ai-roadmap/logic.js 의 CSV_COLUMNS 와 동일한 순서로 유지해야 한다.
// (앱의 CSV export 스키마가 바뀌면 이 배열도 함께 수정할 것)
var ASSESSMENT_HEADERS = [
  'participantId',
  'preExploration', 'preInstruction', 'preVerification', 'preApplication', 'preExpansion', 'preOverall', 'preLevel',
  'postExploration', 'postInstruction', 'postVerification', 'postApplication', 'postExpansion', 'postOverall', 'postLevel',
  'explorationChange', 'instructionChange', 'verificationChange', 'applicationChange', 'expansionChange', 'overallChange',
  'recommendedChallenges', 'completedChallenges', 'completionRate',
  'challengeSatisfaction',
  'helpfulness', 'behaviorChange', 'satisfaction',
  'createdAt', 'postCompletedAt'
];

var REWARD_HEADERS = ['participantId', 'nameOrNickname', 'contact', 'submittedAt'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = JSON.parse(e.postData.contents);
    var isReward = payload.sheet === 'reward';
    var sheetName = isReward ? 'RewardData' : 'AssessmentData';
    var headers = isReward ? REWARD_HEADERS : ASSESSMENT_HEADERS;
    var sheet = getOrCreateSheet(sheetName, headers);
    upsertRow(sheet, headers, payload.data || {});
    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** participantId가 같은 행이 있으면 값이 있는 필드만 덮어쓰고, 없으면 새 행을 추가한다. */
function upsertRow(sheet, headers, data) {
  var pid = data.participantId;
  var lastRow = sheet.getLastRow();
  var targetRow = -1;

  if (pid && lastRow >= 2) {
    var idColIndex = headers.indexOf('participantId') + 1;
    var ids = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === pid) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow === -1) {
    var newRow = headers.map(function (h) {
      var v = data[h];
      return (v === undefined || v === null) ? '' : v;
    });
    sheet.appendRow(newRow);
  } else {
    headers.forEach(function (h, idx) {
      var v = data[h];
      if (v !== undefined && v !== null && v !== '') {
        sheet.getRange(targetRow, idx + 1).setValue(v);
      }
    });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 배포 후 브라우저로 웹앱 URL에 직접 접속(GET)했을 때 상태 확인용 */
function doGet() {
  return jsonOutput({ ok: true, message: 'AI 활용역량 로드맵 webhook is running.' });
}
