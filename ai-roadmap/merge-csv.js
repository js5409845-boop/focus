#!/usr/bin/env node
/* ============================================================
 * 여러 참여자가 각자 다운로드한 CSV(개발자 도구 > CSV Export)를
 * 하나의 CSV로 합친다. localStorage 기반 MVP라 참여자별 파일이
 * 흩어져 있으므로, 운영자가 파일들을 한 폴더에 모은 뒤 이 스크립트로
 * 합쳐서 분석하면 된다.
 *
 * 사용법:
 *   node merge-csv.js <파일.csv 또는 폴더> [<파일.csv 또는 폴더> ...] > combined.csv
 *
 * 예)
 *   node merge-csv.js ./exports > combined.csv        # 폴더 안 .csv 전부
 *   node merge-csv.js a.csv b.csv c.csv > combined.csv  # 파일 나열
 *
 * 결과(CSV)는 표준출력(stdout)으로, 진행 로그는 표준에러(stderr)로
 * 나가므로 리다이렉트(>)해도 combined.csv에는 CSV만 담긴다.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var LOGIC = require('./logic.js');

/** 따옴표로 감싼 필드 안의 콤마/줄바꿈까지 올바르게 처리하는 최소 CSV 파서 */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM 제거
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* CRLF의 \r은 무시 */ }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else { field += c; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(function (r) { return !(r.length === 1 && r[0] === ''); });
}

function collectFiles(args) {
  var files = [];
  args.forEach(function (a) {
    var stat;
    try {
      stat = fs.statSync(a);
    } catch (e) {
      console.error('파일을 찾을 수 없습니다: ' + a);
      process.exit(1);
    }
    if (stat.isDirectory()) {
      fs.readdirSync(a)
        .filter(function (f) { return f.toLowerCase().endsWith('.csv'); })
        .sort()
        .forEach(function (f) { files.push(path.join(a, f)); });
    } else {
      files.push(a);
    }
  });
  return files;
}

function main() {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('사용법: node merge-csv.js <csv 파일 또는 폴더...> > combined.csv');
    process.exit(1);
  }

  var files = collectFiles(args);
  if (files.length === 0) {
    console.error('합칠 CSV 파일이 없습니다.');
    process.exit(1);
  }

  var header = null;
  var dataRows = [];
  var seenParticipants = {};
  var dupCount = 0;

  files.forEach(function (file) {
    var text = fs.readFileSync(file, 'utf8');
    var rows = parseCsv(text);
    if (rows.length === 0) {
      console.error('⚠ 빈 파일이라 건너뜁니다: ' + file);
      return;
    }
    var fileHeader = rows[0];
    if (!header) {
      header = fileHeader;
    } else if (fileHeader.join(',') !== header.join(',')) {
      console.error('⚠ 헤더가 기준 파일과 다릅니다(그래도 데이터는 포함합니다): ' + file);
    }

    rows.slice(1).forEach(function (row) {
      var participantId = row[0];
      if (participantId && seenParticipants[participantId]) {
        dupCount++;
        console.error('⚠ 중복된 참여코드 발견 - 두 행 모두 포함합니다: ' + participantId + ' (' + file + ')');
      }
      if (participantId) seenParticipants[participantId] = true;
      dataRows.push(row);
    });
  });

  if (!header) {
    console.error('유효한 헤더를 찾지 못했습니다.');
    process.exit(1);
  }
  if (header.join(',') !== LOGIC.CSV_COLUMNS.join(',')) {
    console.error('⚠ 헤더가 현재 앱의 CSV_COLUMNS 정의와 다릅니다. 앱 버전이 다른 파일이 섞였을 수 있습니다.');
  }

  var lines = [header.map(LOGIC.escapeCsvValue).join(',')];
  dataRows.forEach(function (row) {
    lines.push(row.map(LOGIC.escapeCsvValue).join(','));
  });

  process.stdout.write('﻿' + lines.join('\n') + '\n');
  console.error(
    files.length + '개 파일에서 참여자 ' + dataRows.length + '명 데이터를 합쳤습니다.' +
    (dupCount ? (' (중복 참여코드 ' + dupCount + '건 발견 - 확인 필요)') : '')
  );
}

main();
