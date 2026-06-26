/* ============================================================
   expedition.js — 遠征の追加・表示・理論値計算
   ============================================================ */

import { db } from './firebase.js';
import { RES_KEYS, RES } from './resources.js';
import {
  doc,
  setDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ---------- 定数 ----------

// 時間帯ごとの設定。表示名・バッジ・理論値計算のデフォルト時間
export const EXP_SLOTS = {
  game:  { label:'ゲーム中', badge:'badge-game',  defaultHours:2 },
  out:   { label:'外出中',   badge:'badge-out',   defaultHours:4 },
  sleep: { label:'就寝前',   badge:'badge-sleep', defaultHours:8 }
};

// resources.jsのRESからマップ形式（key → オブジェクト）に変換
const RES_MAP = Object.fromEntries(RES.map(r => [r.key, r]));

// ---------- 状態 ----------
let expeditions  = { game:[], out:[], sleep:[] };  // 遠征データ
let currentSlot  = 'game';                         // 現在選択中のタブ
let currentUid   = null;                           // ログイン中のユーザーID
let unsubscribe  = null;                           // onSnapshotの解除関数

// ---------- リアルタイム監視 ----------

/**
 * Firestoreの遠征データを監視開始する
 * @param {string} uid - ログイン中のユーザーID
 */
export function listenExpeditions(uid) {
  currentUid = uid;

  // 遠征データは1つのドキュメントにまとめて保存している
  unsubscribe = onSnapshot(
    doc(db, `users/${uid}/data/expeditions`),
    snap => {
      if (snap.exists()) {
        const d = snap.data();
        expeditions = {
          game:  d.game  || [],
          out:   d.out   || [],
          sleep: d.sleep || []
        };
      }
      renderAllSlots();
    }
  );
}

/**
 * 監視を停止する（ログアウト時に呼ぶ）
 */
export function stopListeningExp() {
  if (unsubscribe) unsubscribe();
}

// ---------- タブ切り替え ----------

/**
 * 遠征タブを切り替える
 * @param {string} slot - 'game' | 'out' | 'sleep'
 */
export function switchExpTab(slot) {
  currentSlot = slot;

  // タブボタンのactive切り替え
  document.querySelectorAll('.exp-tab').forEach((t, i) => {
    t.classList.toggle('active', ['game', 'out', 'sleep'][i] === slot);
  });

  // セクションの表示切り替え
  document.querySelectorAll('.exp-sec').forEach(s => s.classList.remove('active'));
  document.getElementById('exp-' + slot).classList.add('active');

  // 追加フォームの時間帯セレクトも連動して変更
  document.getElementById('f-slot').value = slot;
}

// ---------- 追加・削除 ----------

/**
 * フォームの入力内容を読み取って遠征を追加する
 */
export async function addExpedition() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) {
    document.getElementById('f-name').focus();
    return;
  }

  const slot = document.getElementById('f-slot').value;

  // 報酬の入力値を各資材ごとに読み取る
  const reward = {};
  RES_KEYS.forEach(k => {
    reward[k] = parseInt(document.getElementById('r-' + k).value) || 0;
  });

  // 遠征オブジェクトを配列に追加
  expeditions[slot].push({
    name,
    dur:    parseInt(document.getElementById('f-dur').value) || 0,
    fleet:  document.getElementById('f-fleet').value.trim(),
    cond:   document.getElementById('f-cond').value.trim(),
    note:   document.getElementById('f-note').value.trim(),
    reward,
    bonus:  document.getElementById('r-bonus').value
  });

  // フォームをリセット
  ['f-name', 'f-dur', 'f-fleet', 'f-cond', 'f-note'].forEach(id => {
    document.getElementById(id).value = '';
  });
  RES_KEYS.forEach(k => document.getElementById('r-' + k).value = 0);

  await saveExpeditions();
  switchExpTab(slot);
}

/**
 * 指定した遠征を削除する
 * @param {string} slot - 'game' | 'out' | 'sleep'
 * @param {number} index - 配列のインデックス
 */
export async function deleteExpedition(slot, index) {
  expeditions[slot].splice(index, 1);
  await saveExpeditions();
  renderSlot(slot);
}

/**
 * 遠征データをFirestoreに保存する
 * 全スロットをまとめて1つのドキュメントとして上書き保存
 */
async function saveExpeditions() {
  await setDoc(
    doc(db, `users/${currentUid}/data/expeditions`),
    expeditions
  );
}

// ---------- 画面描画 ----------

/**
 * 全スロット（game/out/sleep）を描画する
 */
export function renderAllSlots() {
  Object.keys(EXP_SLOTS).forEach(slot => renderSlot(slot));
}

/**
 * 指定したスロットの遠征一覧＋理論値ボックスを描画する
 * @param {string} slot - 'game' | 'out' | 'sleep'
 */
export function renderSlot(slot) {
  const el   = document.getElementById('exp-' + slot);
  const exps = expeditions[slot] || [];
  const s    = EXP_SLOTS[slot];

  el.innerHTML = buildTheoryHtml(slot, exps, s.defaultHours) + buildExpCardsHtml(exps, slot);
}

/**
 * 理論値ボックスのHTMLを組み立てる
 */
function buildTheoryHtml(slot, exps, hours) {
  if (!exps.length) return '';

  const totals = calcTotals(exps, hours);
  const hasAny = RES_KEYS.some(k => totals[k] > 0);
  if (!hasAny) return '';

  const items = RES_KEYS
    .filter(k => totals[k] > 0)
    .map(k => `
      <div class="tv-item">
        <div class="tv-label">
          <i class="ti ${RES_MAP[k].icon}" style="font-size:11px"></i>${RES_MAP[k].label}
        </div>
        <div class="tv-val" id="tv-${slot}-${k}">${totals[k].toLocaleString()}</div>
      </div>`)
    .join('');

  return `
    <div class="theory-box">
      <div class="theory-header">
        <span class="theory-label">
          <i class="ti ti-calculator" style="font-size:13px"></i>
          <span id="tlabel-${slot}">${hours}時間</span> 大成功理論値合計
        </span>
        <div class="theory-hours">
          <input type="number"
                 id="th-${slot}"
                 value="${hours}"
                 min="1" max="24"
                 oninput="window.updateTheory('${slot}', this.value)">
          <span style="font-size:12px;color:var(--text3)">時間</span>
        </div>
      </div>
      <div class="theory-grid" id="tg-${slot}">${items}</div>
    </div>`;
}

/**
 * 遠征カード一覧のHTMLを組み立てる
 */
function buildExpCardsHtml(exps, slot) {
  if (!exps.length) {
    return `<div class="empty">
      <i class="ti ti-ship" style="font-size:20px;display:block;margin-bottom:6px"></i>
      遠征が未登録です
    </div>`;
  }

  return exps.map((e, i) => {
    const durLabel = e.dur
      ? (e.dur >= 60 ? Math.floor(e.dur / 60) + '時間' : '') + (e.dur % 60 ? e.dur % 60 + '分' : '')
      : '時間未設定';

    const chips = RES_KEYS
      .filter(k => (e.reward[k] || 0) > 0)
      .map(k => `
        <span class="chip">
          <i class="ti ${RES_MAP[k].icon}" style="font-size:11px"></i>
          ${RES_MAP[k].label} ${e.reward[k]}
        </span>`)
      .join('');

    return `
      <div class="exp-card">
        <div class="exp-header">
          <div>
            <div class="exp-name">${e.name}</div>
            <div class="exp-time">
              <i class="ti ti-clock" style="font-size:12px"></i>
              ${durLabel}　大成功×${e.bonus}
            </div>
          </div>
          <button class="danger"
                  onclick="window.deleteExpedition('${slot}', ${i})"
                  aria-label="削除">
            <i class="ti ti-trash"></i>
          </button>
        </div>
        <div class="exp-detail-grid">
          ${e.fleet ? `
            <div>
              <div class="exp-field-label">
                <i class="ti ti-ship" style="font-size:11px"></i>編成条件
              </div>
              <div class="exp-field-val">${e.fleet}</div>
            </div>` : ''}
          ${e.cond ? `
            <div>
              <div class="exp-field-label">
                <i class="ti ti-star" style="font-size:11px"></i>大成功条件
              </div>
              <div class="exp-field-val">${e.cond}</div>
            </div>` : ''}
          ${e.note ? `
            <div style="grid-column:1/-1">
              <div class="exp-field-label">
                <i class="ti ti-pencil" style="font-size:11px"></i>備考
              </div>
              <div class="exp-field-val">${e.note}</div>
            </div>` : ''}
        </div>
        ${chips ? `
          <div style="margin-top:6px;font-size:11px;color:var(--text3);margin-bottom:3px">通常報酬</div>
          <div class="reward-chips">${chips}</div>` : ''}
      </div>`;
  }).join('');
}

// ---------- 理論値計算 ----------

/**
 * 指定時間内の遠征回数 × 大成功報酬を合算する
 * @param {Array}  exps  - 遠征の配列
 * @param {number} hours - 計算する時間数
 * @returns {Object} 資材ごとの合計値
 */
function calcTotals(exps, hours) {
  const totals = {};
  RES_KEYS.forEach(k => totals[k] = 0);

  exps.forEach(e => {
    const runs  = e.dur > 0 ? Math.floor(hours * 60 / e.dur) : 0;
    const bonus = parseFloat(e.bonus) || 1.5;
    RES_KEYS.forEach(k => {
      totals[k] += Math.round((e.reward[k] || 0) * bonus) * runs;
    });
  });

  return totals;
}

/**
 * 時間入力が変わったときに理論値だけ再計算して更新する
 * （カード全体を再描画せず軽く済ませる）
 */
export function updateTheory(slot, hoursVal) {
  const hours  = Math.max(1, parseInt(hoursVal) || 1);
  const label  = document.getElementById('tlabel-' + slot);
  if (label) label.textContent = hours + '時間';

  const totals = calcTotals(expeditions[slot] || [], hours);
  RES_KEYS.forEach(k => {
    const el = document.getElementById('tv-' + slot + '-' + k);
    if (el) el.textContent = totals[k].toLocaleString();
  });
}
