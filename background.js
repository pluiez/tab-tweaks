// Tab Tweaks — minimal Chrome/Edge extension.
// Req 1: closing the active tab focuses the left neighbor (instead of right).
// Req 2: new opener-linked tabs stack-insert immediately right of the opener.

// Tab order and active tab per window, updated from the tab events themselves
// (each event carries the position it changed), so Req 1 can find the left
// neighbor synchronously and never reads a stale index.
const windowState = new Map();           // windowId -> { order: tabId[], active: tabId }
const moveQueueByWindow = new Map();     // windowId -> Promise (per-window serialization)

// ---- State persistence ---------------------------------------------------

// MV3 service workers are stopped after ~30s idle, wiping memory. The event that
// wakes us is often the very close Req 1 must handle — by then the tab is gone
// and tabs.query can't tell where it was — so the state is mirrored to
// storage.session (memory only, cleared when the browser exits) and every
// listener awaits `ready` before touching it. Listeners resume in event order.
const STATE_KEY = 'windowState';
const ready = restoreState();

async function restoreState() {
  try {
    const { [STATE_KEY]: saved } = await chrome.storage.session.get(STATE_KEY);
    if (saved) {
      for (const [windowId, state] of saved) windowState.set(windowId, state);
      return;
    }
  } catch {}
  // Nothing saved yet (install, update, browser start): build from scratch.
  // Events queued behind `ready` may replay changes this query already saw;
  // insertTab/detachTab are idempotent, so that's harmless.
  try {
    const tabs = await chrome.tabs.query({});
    tabs.sort((a, b) => a.index - b.index);
    for (const t of tabs) {
      const w = getWindow(t.windowId);
      w.order.push(t.id);
      if (t.active) w.active = t.id;
    }
  } catch {}
  saveState();
}

function saveState() {
  chrome.storage.session.set({ [STATE_KEY]: [...windowState] }).catch(() => {});
}

// Start at browser launch so the state exists before the first close.
chrome.runtime.onStartup.addListener(() => {});

function getWindow(windowId) {
  let w = windowState.get(windowId);
  if (!w) windowState.set(windowId, (w = { order: [], active: undefined }));
  return w;
}

function detachTab(tabId) {
  for (const w of windowState.values()) {
    const i = w.order.indexOf(tabId);
    if (i >= 0) w.order.splice(i, 1);
  }
}

function insertTab(windowId, tabId, index) {
  detachTab(tabId);
  getWindow(windowId).order.splice(index, 0, tabId);
}

// ---- Req 1: close active → focus left ------------------------------------

chrome.tabs.onRemoved.addListener(async (tabId, { windowId, isWindowClosing }) => {
  await ready;
  const w = windowState.get(windowId);
  const i = w ? w.order.indexOf(tabId) : -1;
  if (i >= 0) w.order.splice(i, 1);

  // Chrome has already activated its own pick (usually the right neighbor) by
  // the time this event arrives, so switch to the left neighbor ASAP.
  if (!isWindowClosing && i > 0 && w.active === tabId) {
    chrome.tabs.update(w.order[i - 1], { active: true }).catch(() => {});
  }
  saveState();
});

// ---- Req 2: stack-insert opener-linked tabs ------------------------------

chrome.tabs.onCreated.addListener(async (tab) => {
  await ready;
  insertTab(tab.windowId, tab.id, tab.index);
  if (tab.active) getWindow(tab.windowId).active = tab.id;
  saveState();

  if (!tab.openerTabId) return;

  // Snapshot Chrome's intended activation state and the previously-active tab
  // before the queued async work. If our tabs.move spuriously activates the
  // new tab (observed on rapid sequential moves), we use these to restore the
  // original focus.
  const intendedActive = tab.active;
  const previouslyActive = getWindow(tab.windowId).active;

  enqueueForWindow(tab.windowId, async () => {
    // Re-read both tabs: earlier queued moves may have shifted them since
    // the event fired.
    let opener, current;
    try {
      [opener, current] = await Promise.all([
        chrome.tabs.get(tab.openerTabId),
        chrome.tabs.get(tab.id),
      ]);
    } catch {
      return;
    }
    if (opener.windowId !== current.windowId) return;
    const target = opener.index + 1;
    if (current.index === target) return;

    try {
      await chrome.tabs.move(tab.id, { index: target });
    } catch {
      return;
    }

    // If the page/browser intended the new tab to be background, but our move
    // flipped it to active, restore focus to the originally active tab. The
    // tabs.get re-check guards against overriding a manual user switch during
    // our async work.
    if (intendedActive === false && previouslyActive && previouslyActive !== tab.id) {
      try {
        const cur = await chrome.tabs.get(tab.id);
        if (cur && cur.active) {
          await chrome.tabs.update(previouslyActive, { active: true });
        }
      } catch {}
    }
  });
});

function enqueueForWindow(windowId, task) {
  const prev = moveQueueByWindow.get(windowId) || Promise.resolve();
  const next = prev.then(task, task).catch(() => {});
  moveQueueByWindow.set(windowId, next);
  next.finally(() => {
    if (moveQueueByWindow.get(windowId) === next) moveQueueByWindow.delete(windowId);
  });
}

// ---- State maintenance ---------------------------------------------------

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await ready;
  getWindow(windowId).active = tabId;
  saveState();
});

chrome.tabs.onMoved.addListener(async (tabId, { windowId, toIndex }) => {
  await ready;
  insertTab(windowId, tabId, toIndex);
  saveState();
});

chrome.tabs.onAttached.addListener(async (tabId, { newWindowId, newPosition }) => {
  await ready;
  insertTab(newWindowId, tabId, newPosition);
  saveState();
});

chrome.tabs.onDetached.addListener(async (tabId) => {
  await ready;
  detachTab(tabId);
  saveState();
});

// Prerendering and tab discarding can swap the tab id in place.
chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
  await ready;
  for (const w of windowState.values()) {
    const i = w.order.indexOf(removedTabId);
    if (i >= 0) w.order[i] = addedTabId;
    if (w.active === removedTabId) w.active = addedTabId;
  }
  saveState();
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  await ready;
  windowState.delete(windowId);
  moveQueueByWindow.delete(windowId);
  saveState();
});
