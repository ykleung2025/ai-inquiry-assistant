(function () {
  "use strict";

  var STORAGE_KEY = "p5-ai-inquiry-v1";

  var STEPS = [
    { id: "predict", n: "①", name: "我的預測" },
    { id: "ask", n: "②", name: "助手追問" },
    { id: "observe", n: "③", name: "我的觀察" },
    { id: "judge", n: "④", name: "判斷助手" }
  ];

  var OVERALL = [
    { id: "sound", label: "合理" },
    { id: "partial", label: "部分合理要補充" },
    { id: "revise", label: "唔合理要修正" },
    { id: "unsure", label: "證據唔夠暫唔判斷" }
  ];

  var COMPARE = [
    { id: "same", label: "相同" },
    { id: "diff", label: "唔同" },
    { id: "part", label: "部分相同" }
  ];

  var STEMS = [
    { id: "support-a", label: function (ev) { return "我觀察到" + ev + "，所以支持解釋 A。"; } },
    { id: "support-b", label: function (ev) { return "我觀察到" + ev + "，所以支持解釋 B。"; } },
    { id: "against-a", label: function (ev) { return "我觀察到" + ev + "，所以唔支持解釋 A。"; } },
    { id: "against-b", label: function (ev) { return "我觀察到" + ev + "，所以唔支持解釋 B。"; } },
    { id: "incomplete", label: function (ev) { return "我觀察到" + ev + "，所以兩個解釋都唔完整。"; } }
  ];

  var PICKS = [
    { id: "A", label: "解釋 A" },
    { id: "B", label: "解釋 B" },
    { id: "both", label: "兩個都唔完整" }
  ];

  var LOCK_MSG = "已記錄。先唔睇『正確答案』，跟住答助手一條問題。";
  var ASK_TIP = "記得實驗時真係睇呢樣，之後用嚟判斷助手講得啱唔啱。";
  var OTHER_TIP = "『其他』唔使打字。請舉手講一句，老師寫喺黑板，或者同組口頭補一句。";
  var SAFETY = "安全：膠杯唔用玻璃；托盤上方；紙盒活動唔飲用。";

  var ACTIVITIES = {
    cup: {
      id: "cup",
      name: "覆杯實驗",
      question: "咩力托住卡紙？",
      core: "倒轉後卡紙點解可以唔即時跌？",
      materials: "透明膠杯、清水、硬卡紙、托盤或水盆",
      how: [
        "杯近滿水",
        "硬卡紙蓋住杯口，按緊",
        "喺托盤上方倒轉",
        "慢慢放手，睇卡紙同水"
      ],
      safetyExtra: "倒轉膠杯一定要喺托盤上方。",
      predictQ1: {
        legend: "我預測放手後：",
        options: [
          { id: "stay", label: "卡紙留喺杯口，水唔會明顯流出" },
          { id: "fall", label: "卡紙跌落，水會流出" },
          { id: "unsure", label: "唔肯定" }
        ]
      },
      predictQ2: {
        legend: "我咁預測主要因為（揀一）：",
        options: [
          { id: "air", label: "杯外空氣可能托住卡紙" },
          { id: "suction", label: "卡紙被水「吸住」" },
          { id: "heavy", label: "水好重，一定會壓跌卡紙" },
          { id: "cover", label: "杯口蓋住就唔會漏（未諗氣壓）" },
          { id: "other", label: "其他（舉手／口頭，教師板書一句）", other: true }
        ]
      },
      askPrompt: "你有咩觀察得到嘅證據，支持你而家嘅想法？請揀一項你之後實驗會特別留意。",
      askLead: "",
      askOptions: [
        { id: "card", label: "卡紙有冇跌" },
        { id: "water", label: "水有冇流出／漏" },
        { id: "seal", label: "杯口密唔密合、有冇氣泡" },
        { id: "full", label: "杯內水係咪近滿" },
        { id: "other", label: "其他（口頭）", other: true }
      ],
      observeGroups: [
        {
          spec: "卡紙冇跌／有跌",
          options: [
            { id: "card-stay", label: "卡紙冇跌" },
            { id: "card-fall", label: "卡紙有跌" }
          ]
        },
        {
          spec: "水冇明顯流出／有流出或漏",
          options: [
            { id: "water-stay", label: "水冇明顯流出" },
            { id: "water-leak", label: "水有流出或漏" }
          ]
        },
        {
          spec: "杯口大致密合／唔密合",
          options: [
            { id: "seal-yes", label: "杯口大致密合" },
            { id: "seal-no", label: "杯口唔密合" }
          ]
        },
        {
          spec: "杯內見到少少氣泡／幾乎冇氣泡",
          options: [
            { id: "bubble-some", label: "杯內見到少少氣泡" },
            { id: "bubble-none", label: "幾乎冇氣泡" }
          ]
        },
        {
          spec: "要重做先成功／一次就得",
          options: [
            { id: "retry", label: "要重做先成功" },
            { id: "once", label: "一次就得" }
          ]
        }
      ],
      explainA: "杯外大氣壓力向上托住卡紙，同杯內水向下等作用形成壓力差，有助卡紙留喺杯口。",
      explainB: "卡紙被水吸住，所以唔會跌。"
    },
    box: {
      id: "box",
      name: "紙盒飲品凹陷",
      question: "邊度壓凹盒身？",
      core: "盒內空氣／液體減少後，點解盒身會凹？",
      materials: "空紙盒飲品、乾淨吸管（唔飲用）",
      how: [
        "用空紙盒，唔好飲入面嘅嘢",
        "插入乾淨吸管",
        "吸幾下",
        "睇盒身有冇凹、凹喺邊"
      ],
      safetyExtra: "紙盒只係示範，唔好飲用。",
      predictQ1: {
        legend: "我預測吸幾下之後：",
        options: [
          { id: "dent", label: "盒會凹" },
          { id: "flat", label: "唔會凹" },
          { id: "unsure", label: "唔肯定" }
        ]
      },
      predictQ2: {
        legend: "我咁預測主要因為（揀一）：",
        options: [
          { id: "pressure", label: "盒內壓力變低，外面大氣壓力把盒壓凹" },
          { id: "soft", label: "紙盒好軟，輕輕一郁就會凹" },
          { id: "pull", label: "吸力把紙「拉凹」" },
          { id: "empty", label: "盒入面少咗嘢，盒就自然扁（未諗氣壓）" },
          { id: "other", label: "其他（舉手／口頭，教師板書一句）", other: true }
        ]
      },
      askPrompt: "你有咩觀察得到嘅證據，支持你而家嘅想法？請揀一項你之後實驗會特別留意。",
      askLead: "你會睇邊度？",
      askOptions: [
        { id: "body", label: "盒身有冇凹、凹喺邊" },
        { id: "straw", label: "吸管有冇被吸扁或移位" },
        { id: "sips", label: "吸幾多口先見到變化" },
        { id: "before-after", label: "吸之前同吸之後盒身有咩分別" },
        { id: "other", label: "其他（口頭）", other: true }
      ],
      observeGroups: [
        {
          spec: "盒身有凹／冇凹",
          options: [
            { id: "dent-yes", label: "盒身有凹" },
            { id: "dent-no", label: "盒身冇凹" }
          ]
        },
        {
          spec: "邊位凹",
          options: [
            { id: "side", label: "凹喺側面" },
            { id: "corner", label: "凹喺底部或角位" },
            { id: "near-straw", label: "凹喺靠近吸管嘅位置" }
          ]
        },
        {
          spec: "吸前後分別",
          options: [
            { id: "after", label: "吸之前盒身較平或較脹，吸之後先凹入去" },
            { id: "no-change", label: "吸前後幾乎冇分別" }
          ]
        },
        {
          spec: "吸幾多口",
          options: [
            { id: "few", label: "吸幾口就見到變化" },
            { id: "many", label: "吸好多口都幾乎冇變" }
          ]
        },
        {
          spec: "吸管",
          options: [
            { id: "straw-flat", label: "吸管被吸扁或移位" },
            { id: "straw-same", label: "吸管大致冇變" }
          ]
        },
        {
          spec: "要重做先見到凹／一次就見到凹",
          options: [
            { id: "retry", label: "要重做先見到凹" },
            { id: "once", label: "一次就見到凹" }
          ]
        }
      ],
      explainA: "外面大氣壓力把盒壓凹。盒內壓力變低，外面大氣壓力大過盒內，盒身就被壓凹。",
      explainB: "紙盒自己縮，或者被吸管嘅吸力把盒拉凹。"
    }
  };

  var state = blankState();
  var notice = "";
  var confirmClear = false;
  var preserveScroll = false;
  var focusLock = false;
  var focusKey = "";

  function blankActivity() {
    return {
      prediction: { q1: null, q2: null, locked: false, lockedAt: null },
      ask: { choice: null, saved: false },
      observe: { items: [], compare: null, saved: false },
      judge: {
        pick: null,
        evidence: [],
        overall: null,
        stem: null,
        saved: false,
        savedAt: null
      }
    };
  }

  function blankState() {
    return {
      v: 1,
      group: null,
      updatedAt: null,
      cup: blankActivity(),
      box: blankActivity()
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.cup || !data.box) return blankState();
      return data;
    } catch (err) {
      return blankState();
    }
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      notice = "呢部裝置儲存唔到紀錄，課堂上記低組號同選項就得。";
    }
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findLabel(list, id) {
    if (!id) return "";
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i].label;
    }
    return "";
  }

  function flatObservations(activity) {
    var list = [];
    activity.observeGroups.forEach(function (group) {
      group.options.forEach(function (opt) {
        list.push(opt);
      });
    });
    return list;
  }

  function observationLabel(activity, id) {
    return findLabel(flatObservations(activity), id);
  }

  function evidenceIds(act) {
    var allowed = {};
    act.observe.items.forEach(function (id) {
      allowed[id] = true;
    });
    return act.judge.evidence.filter(function (id) {
      return allowed[id];
    });
  }

  function evidencePhrase(activity, act) {
    var labels = evidenceIds(act)
      .map(function (id) { return observationLabel(activity, id); })
      .filter(Boolean);
    if (!labels.length) return "（請先勾上面嘅證據）";
    return labels.join("、");
  }

  function stemText(activity, act) {
    var phrase = evidencePhrase(activity, act);
    var stem = null;
    STEMS.forEach(function (item) {
      if (item.id === act.judge.stem) stem = item;
    });
    if (!stem) return "";
    return stem.label(phrase);
  }

  function isOtherSelected(options, id) {
    var opt = null;
    options.forEach(function (item) {
      if (item.id === id) opt = item;
    });
    return !!(opt && opt.other);
  }

  function statusText(act) {
    var ev = evidenceIds(act);
    if (act.judge.saved && ev.length) return "判斷已記下";
    if (act.observe.items.length) return "觀察已開始";
    if (act.ask.saved) return "追問已記下";
    if (act.prediction.locked) return "預測已鎖定";
    if (act.prediction.q1 || act.prediction.q2) return "預測未提交";
    return "未開始";
  }

  function formatTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("zh-HK", { hour12: false });
    } catch (err) {
      return iso;
    }
  }

  function recordText() {
    var lines = [];
    lines.push("AI 科學探究助手・選項紀錄");
    lines.push("樂華天主教小學・小五科學・空氣同大氣壓力");
    lines.push("組號：" + (state.group ? "第 " + state.group + " 組" : "未填"));
    lines.push("更新時間：" + (formatTime(state.updatedAt) || "未有"));
    lines.push("本頁唔會顯示標準答案。紀錄只存在呢部裝置。");
    lines.push("");
    ["cup", "box"].forEach(function (id) {
      var activity = ACTIVITIES[id];
      var act = state[id];
      lines.push("【" + activity.name + "・" + activity.question + "】");
      lines.push("狀態：" + statusText(act));
      if (act.prediction.locked) {
        lines.push("① 預測（已鎖定" + (act.prediction.lockedAt ? "，" + formatTime(act.prediction.lockedAt) : "") + "）");
      } else {
        lines.push("① 預測（未鎖定）");
      }
      lines.push("預測：" + (findLabel(activity.predictQ1.options, act.prediction.q1) || "未揀"));
      lines.push("理由：" + (findLabel(activity.predictQ2.options, act.prediction.q2) || "未揀"));
      if (isOtherSelected(activity.predictQ2.options, act.prediction.q2)) {
        lines.push("其他：教師板書或口頭，學生無打字。");
      }
      lines.push("② 追問留意：" + (findLabel(activity.askOptions, act.ask.choice) || "未揀") + (act.ask.saved ? "（已記下）" : "（未記下）"));
      var obs = act.observe.items.map(function (itemId) {
        return observationLabel(activity, itemId);
      }).filter(Boolean);
      lines.push("③ 觀察：" + (obs.length ? obs.join("、") : "未揀"));
      lines.push("同原先預測：" + (findLabel(COMPARE, act.observe.compare) || "未揀"));
      var evLabels = evidenceIds(act).map(function (itemId) {
        return observationLabel(activity, itemId);
      }).filter(Boolean);
      lines.push("④ 我覺得較合理：" + (findLabel(PICKS, act.judge.pick) || "未揀"));
      lines.push("證據：" + (evLabels.length ? evLabels.join("、") : "未勾"));
      lines.push("對助手整體：" + (findLabel(OVERALL, act.judge.overall) || "未揀"));
      lines.push("出口句：" + (stemText(activity, act) || "未揀"));
      lines.push(act.judge.saved && evLabels.length ? "判斷：已交" : "判斷：未交（要有至少一項觀察證據先可以交）");
      lines.push("");
    });
    return lines.join("\n");
  }

  function judgeReady(act) {
    return {
      pick: !!act.judge.pick,
      evidence: evidenceIds(act).length >= 1,
      overall: !!act.judge.overall,
      stem: !!act.judge.stem
    };
  }

  function canSubmitJudge(act) {
    var ready = judgeReady(act);
    return ready.pick && ready.evidence && ready.overall && ready.stem;
  }

  function say(text) {
    var live = document.getElementById("live");
    if (live) live.textContent = text;
  }

  function route() {
    var hash = (location.hash || "#home").replace(/^#/, "");
    if (hash === "record") return { view: "record" };
    var parts = hash.split("/");
    if (ACTIVITIES[parts[0]]) {
      var step = parts[1] || "predict";
      var known = STEPS.some(function (item) { return item.id === step; });
      return { view: "activity", id: parts[0], step: known ? step : "predict" };
    }
    return { view: "home" };
  }

  function go(hash) {
    notice = "";
    confirmClear = false;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function cupIcon() {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="10" width="36" height="8" rx="3" fill="#c9843a"/><path d="M18 18h28l-2 30a8 8 0 0 1-8 7H28a8 8 0 0 1-8-7z" fill="#8fd0d4"/><path d="M22 18h20l-1.4 22H23.4z" fill="#d9f6f7"/><circle cx="30" cy="28" r="2" fill="#0f6e78"/><circle cx="36" cy="34" r="1.4" fill="#0f6e78"/></svg>';
  }

  function boxIcon() {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 18h28l10 8v24H12z" fill="#f4d48a"/><path d="M40 18v8h10" fill="none" stroke="#c9843a" stroke-width="2"/><path d="M18 30c6 6 14 6 18-2 2 8-2 16-10 16s-12-6-8-14z" fill="#e7b45a"/><rect x="42" y="8" width="4" height="22" rx="2" fill="#7eb6d6"/></svg>';
  }

  function choiceList(name, options, selected, locked) {
    return options.map(function (opt) {
      var checked = selected === opt.id ? " checked" : "";
      var dis = locked ? " disabled" : "";
      return '<label class="choice"><input type="radio" name="' + esc(name) + '" data-field="' + esc(name) + '" data-focus="' + esc(name) + "-" + esc(opt.id) + '" value="' + esc(opt.id) + '"' + checked + dis + '><span>' + esc(opt.label) + "</span></label>";
    }).join("");
  }

  function checkList(field, options, selectedIds) {
    var selected = {};
    selectedIds.forEach(function (id) { selected[id] = true; });
    return options.map(function (opt) {
      var checked = selected[opt.id] ? " checked" : "";
      return '<label class="choice"><input type="checkbox" data-check="' + esc(field) + '" data-focus="' + esc(field) + "-" + esc(opt.id) + '" value="' + esc(opt.id) + '"' + checked + '><span>' + esc(opt.label) + "</span></label>";
    }).join("");
  }

  function groupPicker(compact) {
    var buttons = "";
    for (var n = 1; n <= 12; n += 1) {
      var pressed = state.group === n ? "true" : "false";
      buttons += '<button type="button" class="group-btn" data-action="group" data-group="' + n + '" aria-pressed="' + pressed + '">' + n + "</button>";
    }
    var cls = compact ? "group-box compact" : "panel group-box";
    return '<section class="' + cls + '"><h2>組號（可選）</h2><p class="hint">撳數字就得，唔使打字。可以唔填。紀錄唔會要姓名。</p><div class="group-grid" role="group" aria-label="組號">' + buttons + '</div><div class="foot-links"><button type="button" class="btn" data-action="clear-group">唔填組號</button></div></section>';
  }

  function safetyBlock(extra) {
    return '<p class="safety">' + esc(SAFETY) + (extra ? " " + esc(extra) : "") + "</p>";
  }

  function renderHome() {
    document.title = "AI 科學探究助手｜小五科學";
    var cards = ["cup", "box"].map(function (id) {
      var activity = ACTIVITIES[id];
      var act = state[id];
      return '<a class="activity-card ' + id + '" href="#' + id + '/predict" id="card-' + id + '"><span class="icon-wrap">' + (id === "cup" ? cupIcon() : boxIcon()) + '</span><span><span class="card-kicker">獨立活動</span><h2>' + esc(activity.name) + '</h2><p class="card-q">' + esc(activity.question) + '</p><p class="meta">材料：' + esc(activity.materials) + '</p><p class="meta">核心問題：' + esc(activity.core) + '</p><span class="status-pill">' + esc(statusText(act)) + "</span></span></a>";
    }).join("");
    return '<div class="shell" id="screen-home"><header class="top"><div><p class="kicker">樂華天主教小學 · 小五科學</p><h1>AI 科學探究助手</h1><p class="lede">空氣的特性 · 大氣壓力。揀一個活動做完就得，唔使兩個都做。助手句子已經寫好，全程撳選項，唔使登入，唔使打字。</p></div><div class="top-actions"><button type="button" class="btn" data-action="go" data-hash="#record">選項紀錄</button></div></header>' + groupPicker(true) + '<div class="cards">' + cards + "</div>" + safetyBlock("") + "</div>";
  }

  function renderStepper(id, step) {
    return '<nav class="stepper" aria-label="活動四屏">' + STEPS.map(function (item) {
      var current = item.id === step ? ' aria-current="step"' : "";
      return '<button type="button" class="step" data-action="go" data-hash="#' + id + "/" + item.id + '"' + current + ">" + item.n + " " + esc(item.name) + "</button>";
    }).join("") + "</nav>";
  }

  function renderPredict(activity, act) {
    var locked = act.prediction.locked;
    var other = isOtherSelected(activity.predictQ2.options, act.prediction.q2);
    var banner = locked ? '<div class="banner" id="lock-banner" tabindex="-1"><p>' + esc(LOCK_MSG) + "</p><p>原先選擇已鎖定，唔可以再改。</p></div>" : "";
    var otherTip = other ? '<p class="note warn">' + esc(OTHER_TIP) + "</p>" : "";
    var how = '<ul class="how">' + activity.how.map(function (line) {
      return "<li>" + esc(line) + "</li>";
    }).join("") + "</ul>";
    var button = locked
      ? '<button type="button" class="btn btn-primary" data-action="go" data-hash="#' + activity.id + '/ask">去助手追問</button>'
      : '<button type="button" class="btn btn-primary" id="btn-submit-predict" data-action="lock-predict">記下預測</button>';
    return banner + '<section class="panel"><h2>① 我的預測</h2><p class="sub">' + esc(activity.core) + "</p><p>實驗之前先答。撳「記下預測」之後，原先選擇會鎖定，唔可以再改。</p><p class=\"hint\">材料：" + esc(activity.materials) + "</p>" + how + "</section><fieldset" + (locked ? " disabled" : "") + '><legend>' + esc(activity.predictQ1.legend) + '</legend><div class="choices">' + choiceList("q1", activity.predictQ1.options, act.prediction.q1, locked) + '</div></fieldset><fieldset' + (locked ? " disabled" : "") + '><legend>' + esc(activity.predictQ2.legend) + '</legend><div class="choices">' + choiceList("q2", activity.predictQ2.options, act.prediction.q2, locked) + "</div></fieldset>" + otherTip + '<div class="nav-row">' + button + "</div>";
  }

  function renderAsk(activity, act) {
    var other = isOtherSelected(activity.askOptions, act.ask.choice);
    var lead = activity.askLead ? "<p><strong>" + esc(activity.askLead) + "</strong></p>" : "";
    var saved = act.ask.saved ? '<p class="note" id="ask-saved">' + esc(ASK_TIP) + "</p>" : "";
    var otherTip = other ? '<p class="note warn">' + esc(OTHER_TIP) + "</p>" : "";
    var prompt = esc(activity.askPrompt).replace("觀察得到", "<strong>觀察得到</strong>");
    return '<section class="panel"><h2>② 助手追問</h2><div class="speech"><div class="avatar" aria-hidden="true">助手</div><div>' + lead + "<p>" + prompt + '</p></div></div><fieldset><legend>我之後會特別留意：</legend><div class="choices">' + choiceList("ask", activity.askOptions, act.ask.choice, false) + "</div></fieldset>" + otherTip + saved + '<div class="nav-row"><button type="button" class="btn btn-primary" data-action="save-ask">記下我要留意嘅</button></div></section>';
  }

  function renderObserve(activity, act) {
    var groups = activity.observeGroups.map(function (group) {
      var cols = group.options.length > 1 ? " two-col pair" : " two-col";
      return '<section class="obs-group"><h3>' + esc(group.spec) + '</h3><div class="' + cols + '">' + checkList("observe", group.options, act.observe.items) + "</div></section>";
    }).join("");
    var saved = act.observe.saved ? '<p class="note">觀察已記下。去判斷屏時，要用呢度至少一項做證據。</p>' : "";
    return '<section class="panel"><h2>③ 我的觀察</h2><p class="sub">做完實驗先揀你真正見到嘅。可以揀多項。</p><fieldset><legend>我實際見到：</legend>' + groups + "</fieldset><fieldset><legend>同我原先預測：</legend><div class=\"choices\">" + choiceList("compare", COMPARE, act.observe.compare, false) + "</div></fieldset>" + saved + '<div class="nav-row"><button type="button" class="btn btn-primary" data-action="save-observe">記下觀察</button></div></section>';
  }

  function abCard(letter, text, checked) {
    return '<label class="ab-card" id="explain-' + letter.toLowerCase() + '"><input type="radio" name="pick" data-field="pick" data-focus="pick-' + letter + '" value="' + letter + '"' + (checked ? " checked" : "") + '><span class="ab-copy"><span class="ab-kicker"><span class="badge">' + letter + "</span>解釋 " + letter + '</span><span class="ab-body">' + esc(text) + "</span></span></label>";
  }

  function renderJudge(activity, act) {
    var pool = flatObservations(activity).filter(function (opt) {
      return act.observe.items.indexOf(opt.id) !== -1;
    });
    var ev = evidenceIds(act);
    var phrase = evidencePhrase(activity, act);
    var ready = judgeReady(act);
    var evidenceBlock;
    if (!pool.length) {
      evidenceBlock = '<p class="note warn" id="evidence-list">未有觀察可以引用。請先去「③ 我的觀察」勾選你見到嘅現象，先可以揀證據。</p><div class="nav-row"><button type="button" class="btn" data-action="go" data-hash="#' + activity.id + '/observe">去我的觀察</button></div>';
    } else {
      evidenceBlock = '<fieldset id="evidence-list"><legend>我嘅證據（至少勾一項，來自「我的觀察」）</legend><p class="hint">只可以勾你喺觀察屏揀過嘅現象。</p><div class="choices">' + checkList("evidence", pool, ev) + "</div></fieldset>";
    }
    var stemsDisabled = ev.length < 1;
    var stems = '<fieldset' + (stemsDisabled ? " disabled" : "") + '><legend>出口句（揀一句讀出嚟，唔使打字）</legend><p class="hint">句子入面嘅觀察，會用你勾咗嘅證據填上。</p><div class="choices">' + STEMS.map(function (stem) {
      return choiceList("stem", [{ id: stem.id, label: stem.label(phrase) }], act.judge.stem, stemsDisabled);
    }).join("") + "</div></fieldset>";
    var preview = stemText(activity, act);
    var previewBlock = preview ? '<p class="hint">可以讀出嚟：</p><p class="sentence-preview" id="sentence-preview">' + esc(preview) + "</p>" : "";
    var checks = '<p class="hint" id="submit-checks">交之前要齊呢四樣（只係檢查有冇揀，唔係分數，亦唔會話你知邊個先啱）：</p><ul class="ready"><li class="' + (ready.pick ? "done" : "") + '">' + (ready.pick ? "已揀" : "未揀") + "較合理嘅解釋</li><li class=\"" + (ready.evidence ? "done" : "") + '">' + (ready.evidence ? "已勾證據" : "未勾證據（至少一項）") + '</li><li class="' + (ready.overall ? "done" : "") + '">' + (ready.overall ? "已評助手" : "未評助手") + '</li><li class="' + (ready.stem ? "done" : "") + '">' + (ready.stem ? "已揀出口句" : "未揀出口句") + "</li></ul>";
    var saved = act.judge.saved ? '<div class="banner" id="judge-saved">判斷已記下。呢頁唔會話你知邊個解釋先啱。可以改選，再更新紀錄。</div>' : "";
    var ab = '<div class="explain-grid pair">' + abCard("A", activity.explainA, act.judge.pick === "A") + abCard("B", activity.explainB, act.judge.pick === "B") + "</div>";
    var both = '<label class="choice choice-both"><input type="radio" name="pick" data-field="pick" data-focus="pick-both" value="both"' + (act.judge.pick === "both" ? " checked" : "") + "><span>兩個都唔完整</span></label>";
    return saved + '<section class="panel" id="judge-screen"><h2>④ 判斷助手</h2><p class="sub">助手出示兩個可能解釋。兩張卡外觀一樣，呢度唔會標示邊個先啱，亦冇標準答案。請用你見到嘅證據自己判斷。</p>' + ab + '<fieldset><legend>我覺得較合理：</legend><div class="choices">' + both + '</div><p class="hint">解釋 A 同解釋 B 可以直接撳上面張卡。</p></fieldset>' + evidenceBlock + '<fieldset><legend>我對助手整體覺得：</legend><div class="choices">' + choiceList("overall", OVERALL, act.judge.overall, false) + "</div></fieldset>" + stems + previewBlock + checks + '<div class="nav-row"><button type="button" class="btn btn-primary" id="btn-submit-judge" data-action="save-judge" aria-describedby="submit-checks"' + (canSubmitJudge(act) ? "" : " disabled") + ">" + (act.judge.saved ? "更新判斷" : "交判斷") + "</button></div></section>";
  }

  function renderActivity(id, step) {
    var activity = ACTIVITIES[id];
    var act = state[id];
    document.title = activity.name + "｜AI 科學探究助手";
    var body;
    if (step === "predict") body = renderPredict(activity, act);
    else if (step === "ask") body = renderAsk(activity, act);
    else if (step === "observe") body = renderObserve(activity, act);
    else body = renderJudge(activity, act);
    var index = 0;
    STEPS.forEach(function (item, i) {
      if (item.id === step) index = i;
    });
    var prev = index > 0 ? '<button type="button" class="btn" data-action="go" data-hash="#' + id + "/" + STEPS[index - 1].id + '">上一屏</button>' : "";
    var next = index < STEPS.length - 1 ? '<button type="button" class="btn" data-action="go" data-hash="#' + id + "/" + STEPS[index + 1].id + '">下一屏</button>' : '<button type="button" class="btn" data-action="go" data-hash="#home">返回活動選單</button>';
    var noticeHtml = notice ? '<p class="note warn" id="form-notice">' + esc(notice) + "</p>" : "";
    return '<div class="shell" id="screen-' + id + "-" + step + '"><header class="top"><div><p class="kicker">小五科學 · ' + esc(activity.name) + (state.group ? " · 第 " + state.group + " 組" : "") + '</p><h1>' + esc(activity.question) + '</h1><p class="lede">' + esc(activity.core) + '</p></div><div class="top-actions"><button type="button" class="btn" data-action="go" data-hash="#home">返回選單</button><button type="button" class="btn" data-action="go" data-hash="#record">選項紀錄</button></div></header>' + renderStepper(id, step) + '<p class="hint">可以前後翻睇，唔使順次序做晒。做一個活動就夠。</p>' + noticeHtml + body + '<div class="nav-row">' + prev + next + "</div>" + safetyBlock(activity.safetyExtra) + "</div>";
  }

  function renderRecord() {
    document.title = "選項紀錄｜AI 科學探究助手";
    var clearLabel = confirmClear ? "再按一次確認清除本機紀錄" : "清除本機紀錄";
    return '<div class="shell" id="screen-record"><header class="top"><div><p class="kicker">教師用</p><h1>選項紀錄</h1><p class="lede">只存在呢部裝置，唔會上傳。冇姓名，可用組號對返組別。</p></div><div class="top-actions"><button type="button" class="btn" data-action="go" data-hash="#home">返回選單</button></div></header>' + groupPicker() + '<section class="panel"><div class="record-actions"><button type="button" class="btn btn-primary" data-action="copy-record">複製紀錄</button><button type="button" class="btn" data-action="download-record">下載文字檔</button><button type="button" class="btn" data-action="clear-record">' + esc(clearLabel) + '</button></div>' + (notice ? '<p class="note" id="form-notice">' + esc(notice) + "</p>" : "") + "<pre class=\"record\" id=\"record-text\">" + esc(recordText()) + "</pre></section>" + safetyBlock("") + "</div>";
  }

  function render() {
    var y = preserveScroll ? window.scrollY : 0;
    var view = route();
    var app = document.getElementById("app");
    var html;
    if (view.view === "record") html = renderRecord();
    else if (view.view === "activity") html = renderActivity(view.id, view.step);
    else html = renderHome();
    app.innerHTML = html;
    if (preserveScroll) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
    preserveScroll = false;
    if (focusLock) {
      var banner = document.getElementById("lock-banner");
      if (banner) banner.focus();
      focusLock = false;
    } else if (focusKey) {
      var focusEl = document.querySelector('[data-focus="' + focusKey + '"]');
      if (focusEl) focusEl.focus({ preventScroll: true });
      focusKey = "";
    }
  }

  function currentActivity() {
    var view = route();
    if (view.view !== "activity") return null;
    return { activity: ACTIVITIES[view.id], act: state[view.id], id: view.id, step: view.step };
  }

  function onChange(event) {
    var input = event.target;
    if (!input || !input.getAttribute) return;
    var current = currentActivity();
    if (!current) return;
    var field = input.getAttribute("data-field");
    var check = input.getAttribute("data-check");
    focusKey = input.getAttribute("data-focus") || "";
    var act = current.act;
    if (field === "q1" || field === "q2") {
      if (act.prediction.locked) {
        focusKey = "";
        return;
      }
      act.prediction[field] = input.value;
    } else if (field === "ask") {
      act.ask.choice = input.value;
      act.ask.saved = false;
    } else if (field === "compare") {
      act.observe.compare = input.value;
      act.observe.saved = false;
    } else if (field === "pick") {
      act.judge.pick = input.value;
    } else if (field === "overall") {
      act.judge.overall = input.value;
    } else if (field === "stem") {
      act.judge.stem = input.value;
    } else if (check === "observe") {
      var items = act.observe.items.slice();
      if (input.checked) {
        if (items.indexOf(input.value) === -1) items.push(input.value);
      } else {
        items = items.filter(function (id) { return id !== input.value; });
      }
      act.observe.items = items;
      act.observe.saved = false;
      act.judge.evidence = evidenceIds(act);
      if (!act.judge.evidence.length) act.judge.saved = false;
    } else if (check === "evidence") {
      var pool = {};
      act.observe.items.forEach(function (id) { pool[id] = true; });
      if (!pool[input.value]) return;
      var evidence = evidenceIds(act);
      if (input.checked) {
        if (evidence.indexOf(input.value) === -1) evidence.push(input.value);
      } else {
        evidence = evidence.filter(function (id) { return id !== input.value; });
      }
      act.judge.evidence = evidence;
      if (!evidence.length) act.judge.saved = false;
    } else {
      return;
    }
    notice = "";
    save();
    preserveScroll = true;
    render();
  }

  function onClick(event) {
    var btn = event.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "go") {
      go(btn.getAttribute("data-hash"));
      return;
    }
    if (action === "group") {
      state.group = Number(btn.getAttribute("data-group"));
      notice = "";
      confirmClear = false;
      save();
      preserveScroll = true;
      render();
      return;
    }
    if (action === "clear-group") {
      state.group = null;
      save();
      preserveScroll = true;
      render();
      return;
    }
    if (action === "copy-record") {
      copyRecord();
      return;
    }
    if (action === "download-record") {
      downloadRecord();
      return;
    }
    if (action === "clear-record") {
      if (!confirmClear) {
        confirmClear = true;
        notice = "再按一次先會清除呢部裝置嘅選項紀錄。";
        render();
        return;
      }
      state = blankState();
      save();
      confirmClear = false;
      notice = "已清除本機紀錄。";
      say(notice);
      render();
      return;
    }
    var current = currentActivity();
    if (!current) return;
    var act = current.act;
    var activity = current.activity;
    if (action === "lock-predict") {
      if (act.prediction.locked) return;
      if (!act.prediction.q1 || !act.prediction.q2) {
        notice = "請先揀預測同理由，先可以記下。";
        say(notice);
        render();
        return;
      }
      act.prediction.locked = true;
      act.prediction.lockedAt = new Date().toISOString();
      notice = "";
      focusLock = true;
      save();
      say(LOCK_MSG);
      render();
      return;
    }
    if (action === "save-ask") {
      if (!act.ask.choice) {
        notice = "請揀一項你實驗時會特別留意。";
        say(notice);
        render();
        return;
      }
      act.ask.saved = true;
      notice = "";
      save();
      say(ASK_TIP);
      render();
      return;
    }
    if (action === "save-observe") {
      if (!act.observe.items.length) {
        notice = "請至少勾一項你實際見到嘅現象。";
        say(notice);
        render();
        return;
      }
      if (!act.observe.compare) {
        notice = "請再揀同原先預測係相同、唔同，定部分相同。";
        say(notice);
        render();
        return;
      }
      act.observe.saved = true;
      notice = "";
      save();
      say("觀察已記下。判斷時要引用至少一項呢度嘅證據。");
      render();
      return;
    }
    if (action === "save-judge") {
      act.judge.evidence = evidenceIds(act);
      if (!canSubmitJudge(act)) {
        notice = "請勾至少一項來自觀察嘅證據，並揀齊解釋、對助手嘅判斷同出口句，先可以交。";
        say(notice);
        preserveScroll = true;
        render();
        return;
      }
      act.judge.saved = true;
      act.judge.savedAt = new Date().toISOString();
      notice = "判斷已記下。呢頁唔會話你知邊個解釋先啱。";
      save();
      say(notice);
      render();
    }
  }

  function copyRecord() {
    var text = recordText();
    function done() {
      notice = "已複製選項紀錄。";
      say(notice);
      confirmClear = false;
      render();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      notice = "請直接揀下面文字複製。";
    }
    document.body.removeChild(area);
  }

  function downloadRecord() {
    var text = recordText();
    var blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
    var link = document.createElement("a");
    var name = state.group ? "選項紀錄-第" + state.group + "組.txt" : "選項紀錄.txt";
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    notice = "已下載文字檔。";
    say(notice);
    confirmClear = false;
    render();
  }

  document.addEventListener("change", onChange);
  document.addEventListener("click", onClick);
  window.addEventListener("hashchange", function () {
    notice = "";
    confirmClear = false;
    render();
  });

  state = load();
  if (!location.hash) location.hash = "#home";
  render();
})();
