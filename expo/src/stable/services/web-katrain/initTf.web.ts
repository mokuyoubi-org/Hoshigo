// @/src/stable/services/web-katrain/initTf.web.ts
// ====================================================================================
// 【ファイル全体の責務】
// 🫐Web環境でAI（TensorFlow.js）を動かすために、最適な計算エンジン（WebGPU > WebGL > WASM > CPU）を
// 自動で選んで安全に起動する「エンジン起動ボタン」を提供する。
// ====================================================================================

// ====================================================================================
// 【ロジックパート】
// ====================================================================================
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";

// 🟩初期化状態と、進行中の Promise を保持する変数（二重実行を完全に防ぐため）
let initialized = false;
let initPromise: Promise<void> | null = null;

// 🟩実際にバックエンドを探して初期化する内部処理
async function runInitTf(): Promise<void> {
  // すでに初期化済みなら何もしない
  if (initialized || tf.getBackend()) {
    initialized = true;
    return;
  }

  // 優先度の高い順に試していく
  const backends = ["webgpu", "webgl", "wasm", "cpu"];

  for (const backend of backends) {
    try {
      if (await tf.setBackend(backend)) {
        initialized = true;
        console.info(`[katago] TF.js 初期化成功: backend=${backend}`);
        return;
      }
    } catch {
      // 失敗したら次のバックエンドを試す
    }
  }

  throw new Error("No TF backend available");
}

// ====================================================================================
// 【インターフェースパート】（仕様・説明書）
// ====================================================================================

/**
 * 🟩🟦使い方:
 * await initTf() で呼び出す
 * パソコンやブラウザの性能に合わせて自動で一番良い計算エンジンを選んで起動してくれる。
 * 何回同時に呼び出しても、安全に1回だけ初期化されるから環境やタイミングを気にせず安心して使っていい
 */
export async function initTf(): Promise<void> {
  if (initialized) return;

  // 同時に複数回呼ばれた場合は、最初の初期化処理が終わるのをみんなで待つ
  if (!initPromise) {
    initPromise = runInitTf().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
}
