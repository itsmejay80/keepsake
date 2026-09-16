const X_WIDGETS_SCRIPT_ID = "x-widgets-js";
export const X_WIDGETS_SCRIPT_SRC = "https://platform.x.com/widgets.js";

type XWidgets = {
  ready?: (callback: () => void) => void;
  widgets: {
    load: (element?: HTMLElement) => void;
    createTweet?: (
      tweetId: string,
      target: HTMLElement,
      options?: Record<string, unknown>,
    ) => Promise<HTMLElement | undefined>;
  };
};

function getXWidgets(): XWidgets | undefined {
  return (window as Window & { twttr?: XWidgets }).twttr;
}

export function getXStatusPermalink(statusId: string): string {
  return `https://x.com/i/status/${statusId}`;
}

export function loadXWidgets(): Promise<XWidgets> {
  const existing = getXWidgets();
  if (existing?.widgets) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const settle = () => {
      const widgets = getXWidgets();
      if (widgets?.widgets) {
        resolve(widgets);
        return;
      }
      reject(new Error("X widgets failed to load"));
    };

    const onReady = () => {
      const widgets = getXWidgets();
      if (widgets?.ready) {
        widgets.ready(settle);
        return;
      }
      settle();
    };

    const current = document.getElementById(X_WIDGETS_SCRIPT_ID);
    if (current) {
      current.addEventListener("load", onReady, { once: true });
      current.addEventListener(
        "error",
        () => reject(new Error("X widgets failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = X_WIDGETS_SCRIPT_ID;
    script.src = X_WIDGETS_SCRIPT_SRC;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("X widgets failed to load"));
    document.body.appendChild(script);
  });
}
