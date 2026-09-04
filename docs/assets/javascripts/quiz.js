(() => {
  const ROOT_SELECTOR = "#situation-quiz";
  const BASE_LABEL = { "1B": "一垒", "2B": "二垒", "3B": "三垒" };

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function shuffle(list) {
    const items = [...list];
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function runnerLabel(runners) {
    if (!Array.isArray(runners) || runners.length === 0) {
      return "垒上无人";
    }
    const names = runners.map((code) => BASE_LABEL[code] || code);
    if (names.length === 3) {
      return "满垒";
    }
    return `${names.join("、")}有人`;
  }

  function chipsFor(item) {
    const situation = item.situation || {};
    const chips = [];
    if (situation.inning) {
      chips.push(situation.inning);
    }
    if (Number.isFinite(situation.outs)) {
      chips.push(`${situation.outs} 出局`);
    }
    if (Number.isFinite(situation.balls) || Number.isFinite(situation.strikes)) {
      chips.push(`${situation.strikes ?? 0}好 ${situation.balls ?? 0}坏`);
    }
    chips.push(runnerLabel(situation.runners));
    return chips;
  }

  function figureUrl(bankUrl, src) {
    return new URL(src, bankUrl).href;
  }

  function createQuiz(root) {
    const state = {
      bank: [],
      queue: [],
      current: null,
      seen: 0,
      score: 0,
      locked: false,
    };

    root.innerHTML = `
      <div class="situation-quiz__card">
        <div class="situation-quiz__bar">
          <span class="situation-quiz__step" data-step></span>
          <div class="situation-quiz__meter" aria-hidden="true"><span data-meter></span></div>
          <span class="situation-quiz__tally" data-tally></span>
        </div>
        <div class="situation-quiz__body" data-main></div>
      </div>
    `;

    const stepEl = root.querySelector("[data-step]");
    const meterEl = root.querySelector("[data-meter]");
    const tallyEl = root.querySelector("[data-tally]");
    const mainEl = root.querySelector("[data-main]");

    function refillQueue() {
      const lastId = state.current?.id;
      const next = shuffle(state.bank);
      if (next.length > 1 && lastId && next[0].id === lastId) {
        const swap = 1 + Math.floor(Math.random() * (next.length - 1));
        [next[0], next[swap]] = [next[swap], next[0]];
      }
      state.queue = next;
    }

    function drawQuestion() {
      if (!state.queue.length) {
        refillQueue();
      }
      state.current = state.queue.shift();
      return state.current;
    }

    function updateBar() {
      const answered = Math.max(state.seen - (state.locked ? 0 : 1), 0);
      stepEl.textContent = `第 ${state.seen} 题`;
      tallyEl.textContent = answered ? `${state.score} / ${answered} 正确` : "";
      meterEl.style.width = `${(answered ? state.score / answered : 0) * 100}%`;
    }

    function renderQuestion() {
      const item = drawQuestion();
      state.locked = false;
      state.seen += 1;
      updateBar();

      const chips = chipsFor(item)
        .map((chip) => `<span class="situation-quiz__chip">${escapeXml(chip)}</span>`)
        .join("");
      const figure = item.figure
        ? `<img src="${escapeXml(item._figureUrl)}" alt="">`
        : "";

      mainEl.innerHTML = `
        <figure class="situation-quiz__figure" data-figure ${figure ? "" : "hidden"}>${figure}</figure>
        <div class="situation-quiz__chips">${chips}</div>
        <p class="situation-quiz__prompt"></p>
        <div data-answer></div>
        <div class="situation-quiz__feedback" data-feedback hidden></div>
        <div class="situation-quiz__actions" data-actions hidden>
          <button type="button" class="situation-quiz__next">下一题</button>
        </div>
      `;

      mainEl.querySelector(".situation-quiz__prompt").textContent = item.prompt;
      const img = mainEl.querySelector("[data-figure] img");
      if (img) {
        img.addEventListener("error", () => {
          mainEl.querySelector("[data-figure]").hidden = true;
        });
      }

      const list = document.createElement("div");
      list.className = "situation-quiz__choices";
      (item.options || []).forEach((label, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "situation-quiz__choice";
        button.textContent = label;
        button.addEventListener("click", () => finish(item, index, list));
        list.appendChild(button);
      });
      mainEl.querySelector("[data-answer]").appendChild(list);

      mainEl.querySelector(".situation-quiz__next").addEventListener("click", () => {
        renderQuestion();
      });
    }

    function finish(item, value, list) {
      if (state.locked) {
        return;
      }
      state.locked = true;
      const correct = Number(value) === Number(item.answer);
      if (correct) {
        state.score += 1;
      }
      updateBar();

      [...list.querySelectorAll(".situation-quiz__choice")].forEach((button, index) => {
        button.disabled = true;
        if (index === Number(item.answer)) {
          button.classList.add("is-correct");
        }
        if (index === Number(value) && !correct) {
          button.classList.add("is-wrong");
        }
      });

      const feedback = mainEl.querySelector("[data-feedback]");
      feedback.hidden = false;
      feedback.className = `situation-quiz__feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedback.replaceChildren();
      const title = document.createElement("strong");
      title.textContent = correct ? "判断正确" : "判断有误";
      const text = document.createElement("div");
      text.textContent = item.explain || "";
      feedback.append(title, text);
      if (item.ruleHref) {
        const link = document.createElement("a");
        link.href = item.ruleHref;
        link.textContent = item.ruleLabel ? `查看说明：${item.ruleLabel}` : "查看规则说明";
        feedback.append(link);
      }

      mainEl.querySelector("[data-actions]").hidden = false;
      const next = mainEl.querySelector(".situation-quiz__next");
      next.focus();
    }

    return {
      start(items) {
        state.bank = items;
        state.queue = [];
        state.current = null;
        state.seen = 0;
        state.score = 0;
        if (!items.length) {
          root.textContent = "还没有题目。";
          return;
        }
        renderQuestion();
      },
    };
  }

  async function init() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!(root instanceof HTMLElement)) {
      return;
    }

    const src = root.dataset.src || "questions/bank.json";
    const bankUrl = new URL(src, window.location.href);
    try {
      const response = await fetch(bankUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const items = (Array.isArray(data.items) ? data.items : []).map((item) => ({
        ...item,
        _figureUrl: item.figure ? figureUrl(bankUrl, item.figure) : "",
      }));
      createQuiz(root).start(items);
    } catch {
      root.textContent = "题目加载失败，请稍后重试。";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
