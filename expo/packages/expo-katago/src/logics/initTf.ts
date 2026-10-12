// initTf.ts

// 【ファイル全体の責務】
// WebView環境でAI（TensorFlow.js）を動かすために、最適な計算エンジン（WebGPU > WebGL > WASM > CPU）を
// 自動で選んで安全に起動する「エンジン起動ボタン」を提供する。

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";

// 初期化状態と、進行中の Promise を保持する変数（二重実行を完全に防ぐため）
let initialized = false;
let initPromise: Promise<void> | null = null;

// 実際にバックエンドを探して初期化する内部処理
const runInitTf = async (): Promise<void> => {
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
};

export const initTf = async (): Promise<void> => {
  // 🛡️ガード
  if (initialized) return;

  // 同時に複数回呼ばれた場合は、最初の初期化処理が終わるのをみんなで待つ
  if (!initPromise) {
    initPromise = runInitTf().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
};
