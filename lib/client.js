window.__ModuleLoader__.load({
	id: "dsh-password-login",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  SettingsTab: () => SettingsTab,
  apply: () => apply,
  createInitialUiState: () => createInitialUiState,
  createStore: () => createStore2,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var React2 = __toESM(require("react"), 1);

// src/client/SettingsTab.tsx
var React = __toESM(require("react"), 1);

// src/client/primitives.ts
var import_react = require("react");
var P = (() => {
  try {
    const mod = require("@deepseek-ai/dsh-client-ui-primitives");
    const pick = (...names) => {
      for (const name of names) {
        const found = mod[name];
        if (typeof found === "function" || typeof found === "object" && found !== null && "$$typeof" in found) {
          return found;
        }
      }
      return void 0;
    };
    const markdownText = pick("MarkdownText");
    const messageText = mod.MessageText !== void 0 ? pick("MessageText") : (props) => (0, import_react.createElement)(markdownText, {
      text: props.text,
      labels: { code: { copyLabel: "\u590D\u5236", copiedLabel: "\u5DF2\u590D\u5236" }, footnotes: "\u811A\u6CE8" }
    });
    return {
      Button: pick("Button"),
      Pill: pick("Pill"),
      Input: pick("Input"),
      StateDot: pick("StateDot"),
      Menu: pick("Menu"),
      DisclosureRow: pick("DisclosureRow"),
      Toast: pick("Toast"),
      RiskConfirmation: pick("RiskConfirmation"),
      MessageText: messageText,
      IconPlusOutline16: pick("IconPlusOutlineMedium", "IconPlusOutline16"),
      IconCheckOutline16: pick("IconCheckOutlineMedium", "IconCheckOutline16"),
      IconCheckOutline14: pick("IconCheckOutlineRegular", "IconCheckOutline14"),
      IconChevronDownOutline14: pick("IconChevronDownOutlineRegular", "IconChevronDownOutline14"),
      IconEllipsisOutline16: pick("IconEllipsisOutlineMedium", "IconEllipsisOutline16"),
      IconTrashOutline16: pick("IconTrashOutlineMedium", "IconTrashOutline16"),
      IconSendOutline16: pick("IconSendOutlineMedium", "IconSendOutline16"),
      IconPlayOutline16: pick("IconPlayOutlineMedium", "IconPlayOutline16"),
      IconPauseOutline16: pick("IconPauseOutlineMedium", "IconPauseOutline16"),
      IconRefreshOutline16: pick("IconRefreshOutlineMedium", "IconRefreshOutline16"),
      IconClockOutline16: pick("IconClockOutlineMedium", "IconClockOutline16"),
      IconWarningOutline16: pick("IconWarningOutlineMedium", "IconWarningOutline16")
    };
  } catch {
    return null;
  }
})();
var U = P;

// src/client/password-tab.css
var password_tab_default = "/*\n * dsh-password-login settings tab stylesheet. Colors/spacing ride the host\n * --dsw-alias-* token system so light/dark themes follow the host.\n */\n\n.pl-root {\n  --pl-fs-base: 13px;\n  --pl-fs-caption: 11px;\n  --pl-gap: 8px;\n  font-family: var(--dsw-font-family, inherit);\n  font-size: var(--pl-fs-base);\n  color: var(--dsw-alias-label-primary);\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  max-width: 460px;\n}\n\n.pl-header {\n  display: flex;\n  align-items: center;\n  gap: var(--pl-gap);\n  flex-wrap: wrap;\n}\n\n.pl-title {\n  font-weight: 600;\n}\n\n.pl-caption {\n  font-size: var(--pl-fs-caption);\n  color: var(--dsw-alias-label-secondary);\n}\n\n.pl-banner {\n  border: 1px solid var(--dsw-alias-border-l);\n  background: var(--dsw-alias-bg-layer-l, transparent);\n  border-radius: 8px;\n  padding: 8px 10px;\n  font-size: var(--pl-fs-base);\n}\n\n.pl-banner-warn { color: var(--dsw-alias-state-warn-primary); }\n.pl-banner-ok { color: var(--dsw-alias-state-success-primary); }\n.pl-banner-error { color: var(--dsw-alias-state-error-primary); }\n\n.pl-form {\n  display: flex;\n  flex-direction: column;\n  gap: var(--pl-gap);\n}\n\n.pl-row {\n  display: grid;\n  grid-template-columns: 96px 1fr;\n  gap: var(--pl-gap);\n  align-items: center;\n}\n\n.pl-label {\n  color: var(--dsw-alias-label-secondary);\n}\n\n.pl-actions {\n  display: flex;\n  gap: 6px;\n  padding-left: calc(96px + var(--pl-gap));\n}\n\n.pl-hint {\n  font-size: var(--pl-fs-caption);\n  color: var(--dsw-alias-label-caption, var(--dsw-alias-label-dimmed));\n  line-height: 1.6;\n}\n\n.pl-hint code {\n  font-family: var(--dsw-font-family, monospace);\n  background: var(--dsw-alias-bg-layer-l, transparent);\n  padding: 0 4px;\n  border-radius: 4px;\n}\n";

// src/client/styles.ts
var STYLE_TAG = "dsh-password-login";
function injectStyles() {
  if (typeof document === "undefined") return;
  const selector = "style[data-plugin-css=" + JSON.stringify(STYLE_TAG) + "]";
  if (document.querySelector(selector) !== null) return;
  const style = document.createElement("style");
  style.setAttribute("data-plugin-css", STYLE_TAG);
  style.textContent = password_tab_default;
  document.head.append(style);
}

// src/client/SettingsTab.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function SettingsTab(props) {
  injectStyles();
  const { state, store } = props;
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const configured = state.status?.configured === true;
  const stale = state.status?.stale === true;
  if (P === null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pl-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pl-banner pl-banner-error", children: "\u5BBF\u4E3B\u672A\u4F9B\u7ED9 dsh UI \u539F\u8BED\u6A21\u5757\uFF0C\u9762\u677F\u4E0D\u53EF\u7528\uFF1B\u5BC6\u7801\u4ECD\u53EF\u7ECF /plugins/dsh-password-login/login \u4E0E /rotate \u7AEF\u70B9\u7BA1\u7406\u3002" }) });
  }
  const submit = () => {
    if (next !== confirm) {
      return;
    }
    const input = configured ? { current, next } : { next };
    void store.rotate(input).then((ok) => {
      if (ok) {
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pl-root", "data-pl": "root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pl-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(P.StateDot, { state: configured ? "done" : "warning", size: 10 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pl-title", children: "\u767B\u5F55\u5BC6\u7801" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pl-caption", children: configured ? "\u5DF2\u914D\u7F6E\uFF1A\u4EFB\u4F55\u5BF9\u7AEF\uFF08\u542B\u672C\u673A\uFF09\u51ED\u5BC6\u7801\u8FDB\u5165" : "\u672A\u914D\u7F6E\uFF1A\u4EC5\u56DE\u73AF\u5BF9\u7AEF\u514D\u5BC6\u94F8\u9020" })
    ] }),
    stale && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pl-banner pl-banner-warn", children: "\u94F8\u7968\u683C\u5F0F\u91D1\u4E1D\u96C0\u6F02\u79FB\uFF08stale\uFF09\uFF1A\u672C\u63D2\u4EF6\u94F8\u7684 Cookie \u53EF\u80FD\u4E0D\u88AB\u5F53\u524D\u5BBF\u4E3B\u63A5\u53D7\uFF0C\u64A4\u9500\u529F\u80FD\u5DF2\u81EA\u7981\u7528\u3002\u8BF7\u5347\u7EA7\u63D2\u4EF6\u6216\u4F7F\u7528\u5B98\u65B9 token \u6D41\u3002" }),
    state.unauthorized && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pl-banner pl-banner-warn", children: "\u5F53\u524D\u4F1A\u8BDD\u672A\u8BA4\u8BC1\uFF0C\u8BF7\u5148\u7ECF\u767B\u5F55\u5165\u53E3\u8BA4\u8BC1\u540E\u5237\u65B0\u3002" }),
    state.message !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pl-banner " + (state.message.kind === "ok" ? "pl-banner-ok" : "pl-banner-error"), children: state.message.text }),
    !state.unauthorized && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pl-form", children: [
      configured && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pl-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pl-label", children: "\u5F53\u524D\u5BC6\u7801" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Input, { "data-pl": "current", type: "password", autoComplete: "current-password", value: current, onChange: (e) => {
          setCurrent(e.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pl-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pl-label", children: "\u65B0\u5BC6\u7801" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Input, { "data-pl": "next", type: "password", autoComplete: "new-password", value: next, onChange: (e) => {
          setNext(e.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pl-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pl-label", children: "\u786E\u8BA4\u65B0\u5BC6\u7801" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Input, { "data-pl": "confirm", type: "password", autoComplete: "new-password", value: confirm, onChange: (e) => {
          setConfirm(e.target.value);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pl-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(P.Button, { "data-pl": "submit", variant: "primary", size: "sm", disabled: state.busy || next.length === 0 || next !== confirm, onClick: submit, children: configured ? "\u8F6E\u6362\u5BC6\u7801\uFF08\u5168\u5458\u4E0B\u7EBF\uFF09" : "\u8BBE\u7F6E\u5BC6\u7801" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Button, { "data-pl": "revoke", variant: "outline", size: "sm", disabled: state.busy, onClick: () => {
          void store.revoke();
        }, children: "\u56DE\u6536\u6240\u6709\u4F1A\u8BDD" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pl-hint", children: [
        "\u6D4F\u89C8\u5668\u767B\u5F55\u5165\u53E3 ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "/plugins/dsh-password-login/login" }),
        " \u53EF\u52A0\u5165\u4E66\u7B7E\uFF1A\u4F1A\u8BDD\u5931\u6548\u540E\u91CD\u8BBF\u5373\u51ED\u6D4F\u89C8\u5668\u8BB0\u4F4F\u7684\u5BC6\u7801\u65E0\u611F\u91CD\u94F8\u3002 \u8F6E\u6362\u4F1A\u7ACB\u5373\u64A4\u9500\u6240\u6709\u5DF2\u53D1\u4F1A\u8BDD\uFF08\u542B\u672C\u9762\u677F\uFF0C\u63D0\u4EA4\u540E\u4F1A\u81EA\u52A8\u6362\u53D1\u65B0\u7968\uFF09\uFF1B\u300C\u56DE\u6536\u6240\u6709\u4F1A\u8BDD\u300D\u4E0D\u6539\u5BC6\u7801\u3001\u7EDD\u5BF9\u5168\u5458\u4E0B\u7EBF\uFF08\u542B\u672C\u9762\u677F\uFF09\uFF0C\u70B9\u51FB\u540E\u9700\u7ECF\u767B\u5F55\u4E66\u7B7E\u91CD\u65B0\u8FDB\u5165\u3002"
      ] })
    ] })
  ] });
}

// src/types.ts
var ROUTE_PREFIX = "/plugins/dsh-password-login";

// src/client/store.ts
function createInitialUiState() {
  return { loaded: false, unauthorized: false, busy: false };
}
function errorMessage(body, fallback) {
  if (typeof body === "object" && body !== null && !Array.isArray(body) && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}
function createStore(fetchLike) {
  let state = createInitialUiState();
  const listeners = /* @__PURE__ */ new Set();
  const set = (patch) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async refresh() {
      try {
        const response = await fetchLike(ROUTE_PREFIX + "/status");
        if (response.status === 401) {
          set({ loaded: true, unauthorized: true, status: void 0 });
          return;
        }
        const body = await response.json();
        if (!response.ok) {
          set({ loaded: true, message: { kind: "error", text: errorMessage(body, "status unavailable") } });
          return;
        }
        set({ loaded: true, unauthorized: false, status: body, message: void 0 });
      } catch {
        set({ loaded: true, message: { kind: "error", text: "network error" } });
      }
    },
    async revoke() {
      set({ busy: true });
      try {
        const response = await fetchLike(ROUTE_PREFIX + "/revoke", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}"
        });
        const parsed = await response.json().catch(() => void 0);
        if (!response.ok) {
          set({ busy: false, message: { kind: "error", text: errorMessage(parsed, "revocation failed") } });
          return false;
        }
        set({ busy: false });
        await this.refresh();
        set({ message: { kind: "ok", text: "\u5DF2\u56DE\u6536\u6240\u6709\u5DF2\u53D1\u4F1A\u8BDD\uFF08\u542B\u672C\u9762\u677F\uFF09\u2014\u2014\u8BF7\u7ECF\u767B\u5F55\u4E66\u7B7E\u91CD\u65B0\u8FDB\u5165" } });
        return true;
      } catch {
        set({ busy: false, message: { kind: "error", text: "network error" } });
        return false;
      }
    },
    async rotate(input) {
      set({ busy: true });
      try {
        const body = { next: input.next };
        if (input.current !== void 0 && input.current !== "") body.current = input.current;
        const response = await fetchLike(ROUTE_PREFIX + "/rotate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        const parsed = await response.json().catch(() => void 0);
        if (!response.ok) {
          set({ busy: false, message: { kind: "error", text: errorMessage(parsed, "rotation failed") } });
          return false;
        }
        set({ busy: false });
        await this.refresh();
        set({ message: { kind: "ok", text: input.current !== void 0 ? "\u5BC6\u7801\u5DF2\u8F6E\u6362\uFF0C\u6240\u6709\u5DF2\u767B\u5F55\u4F1A\u8BDD\uFF08\u542B\u6D4F\u89C8\u5668\uFF09\u5DF2\u4E0B\u7EBF" : "\u5BC6\u7801\u5DF2\u8BBE\u7F6E\uFF0C\u6B64\u540E\u4EFB\u4F55\u5BF9\u7AEF\u90FD\u987B\u51ED\u5BC6\u7801\u8FDB\u5165" } });
        return true;
      } catch {
        set({ busy: false, message: { kind: "error", text: "network error" } });
        return false;
      }
    }
  };
}

// src/client/store-instance.ts
function createStore2() {
  return createStore(window.fetch.bind(window));
}

// src/client/index.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var inject = ["slots"];
var shared = null;
function sharedStore() {
  if (shared === null) shared = createStore2();
  return shared;
}
function apply(ctx) {
  const store = sharedStore();
  ctx.inject(["slots"], (scope) => {
    scope.slots.inject(
      "settings.plugins.tab",
      () => scope.slots.register(
        { name: "settings.plugins.tab", id: "password-login", order: 21, label: () => "\u767B\u5F55\u5BC6\u7801" },
        function PasswordLoginSettingsTab() {
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SettingsTabBridge, { store });
        }
      )
    );
  });
}
function SettingsTabBridge(props) {
  const [state, setState] = React2.useState(props.store.getSnapshot());
  React2.useEffect(() => {
    const unsubscribe = props.store.subscribe(setState);
    void props.store.refresh();
    return unsubscribe;
  }, [props.store]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SettingsTab, { state, store: props.store });
}

		return module.exports;
	}
});
