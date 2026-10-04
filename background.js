// Tab Tweaks — minimal Chrome/Edge extension.
// Req 1: closing the active tab focuses the left neighbor (instead of right).
// Req 2: new opener-linked tabs stack-insert immediately right of the opener.

const activeTabIdByWindow = new Map();   // windowId -> tabId
const tabIndexCache = new Map();         // tabId   -> { windowId, index }
const moveQueueByWindow = new Map();     // windowId -> Promise (per-window serialization)

// ---- Initialization ------------------------------------------------------

chrome.tabs.query({}).then((tabs) => {
  for (const t of tabs) {
    tabIndexCache.set(t.id, { windowId: t.windowId, index: t.index });
    if (t.active) activeTabIdByWindow.set(t.windowId, t.id);
  }
}).catch(() => {});

// ---- Req 1: close active → focus left ------------------------------------

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const { windowId, isWindowClosing } = removeInfo;
  const cached = tabIndexCache.get(tabId);
  const wasActive = activeTabIdByWindow.get(windowId) === tabId;

  if (!isWindowClosing && wasActive && cached && cached.index > 0) {
    activateLeftNeighbor(windowId, cached.index - 1, tabId);
  }

  tabIndexCache.delete(tabId);
  if (wasActive) activeTabIdByWindow.delete(windowId);
  if (!isWindowClosing) refreshWindowIndexes(windowId);
});

function activateLeftNeighbor(windowId, targetIndex, excludeTabId) {
  // Synchronous cache lookup first — Chrome auto-activates the right neighbor
  // immediately on close, so we want our update issued ASAP to minimize flicker.
  for (const [id, info] of tabIndexCache) {
    if (id === excludeTabId) continue;
    if (info.windowId === windowId && info.index === targetIndex) {
      chrome.tabs.update(id, { active: true }).catch(() => {});
      return;
    }
  }
  // Fallback for cold-start / cache miss.
  chrome.tabs.query({ windowId, index: targetIndex }).then((tabs) => {
    const left = tabs?.[0];
    if (left) chrome.tabs.update(left.id, { active: true }).catch(() => {});
  }).catch(() => {});
}

// ---- Req 2: stack-insert opener-linked tabs ------------------------------

chrome.tabs.onCreated.addListener((tab) => {
  tabIndexCache.set(tab.id, { windowId: tab.windowId, index: tab.index });
  if (tab.active) activeTabIdByWindow.set(tab.windowId, tab.id);

  if (!tab.openerTabId) return;

  // Snapshot Chrome's intended activation state and the previously-active tab
  // synchronously, before any async work. If our tabs.move spuriously
  // activates the new tab (observed on rapid sequential moves), we use these
  // to restore the original focus.
  const intendedActive = tab.active;
  const previouslyActive = activeTabIdByWindow.get(tab.windowId);

  enqueueForWindow(tab.windowId, async () => {
    let opener;
    try {
      opener = await chrome.tabs.get(tab.openerTabId);
    } catch {
      return;
    }
    if (opener.windowId !== tab.windowId) return;
    const target = opener.index + 1;
    if (tab.index === target) return;

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

// ---- Cache maintenance ---------------------------------------------------

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  activeTabIdByWindow.set(windowId, tabId);
  try {
    const t = await chrome.tabs.get(tabId);
    tabIndexCache.set(tabId, { windowId: t.windowId, index: t.index });
  } catch {}
});

chrome.tabs.onMoved.addListener((tabId, { windowId, toIndex }) => {
  const info = tabIndexCache.get(tabId);
  if (info) info.index = toIndex;
  refreshWindowIndexes(windowId);
});

chrome.tabs.onAttached.addListener((tabId, { newWindowId, newPosition }) => {
  tabIndexCache.set(tabId, { windowId: newWindowId, index: newPosition });
  refreshWindowIndexes(newWindowId);
});

chrome.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
  tabIndexCache.delete(tabId);
  refreshWindowIndexes(oldWindowId);
});

chrome.windows.onRemoved.addListener((windowId) => {
  activeTabIdByWindow.delete(windowId);
  moveQueueByWindow.delete(windowId);
});

async function refreshWindowIndexes(windowId) {
  try {
    const tabs = await chrome.tabs.query({ windowId });
    for (const t of tabs) tabIndexCache.set(t.id, { windowId, index: t.index });
  } catch {}
}
