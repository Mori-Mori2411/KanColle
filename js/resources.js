/* ============================================================
   resources.js — 資材記録の表示・保存・CSV出力
   ============================================================ */

import { db } from './firebase.js';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ---------- 定数 ----------

// 資材の定義リスト。新しい資材を追加するときはここに追記するだけ
export const RES = [
  { key:'fuel',    label:'燃料',    icon:'ti-flame',    cap:350000, color:'#1D9E75' },
  { key:'ammo',    label:'弾薬',    icon:'ti-bomb',     cap:350000, color:'#D85A30' },
  { key:'steel',   label:'鋼材',    icon:'ti-hammer',   cap:350000, color:'#888780' },
  { key:'bauxite', label:'ボーキ',  icon:'ti-diamond',  cap:350000, color:'#BA7517' },
  { key:'bucket',  label:'バケツ',  icon:'ti-droplet',  cap:3000,   color:'#378ADD' },
  { key:'devmat',  label:'開発資材',icon:'ti-tool',     cap:3000,   color:'#534AB7' },
  { key:'modmat',  label:'改修資材',icon:'ti-settings', cap:300,    color:'#993556' }
];

export const RES_KEYS = RES.map(r => r.key);

// ---------- 状態 ----------
let records   = [];       // Firestoreから取得した記録の配列
let unsubscribe = null;   // onSnapshotの解除関数

// ---------- リアルタイム監視 ----------

/**
 * Firestoreの資材記録を監視開始する
 * データが変わるたびに自動で画面を更新する
 * @param {string} uid - ログイン中のユーザーID
 */
export function listenRecords(uid) {
  // 新しい順で最新30件だけ取得するクエリ
  const q = query(
    collection(db, `users/${uid}/records`),
    orderBy('ts', 'desc'),
    limit(30)
  );

  // onSnapshot: データが変わるたびにこの関数が自動で呼ばれる
  unsubscribe = onSnapshot(q, snap => {
    // Firestoreのドキュメントをシンプルなオブジェクトに変換し、古い順に並び替え
    records = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.ts - b.ts);

    renderMetrics();
    renderInputs();
    renderLog();
  });
}

/**
 * 監視を停止する（ログアウト時に呼ぶ）
 */
export function stopListening() {
  if (unsubscribe) unsubscribe();
}

// ---------- 保存 ----------

/**
 * 入力欄の値をFirestoreに1件追加する
 * @param {string} uid - ログイン中のユーザーID
 */
export async function saveRecord(uid) {
  const entry = {
    ts:   Date.now(),
    memo: document.getElementById('inp-memo').value.trim()
  };

  // 各資材の入力値を読み取る
  RES_KEYS.forEach(k => {
    entry[k] = parseInt(document.getElementById('inp-' + k).value) || 0;
  });

  // Firestoreのコレクションに追加（IDは自動生成）
  await addDoc(collection(db, `users/${uid}/records`), entry);

  document.getElementById('inp-memo').value = '';
}

// ---------- 画面描画 ----------

/**
 * 上部の資材カード（現在値・差分・バー）を描画する
 */
export function renderMetrics() {
  const last = records.length ? records[records.length - 1] : null;
  const prev = records.length > 1 ? records[records.length - 2] : null;

  document.getElementById('metrics').innerHTML = RES.map(r => {
    const v   = last ? (last[r.key] || 0) : 0;
    const d   = prev ? v - (prev[r.key] || 0) : null;
    const pct = Math.min(100, Math.round(v / r.cap * 100));

    // 差分の表示（プラスは緑・マイナスは赤）
    let deltaHtml = '';
    if (d !== null) {
      const cls  = d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero';
      const sign = d > 0 ? '+' : '';
      deltaHtml = `<div class="mc-delta ${cls}">${sign}${d.toLocaleString()}</div>`;
    }

    return `
      <div class="mc">
        <div class="mc-label">
          <i class="ti ${r.icon}" style="font-size:13px"></i>${r.label}
        </div>
        <div class="mc-val">${v.toLocaleString()}</div>
        ${deltaHtml}
        <div class="cap-bar">
          <div class="cap-fill" style="width:${pct}%;background:${r.color}"></div>
        </div>
      </div>`;
  }).join('');
}

/**
 * 資材入力欄を描画する（前回値を初期値として表示）
 */
export function renderInputs() {
  const last = records.length ? records[records.length - 1] : null;

  document.getElementById('inp-grid').innerHTML = RES.map(r => `
    <div class="inp-row">
      <label>
        <i class="ti ${r.icon}" style="font-size:13px"></i>${r.label}
      </label>
      <input type="number"
             id="inp-${r.key}"
             value="${last ? last[r.key] : 0}"
             min="0"
             max="${r.cap}">
    </div>`).join('');
}

/**
 * 履歴テーブルを描画する
 */
export function renderLog() {
  const body = document.getElementById('log-body');
  const rows = [...records].reverse();

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:1rem">記録がありません</td></tr>';
    return;
  }

  body.innerHTML = rows.map((entry, i) => {
    const prev    = rows[i + 1];
    const dt      = new Date(entry.ts);
    const dateStr = `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;

    const cells = RES_KEYS.map(k => {
      const v   = entry[k] || 0;
      const d   = prev ? v - (prev[k] || 0) : null;
      let sub   = '';
      if (d !== null) {
        const cls  = d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero';
        const sign = d > 0 ? '+' : '';
        sub = `<br><span class="${cls}" style="font-size:10px">${sign}${d.toLocaleString()}</span>`;
      }
      return `<td>${v.toLocaleString()}${sub}</td>`;
    }).join('');

    return `<tr>
      <td>${dateStr}</td>
      ${cells}
      <td style="color:var(--text2)">${entry.memo || ''}</td>
    </tr>`;
  }).join('');
}

// ---------- CSVエクスポート ----------

/**
 * 記録データをCSVファイルとしてダウンロードする
 */
export function downloadCSV() {
  if (!records.length) return;

  const header = '日時,燃料,弾薬,鋼材,ボーキ,バケツ,開発資材,改修資材,メモ';

  const rows = records.map(r => {
    const dt      = new Date(r.ts);
    const dateStr = `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    const memo    = (r.memo || '').includes(',') ? `"${r.memo}"` : (r.memo || '');
    return [dateStr, r.fuel||0, r.ammo||0, r.steel||0, r.bauxite||0, r.bucket||0, r.devmat||0, r.modmat||0, memo].join(',');
  });

  const csv = header + '\n' + rows.join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'kancolle_resources.csv';
  a.click();
}
