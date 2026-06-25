# 艦これ 資材・遠征管理ツール

## セットアップ手順

### Step 1 — GitHubリポジトリを作る

1. [github.com](https://github.com) でアカウント作成（または既存アカウントでサインイン）
2. 右上の「+」→「New repository」をクリック
3. 設定：
   - Repository name: `kancolle-manager`（何でもOK）
   - **Private**（自分だけに公開）を選択
   - 「Create repository」をクリック

### Step 2 — ファイルをアップロード

1. 作成したリポジトリのページで「uploading an existing file」をクリック
2. `index.html` と `README.md` をドラッグ&ドロップ
3. 「Commit changes」をクリック

### Step 3 — GitHub Pages を有効化

1. リポジトリの「Settings」タブ
2. 左メニュー「Pages」
3. Source → 「Deploy from a branch」
4. Branch → `main` / `(root)` → 「Save」
5. 数分後に `https://<あなたのID>.github.io/kancolle-manager/` でアクセス可能になります

### Step 4 — Firebaseプロジェクトを作る

1. [console.firebase.google.com](https://console.firebase.google.com) にアクセス
2. 「プロジェクトを追加」→ 名前（例: `kancolle-manager`）→ 作成
3. 左メニュー「Authentication」→「始める」→「Google」を有効化
4. 左メニュー「Firestore Database」→「データベースの作成」
   - 「本番環境モードで開始」を選択
   - ロケーション: `asia-northeast1`（東京）を推奨

### Step 5 — Firebaseの設定値を取得

1. Firebase Console 左上の歯車アイコン →「プロジェクトの設定」
2. 「マイアプリ」セクション →「</>」（ウェブ）をクリック
3. アプリ名を入力 →「アプリを登録」
4. `firebaseConfig` の中身をコピーしておく（次のステップで使用）

### Step 6 — Firestoreのセキュリティルール設定

Firebase Console →「Firestore Database」→「ルール」タブ →以下に書き換えて「公開」:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 7 — index.html に設定を貼り付け

`index.html` の以下の部分（22行目あたり）を実際の値に書き換える:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",          // ← 実際の値に変更
  authDomain: "kancolle-xxx.firebaseapp.com",
  projectId: "kancolle-xxx",
  storageBucket: "kancolle-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Step 8 — 承認済みドメインに追加

1. Firebase Console →「Authentication」→「Settings」→「承認済みドメイン」
2. 「ドメインを追加」→ `<あなたのID>.github.io` を追加

### Step 9 — 更新したファイルをGitHubにアップロード

1. GitHubのリポジトリページで `index.html` をクリック
2. 右上の鉛筆アイコン（Edit）をクリック
3. 全選択して書き換えるか、「...」→「Upload file」で上書き
4. 「Commit changes」

---

## 使い方

- GitHub Pagesの URL にアクセス（bookmarkに追加推奨）
- Googleアカウントでサインイン
- 資材記録・遠征管理が複数端末で自動同期されます

## 費用

- GitHub Pages: **無料**（Privateリポジトリも無料）
- Firebase（Sparkプラン無料枠）: 個人利用なら**ほぼ無料**
  - Firestore: 1日あたり読み取り50,000回・書き込み20,000回まで無料
  - Authentication: 無料

