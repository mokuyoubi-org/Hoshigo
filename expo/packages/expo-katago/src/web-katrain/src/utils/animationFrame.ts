// 2026/10/10: AnimationFrameApiというTypeの削除

export type AnimationFrameHandle =
  | { kind: "raf"; id: number }
  | { kind: "timeout"; id: ReturnType<typeof setTimeout> };

export const getAnimationFrameApi = () => {
  try {
    const request = globalThis.requestAnimationFrame;
    const cancel = globalThis.cancelAnimationFrame;
    if (typeof request !== "function" || typeof cancel !== "function")
      return null;
    return {
      request: request.bind(globalThis),
      cancel: cancel.bind(globalThis),
    };
  } catch {
    return null;
  }
};

export const getAnimationNow = () => {
  try {
    const now = globalThis.performance?.now;
    if (typeof now === "function") return now.call(globalThis.performance);
  } catch {
    // Fall back below.
  }
  return Date.now();
};

export const requestAnimationFrameSafe = (callback: FrameRequestCallback) => {
  const api = getAnimationFrameApi();
  if (api) {
    return { kind: "raf", id: api.request(callback) };
  }

  const id = setTimeout(() => {
    callback(getAnimationNow());
  }, 16);
  return { kind: "timeout", id };
};

export const cancelAnimationFrameSafe = (
  handle: AnimationFrameHandle | null | undefined,
) => {
  if (!handle) return;
  if (handle.kind === "timeout") {
    clearTimeout(handle.id);
    return;
  }
  const api = getAnimationFrameApi();
  try {
    api?.cancel(handle.id);
  } catch {
    // Cancellation is best effort if the API disappears mid-frame.
  }
};

export const afterAnimationFrames = (count = 1) => {
  if (count <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let remaining = count;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrameSafe(step);
    };
    requestAnimationFrameSafe(step);
  });
};
