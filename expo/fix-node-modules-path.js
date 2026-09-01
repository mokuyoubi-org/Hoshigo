/* eslint-env node */
/* eslint-disable no-undef */
/**
 * fix-node-modules-path.js
 *
 * Cloudflare Pages は "node_modules" という名前を含むパスを
 * デプロイ時に無視してしまう。
 * Expo の web export では一部のアセット(vector-icons のフォント等)が
 * dist/assets/node_modules/... に出力されてしまうため、
 * このスクリプトでビルド後に "node_modules" を含むパスを
 * "npm-modules" にリネームし、バンドルされたJS/CSS内の参照文字列も
 * あわせて書き換える。
 *
 * 使い方: expo export の後に実行する
 *   npx expo export -p web && node fix-node-modules-path.js
 */

const fs = require("fs");
const path = require("path");

const DIST_DIR = path.join(__dirname, "dist");
const OLD_SEGMENT = "node_modules";
const NEW_SEGMENT = "npm-modules";

// dist フォルダ内から "node_modules" という名前のディレクトリを再帰的に探す
function findDirsByName(rootDir, targetName) {
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (_err) {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.name === targetName) {
        results.push(fullPath);
        // ネストしてさらに node_modules があるケースも一応再帰する
      }
      walk(fullPath);
    }
  }

  walk(rootDir);
  return results;
}

// ディレクトリを再帰コピーしてから元を削除(=リネーム相当)
function moveDirRecursive(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  fs.rmSync(src, { recursive: true, force: true });
}

// テキストファイル(js, css, html, json, map)内の文字列を置換
const TEXT_EXTENSIONS = new Set([".js", ".css", ".html", ".json", ".map"]);

function replaceInAllTextFiles(rootDir, searchStr, replaceStr) {
  let filesChanged = 0;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name);
        if (TEXT_EXTENSIONS.has(ext)) {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes(searchStr)) {
            const updated = content.split(searchStr).join(replaceStr);
            fs.writeFileSync(fullPath, updated, "utf8");
            filesChanged++;
          }
        }
      }
    }
  }

  walk(rootDir);
  return filesChanged;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      `❌ ${DIST_DIR} が見つかりません。先に expo export を実行してください。`,
    );
    process.exit(1);
  }

  // 1. "assets/node_modules/..." のようなパスを含む node_modules ディレクトリを探す
  const nodeModulesDirs = findDirsByName(DIST_DIR, OLD_SEGMENT);

  if (nodeModulesDirs.length === 0) {
    console.log(
      "ℹ️ node_modules という名前のディレクトリは見つかりませんでした。何もしません。",
    );
    return;
  }

  console.log(
    `🔍 ${nodeModulesDirs.length} 件の node_modules ディレクトリを検出:`,
  );
  nodeModulesDirs.forEach((d) =>
    console.log(`  - ${path.relative(DIST_DIR, d)}`),
  );

  // 2. それぞれをリネーム(移動)する
  //    深い方から処理しないと、親を先に消してしまうと壊れるため長いパス順にソート
  nodeModulesDirs
    .sort((a, b) => b.length - a.length)
    .forEach((oldPath) => {
      const newPath = oldPath.replace(
        new RegExp(`${OLD_SEGMENT}(?!.*${OLD_SEGMENT})`),
        NEW_SEGMENT,
      );
      moveDirRecursive(oldPath, newPath);
      console.log(
        `✅ 移動: ${path.relative(DIST_DIR, oldPath)} → ${path.relative(DIST_DIR, newPath)}`,
      );
    });

  // 3. JS/CSS/HTML内の参照パス文字列を書き換える
  //    実際に使われている公開URLのプレフィックスに合わせて置換する
  const searchStr = `assets/${OLD_SEGMENT}`;
  const replaceStr = `assets/${NEW_SEGMENT}`;
  const changedCount = replaceInAllTextFiles(DIST_DIR, searchStr, replaceStr);

  console.log(`✅ ${changedCount} 件のファイル内の参照パスを書き換えました。`);
  console.log(
    "🎉 完了!Cloudflare Pages にデプロイしても node_modules が原因で無視されなくなるはずです。",
  );
}

main();
