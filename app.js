const ITEM_KEY = "scheduleDesk.items.v1";
const GOAL_KEY = "scheduleDesk.monthlyGoals.v1";
const ARCHIVED_TAG_KEY = "scheduleDesk.archivedTags.v1";
const BACKUP_VERSION = 1;
const SUPABASE_URL = "https://wyodcosmwgeyfktwekun.supabase.co";
const SUPABASE_API_KEY = "sb_publishable_1CgKc89CrmzOUeW6hBQr6A_dmk7_XO-";
const CLOUD_TABLE = "schedule_desk_state";
const CLOUD_RECORD_ID = "default";
const CLOUD_SAVE_DELAY = 700;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

let items = loadCollection(ITEM_KEY).map(normalizeItem).filter(Boolean);
let goals = loadCollection(GOAL_KEY).map(normalizeGoal).filter(Boolean);
let archivedTags = loadCollection(ARCHIVED_TAG_KEY).map(normalizeTag).filter(Boolean);
let timelineFilter = "all";
let selectedTag = "";
let cloudSaveTimer = 0;
let cloudPersistenceEnabled = false;
let lastCloudPayloadJson = "";

const today = new Date();
const todayKey = toDateKey(today);
const currentYear = today.getFullYear();

const els = {
  todayChip: document.querySelector("#todayChip"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataButton: document.querySelector("#importDataButton"),
  importDataInput: document.querySelector("#importDataInput"),
  tagFilterButton: document.querySelector("#tagFilterButton"),
  tagFilterMenu: document.querySelector("#tagFilterMenu"),
  filterMilestoneButton: document.querySelector("#filterMilestoneButton"),
  addThreadButton: document.querySelector("#addThreadButton"),
  addTodayButton: document.querySelector("#addTodayButton"),
  addNextButton: document.querySelector("#addNextButton"),
  addInboxButton: document.querySelector("#addInboxButton"),
  timelineList: document.querySelector("#timelineList"),
  todayTodos: document.querySelector("#todayTodos"),
  nextTodos: document.querySelector("#nextTodos"),
  inboxTodos: document.querySelector("#inboxTodos"),
  todayCount: document.querySelector("#todayCount"),
  nextCount: document.querySelector("#nextCount"),
  inboxCount: document.querySelector("#inboxCount"),
  monthLabel: document.querySelector("#monthLabel"),
  monthCalendar: document.querySelector("#monthCalendar"),
  goalYearLabel: document.querySelector("#goalYearLabel"),
  addGoalButton: document.querySelector("#addGoalButton"),
  monthlyGoals: document.querySelector("#monthlyGoals"),
  itemDialog: document.querySelector("#itemDialog"),
  itemForm: document.querySelector("#itemForm"),
  dialogMode: document.querySelector("#dialogMode"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelItemButton: document.querySelector("#cancelItemButton"),
  deleteItemButton: document.querySelector("#deleteItemButton"),
  itemId: document.querySelector("#itemId"),
  itemType: document.querySelector("#itemType"),
  itemDate: document.querySelector("#itemDate"),
  itemCompleted: document.querySelector("#itemCompleted"),
  itemName: document.querySelector("#itemName"),
  itemNote: document.querySelector("#itemNote"),
  itemLink: document.querySelector("#itemLink"),
  itemTag: document.querySelector("#itemTag"),
  todoNameField: document.querySelector("#todoNameField"),
  todoNoteField: document.querySelector("#todoNoteField"),
  todoLinkField: document.querySelector("#todoLinkField"),
  itemContent: document.querySelector("#itemContent"),
  itemContentField: document.querySelector("#itemContentField"),
  completionField: document.querySelector("#completionField"),
  goalDialog: document.querySelector("#goalDialog"),
  goalForm: document.querySelector("#goalForm"),
  goalDialogMode: document.querySelector("#goalDialogMode"),
  goalDialogTitle: document.querySelector("#goalDialogTitle"),
  closeGoalDialogButton: document.querySelector("#closeGoalDialogButton"),
  cancelGoalButton: document.querySelector("#cancelGoalButton"),
  deleteGoalButton: document.querySelector("#deleteGoalButton"),
  goalId: document.querySelector("#goalId"),
  goalMonth: document.querySelector("#goalMonth"),
  goalMonthLabel: document.querySelector("#goalMonthLabel"),
  goalCompleted: document.querySelector("#goalCompleted"),
  goalCompletionField: document.querySelector("#goalCompletionField"),
  goalContent: document.querySelector("#goalContent")
};

initialize();

function initialize() {
  els.todayChip.textContent = formatFullDate(today);
  els.monthLabel.textContent = `${monthNames[today.getMonth()]} ${currentYear}`;
  els.goalYearLabel.textContent = String(currentYear);

  els.exportDataButton.addEventListener("click", exportRecords);
  els.importDataButton.addEventListener("click", openImportPicker);
  els.importDataInput.addEventListener("change", importRecordsFromFile);
  els.tagFilterButton.addEventListener("click", toggleTagMenu);
  els.tagFilterMenu.addEventListener("click", handleTagMenuClick);
  els.tagFilterMenu.addEventListener("contextmenu", handleTagMenuContextMenu);
  document.addEventListener("click", closeTagMenuOnOutsideClick);
  els.filterMilestoneButton.addEventListener("click", toggleMilestoneFilter);
  els.addThreadButton.addEventListener("click", () => openItemDialog(null, { type: "todo", date: todayKey }));
  els.addTodayButton.addEventListener("click", () => openItemDialog(null, { type: "todo", date: todayKey }));
  els.addNextButton.addEventListener("click", () => openItemDialog(null, { type: "todo", date: toDateKey(addDays(today, 1)) }));
  els.addInboxButton.addEventListener("click", () => openItemDialog(null, { type: "todo", date: null }));
  els.addGoalButton.addEventListener("click", () => openGoalDialog(today.getMonth() + 1));
  els.closeDialogButton.addEventListener("click", closeItemDialog);
  els.cancelItemButton.addEventListener("click", closeItemDialog);
  els.deleteItemButton.addEventListener("click", deleteOpenItem);
  els.itemType.addEventListener("change", syncItemFieldsVisibility);
  els.itemForm.addEventListener("submit", saveItemFromDialog);
  els.itemDialog.addEventListener("click", closeDialogOnBackdrop);

  els.closeGoalDialogButton.addEventListener("click", closeGoalDialog);
  els.cancelGoalButton.addEventListener("click", closeGoalDialog);
  els.deleteGoalButton.addEventListener("click", deleteOpenGoal);
  els.goalForm.addEventListener("submit", saveGoalFromDialog);
  els.goalDialog.addEventListener("click", closeDialogOnBackdrop);

  els.timelineList.addEventListener("click", handleItemClick);
  els.todayTodos.addEventListener("click", handleTaskListClick);
  els.nextTodos.addEventListener("click", handleTaskListClick);
  els.inboxTodos.addEventListener("click", handleTaskListClick);
  els.monthlyGoals.addEventListener("change", handleGoalChange);
  els.monthlyGoals.addEventListener("click", handleGoalClick);

  render();
  void syncFromCloud();
}

function render() {
  persistRecords();
  renderTagFilter();
  renderTimeline();
  renderTaskLists();
  renderCalendar();
  renderMonthlyGoals();
}

function persistRecords() {
  saveCollection(ITEM_KEY, items);
  saveCollection(GOAL_KEY, goals);
  saveCollection(ARCHIVED_TAG_KEY, archivedTags);
  if (cloudPersistenceEnabled) {
    scheduleCloudSave();
  }
}

function loadCollection(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Could not load ${key}.`, error);
    return [];
  }
}

function saveCollection(key, collection) {
  window.localStorage.setItem(key, JSON.stringify(collection));
}

function createRecordsPayload() {
  return {
    items: items.map(normalizeItem).filter(Boolean),
    goals: goals.map(normalizeGoal).filter(Boolean),
    archivedTags: normalizeTagList(archivedTags)
  };
}

function isRecordsPayloadEmpty(payload) {
  return !payload || (!payload.items.length && !payload.goals.length && !payload.archivedTags.length);
}

async function syncFromCloud() {
  if (!SUPABASE_URL || !SUPABASE_API_KEY) {
    cloudPersistenceEnabled = true;
    return;
  }

  const localPayload = createRecordsPayload();
  try {
    const cloudRecords = await loadCloudRecords();
    if (cloudRecords && !isRecordsPayloadEmpty(cloudRecords)) {
      items = cloudRecords.items;
      goals = cloudRecords.goals;
      archivedTags = cloudRecords.archivedTags;
      lastCloudPayloadJson = JSON.stringify(createRecordsPayload());
      render();
    } else if (!isRecordsPayloadEmpty(localPayload)) {
      await saveCloudRecords(localPayload);
    }
  } catch (error) {
    console.warn("Cloud sync is unavailable. Local records are still saved.", error);
  } finally {
    cloudPersistenceEnabled = true;
  }
}

async function loadCloudRecords() {
  const url = `${SUPABASE_URL}/rest/v1/${CLOUD_TABLE}?record_id=eq.${encodeURIComponent(CLOUD_RECORD_ID)}&select=payload`;
  const response = await fetch(url, {
    headers: getCloudHeaders()
  });
  if (!response.ok) {
    throw new Error(`Cloud load failed: ${response.status}`);
  }

  const rows = await response.json();
  return parseBackupData(rows[0]?.payload || { items: [], goals: [], archivedTags: [] });
}

function scheduleCloudSave() {
  const payload = createRecordsPayload();
  const payloadJson = JSON.stringify(payload);
  if (payloadJson === lastCloudPayloadJson) {
    return;
  }

  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    cloudSaveTimer = 0;
    void saveCloudRecords(payload).catch((error) => {
      console.warn("Could not save records to Supabase. Local records are still saved.", error);
    });
  }, CLOUD_SAVE_DELAY);
}

async function saveCloudRecords(payload = createRecordsPayload()) {
  const payloadJson = JSON.stringify(payload);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${CLOUD_TABLE}?on_conflict=record_id`, {
    method: "POST",
    headers: {
      ...getCloudHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      record_id: CLOUD_RECORD_ID,
      payload,
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`Cloud save failed: ${response.status}`);
  }
  lastCloudPayloadJson = payloadJson;
}

function getCloudHeaders() {
  return {
    apikey: SUPABASE_API_KEY,
    Authorization: `Bearer ${SUPABASE_API_KEY}`
  };
}

function exportRecords() {
  const payload = createBackupPayload(items, goals, new Date().toISOString(), archivedTags);
  downloadJsonFile(payload, getBackupFileName(new Date()));
}

function createBackupPayload(recordItems, recordGoals, exportedAt = new Date().toISOString(), recordArchivedTags = []) {
  return {
    app: "Schedule Desk",
    version: BACKUP_VERSION,
    exportedAt,
    items: recordItems.map(normalizeItem).filter(Boolean),
    goals: recordGoals.map(normalizeGoal).filter(Boolean),
    archivedTags: normalizeTagList(recordArchivedTags)
  };
}

function getBackupFileName(date) {
  return `schedule-desk-records-${toDateKey(date)}.json`;
}

function downloadJsonFile(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function openImportPicker() {
  els.importDataInput.value = "";
  els.importDataInput.click();
}

function importRecordsFromFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const nextRecords = parseBackupData(parsed);
      if (!nextRecords) {
        window.alert("This backup file does not look like Schedule Desk records.");
        return;
      }

      const itemCount = nextRecords.items.length;
      const goalCount = nextRecords.goals.length;
      const confirmed = window.confirm(
        `Import ${itemCount} timeline items and ${goalCount} monthly goals? This will replace the records in this browser.`
      );
      if (!confirmed) {
        return;
      }

      items = nextRecords.items;
      goals = nextRecords.goals;
      archivedTags = nextRecords.archivedTags;
      render();
    } catch (error) {
      console.warn("Could not import records.", error);
      window.alert("Could not import this JSON file.");
    } finally {
      event.target.value = "";
    }
  });
  reader.addEventListener("error", () => {
    window.alert("Could not read this file.");
    event.target.value = "";
  });
  reader.readAsText(file);
}

function parseBackupData(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.items) || !Array.isArray(value.goals)) {
    return null;
  }

  return {
    items: value.items.map(normalizeItem).filter(Boolean),
    goals: value.goals.map(normalizeGoal).filter(Boolean),
    archivedTags: normalizeTagList(Array.isArray(value.archivedTags) ? value.archivedTags : [])
  };
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const type = ["todo", "note", "milestone"].includes(item.type) ? item.type : "todo";
  const split = splitLegacyContent(item.content || "");
  const name = String(item.name || split.name || "").trim();
  const tag = normalizeTag(item.tag || "");
  const createdAt = String(item.createdAt || "");
  const updatedAt = String(item.updatedAt || createdAt);

  if (type === "todo") {
    const note = String(item.note || split.content || "").trim();
    return {
      ...item,
      id: String(item.id || createId("item")),
      type,
      name,
      note,
      link: String(item.link || "").trim(),
      tag,
      content: composeTodoContent(name, note),
      date: item.date || null,
      completed: Boolean(item.completed),
      createdAt,
      updatedAt
    };
  }

  const content = item.name ? String(item.content || "").trim() : split.content;
  return {
    ...item,
    id: String(item.id || createId("item")),
    type,
    name,
    content,
    note: "",
    link: String(item.link || "").trim(),
    tag,
    date: item.date || null,
    completed: false,
    createdAt,
    updatedAt
  };
}

function normalizeTag(value) {
  return String(value || "").trim();
}

function normalizeTagList(tags) {
  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalizeGoal(goal) {
  if (!goal || typeof goal !== "object") {
    return null;
  }

  const year = Number(goal.year);
  const month = Number(goal.month);
  const content = String(goal.content || "").trim();
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !content) {
    return null;
  }

  const createdAt = String(goal.createdAt || "");
  return {
    ...goal,
    id: String(goal.id || createId("goal")),
    year,
    month,
    content,
    completed: Boolean(goal.completed),
    createdAt,
    updatedAt: String(goal.updatedAt || createdAt)
  };
}

function splitLegacyContent(content) {
  const lines = String(content).split(/\r?\n/);
  return {
    name: lines[0]?.trim() || "",
    content: lines.slice(1).join("\n").trim()
  };
}

function renderTagFilter() {
  const activeTags = getActiveTags();
  const archived = normalizeTagList(archivedTags);
  if (selectedTag && !activeTags.includes(selectedTag) && !archived.includes(selectedTag)) {
    selectedTag = "";
  }

  els.tagFilterButton.textContent = selectedTag || "Tag";
  els.tagFilterButton.classList.toggle("is-active", Boolean(selectedTag));
  els.tagFilterButton.setAttribute("aria-expanded", String(!els.tagFilterMenu.classList.contains("hidden")));
  els.tagFilterMenu.innerHTML = `
    <button class="tag-menu-item${selectedTag ? "" : " is-selected"}" type="button" data-tag-filter="">All Tags</button>
    ${
      activeTags.length
        ? activeTags
            .map(
              (tag) =>
                `<button class="tag-menu-item${tag === selectedTag ? " is-selected" : ""}" type="button" data-tag-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
            )
            .join("")
        : '<div class="tag-menu-empty">No active tags.</div>'
    }
    <details class="archived-tags">
      <summary>Archived Tags</summary>
      ${
        archived.length
          ? archived
              .map((tag) => `<button class="tag-menu-item archived-tag" type="button" data-restore-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
              .join("")
          : '<div class="tag-menu-empty">No archived tags.</div>'
      }
    </details>
  `;
}

function getActiveTags() {
  const archived = new Set(archivedTags);
  return normalizeTagList(items.map((item) => item.tag).filter((tag) => !archived.has(tag)));
}

function renderTimeline() {
  const groups = new Map();
  const datedItems = items.filter((item) => item.date);
  const timelineItems = datedItems.filter((item) => {
    if (timelineFilter === "milestone" && item.type !== "milestone") {
      return false;
    }
    if (selectedTag && item.tag !== selectedTag) {
      return false;
    }
    return true;
  });

  els.filterMilestoneButton.classList.toggle("is-active", timelineFilter === "milestone");
  els.filterMilestoneButton.setAttribute("aria-pressed", String(timelineFilter === "milestone"));

  timelineItems
    .slice()
    .sort(sortTimelineItems)
    .forEach((item) => {
      const groupKey = item.date;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(item);
    });

  if (groups.size === 0) {
    els.timelineList.innerHTML = emptyState(selectedTag ? `No items tagged ${selectedTag}.` : timelineFilter === "milestone" ? "No milestones yet." : "No timeline items yet.");
    return;
  }

  els.timelineList.innerHTML = Array.from(groups.entries())
    .map(([dateKey, groupItems], index, entries) => {
      const dateLabel = formatTimelineDate(dateKey);
      const previousDateKey = entries[index - 1]?.[0];
      const needsMonthDivider = Boolean(previousDateKey && getMonthKey(previousDateKey) !== getMonthKey(dateKey));
      const monthDivider = needsMonthDivider
        ? `<div class="timeline-month-divider" aria-hidden="true"><span>${escapeHtml(formatMonthDivider(dateKey))}</span></div>`
        : "";
      return `
        ${monthDivider}
        <div class="timeline-group">
          <div class="timeline-date">${escapeHtml(dateLabel)}</div>
          ${groupItems.map(renderTimelineEntry).join("")}
        </div>
      `;
    })
    .join("");
}

function toggleMilestoneFilter() {
  timelineFilter = timelineFilter === "milestone" ? "all" : "milestone";
  renderTimeline();
}

function toggleTagMenu(event) {
  event.stopPropagation();
  els.tagFilterMenu.classList.toggle("hidden");
  renderTagFilter();
}

function handleTagMenuClick(event) {
  const filterButton = event.target.closest("[data-tag-filter]");
  if (filterButton) {
    selectedTag = filterButton.dataset.tagFilter || "";
    els.tagFilterMenu.classList.add("hidden");
    render();
    return;
  }

  const restoreButton = event.target.closest("[data-restore-tag]");
  if (restoreButton) {
    archivedTags = archivedTags.filter((tag) => tag !== restoreButton.dataset.restoreTag);
    render();
  }
}

function handleTagMenuContextMenu(event) {
  const tagButton = event.target.closest("[data-tag-filter]");
  const tag = tagButton?.dataset.tagFilter;
  if (!tag) {
    return;
  }
  event.preventDefault();
  archivedTags = normalizeTagList([...archivedTags, tag]);
  if (selectedTag === tag) {
    selectedTag = "";
  }
  render();
}

function closeTagMenuOnOutsideClick(event) {
  if (!event.target.closest(".tag-filter")) {
    els.tagFilterMenu.classList.add("hidden");
    els.tagFilterButton.setAttribute("aria-expanded", "false");
  }
}

function renderTimelineEntry(item) {
  if (item.type === "milestone") {
    return renderMilestoneEntry(item);
  }

  const completedClass = item.type === "todo" && item.completed ? " is-completed" : "";
  const content = item.type === "todo" ? getItemName(item) : getItemName(item);
  const meta = item.type === "todo" ? "To Do" : item.type === "note" ? "Note" : "Milestone";
  const leadingControl =
    item.type === "todo"
      ? renderTodoCheckbox(item)
      : `<span class="item-icon icon-${escapeHtml(item.type)}" aria-hidden="true"></span>`;
  const indicators = item.type === "todo" ? renderTodoIndicators(item) : "";
  const tagPill = renderTagPill(item);

  return `
    <article class="entry-card${completedClass}" data-item-id="${escapeHtml(item.id)}">
      <span class="entry-topline">
        ${leadingControl}
        <button class="item-open-button" type="button" data-open-item-id="${escapeHtml(item.id)}">
          <span class="entry-text">${escapeHtml(content)}</span>
          ${tagPill}
          ${indicators}
        </button>
      </span>
      <span class="entry-meta">${escapeHtml(meta)}</span>
    </article>
  `;
}

function renderMilestoneEntry(item) {
  return `
    <div class="milestone-entry" data-item-id="${escapeHtml(item.id)}">
      <button class="milestone-open-button" type="button" data-open-item-id="${escapeHtml(item.id)}">
        ${escapeHtml(getItemName(item))}
        ${renderTagPill(item)}
      </button>
    </div>
  `;
}

function renderTaskLists() {
  const todos = items.filter((item) => item.type === "todo");
  const todayTodos = todos
    .filter((item) => item.date === todayKey)
    .sort(sortIncompleteFirstThenCreated);
  const nextTodos = todos
    .filter((item) => item.date && item.date > todayKey)
    .sort(sortFutureTodos);
  const visibleNextTodos = nextTodos.slice(0, 5);
  const inboxTodos = todos
    .filter((item) => !item.date)
    .sort(sortIncompleteFirstThenCreated);

  els.todayCount.textContent = String(countIncomplete(todayTodos));
  els.nextCount.textContent = String(countIncomplete(nextTodos));
  els.inboxCount.textContent = String(countIncomplete(inboxTodos));

  els.todayTodos.innerHTML = todayTodos.length
    ? todayTodos.map((item) => renderTaskCard(item)).join("")
    : emptyState("No To Do for today.");

  els.nextTodos.innerHTML = visibleNextTodos.length
    ? visibleNextTodos.map((item) => renderTaskCard(item, { showWeekday: true })).join("")
    : emptyState("No upcoming dated To Do.");

  els.inboxTodos.innerHTML = inboxTodos.length
    ? inboxTodos.map((item) => renderTaskCard(item)).join("")
    : emptyState("No undated To Do.");
}

function renderTaskCard(item, options = {}) {
  const completedClass = item.completed ? " is-completed" : "";
  const weekday = options.showWeekday && item.date ? `<span class="weekday-tag">${escapeHtml(getWeekdayTag(item.date))}</span>` : "";
  const indicators = renderTodoIndicators(item);
  const tagPill = renderTagPill(item);

  return `
    <article class="task-card${completedClass}" data-item-id="${escapeHtml(item.id)}">
      ${renderTodoCheckbox(item)}
      <button class="item-open-button task-open-button" type="button" data-open-item-id="${escapeHtml(item.id)}">
        <span class="task-topline">
          ${weekday}
          <span class="task-text">${escapeHtml(getItemName(item))}</span>
          ${tagPill}
          ${indicators}
        </span>
      </button>
    </article>
  `;
}

function renderTodoCheckbox(item) {
  const checked = item.completed ? " checked" : "";
  return `
    <input
      class="todo-checkbox"
      type="checkbox"
      data-toggle-todo-id="${escapeHtml(item.id)}"
      aria-label="Mark ${escapeHtml(getItemName(item))} complete"
      ${checked}
    />
  `;
}

function renderTodoIndicators(item) {
  const hasNote = Boolean(getTodoNote(item));
  const hasLink = Boolean(getItemLink(item));
  if (!hasNote && !hasLink) {
    return "";
  }

  return `
    <span class="todo-indicators" aria-label="${escapeHtml(getTodoIndicatorLabel(hasNote, hasLink))}">
      ${hasNote ? '<span class="indicator-icon indicator-note" title="Has note" aria-hidden="true"></span>' : ""}
      ${hasLink ? '<span class="indicator-icon indicator-link" title="Has link" aria-hidden="true"></span>' : ""}
    </span>
  `;
}

function getTodoIndicatorLabel(hasNote, hasLink) {
  if (hasNote && hasLink) {
    return "Has note and link";
  }
  return hasNote ? "Has note" : "Has link";
}

function getTodoName(item) {
  return getItemName(item);
}

function getTodoNote(item) {
  return item.note || "";
}

function getTodoLink(item) {
  return getItemLink(item);
}

function getItemName(item) {
  return item.name || splitLegacyContent(item.content || "").name || `Untitled ${item.type || "item"}`;
}

function getItemContent(item) {
  if (item.type === "todo") {
    return getTodoNote(item);
  }
  return item.name ? item.content || "" : splitLegacyContent(item.content || "").content;
}

function getItemLink(item) {
  return item.link || "";
}

function getItemTag(item) {
  return item.tag || "";
}

function renderTagPill(item) {
  const tag = getItemTag(item);
  return tag ? `<span class="tag-pill">${escapeHtml(tag)}</span>` : "";
}

function composeTodoContent(name, note) {
  return note ? `${name}\n${note}` : name;
}

function toggleTodoCompleted(id, completed) {
  const now = new Date().toISOString();
  items = items.map((item) => {
    if (item.id !== id || item.type !== "todo") {
      return item;
    }
    return {
      ...item,
      completed,
      updatedAt: now
    };
  });
  render();
}

function renderCalendar() {
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = getMondayOffset(firstOfMonth);
  const startDate = new Date(year, month, 1 - mondayOffset);
  const weekCount = Math.ceil((mondayOffset + daysInMonth) / 7);

  const cells = [
    `<div class="calendar-cell calendar-header">Week</div>`,
    ...weekdayNames.map((day) => `<div class="calendar-cell calendar-header">${day}</div>`)
  ];

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const weekStart = addDays(startDate, weekIndex * 7);
    cells.push(`<div class="calendar-cell week-number">W${getIsoWeek(weekStart)}</div>`);

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = toDateKey(date) === todayKey;
      const dayText = isCurrentMonth ? String(date.getDate()) : "";
      const classes = [
        "calendar-cell",
        isCurrentMonth ? "" : "is-outside-month",
        isToday ? "is-today" : ""
      ]
        .filter(Boolean)
        .join(" ");

      cells.push(`
        <div class="${classes}">
          <span class="day-number">${escapeHtml(dayText)}</span>
        </div>
      `);
    }
  }

  els.monthCalendar.innerHTML = cells.join("");
}

function renderMonthlyGoals() {
  const markup = monthNames
    .map((monthName, monthIndex) => {
      const month = monthIndex + 1;
      const monthGoals = goals
        .filter((goal) => goal.year === currentYear && goal.month === month)
        .sort(sortIncompleteFirstThenCreated);
      const list = monthGoals.length
        ? monthGoals.map(renderGoalItem).join("")
        : `<div class="empty-state">No goals.</div>`;

      return `
        <section class="month-card" aria-label="${escapeHtml(monthName)} goals">
          <div class="month-card-header">
            <h3>${escapeHtml(monthName)}</h3>
            <button class="mini-button" type="button" data-add-goal-month="${month}">+</button>
          </div>
          <div class="goal-list">${list}</div>
        </section>
      `;
    })
    .join("");

  els.monthlyGoals.innerHTML = markup;
}

function renderGoalItem(goal) {
  const completedClass = goal.completed ? " is-completed" : "";
  const checked = goal.completed ? " checked" : "";

  return `
    <div class="goal-item${completedClass}" data-goal-id="${escapeHtml(goal.id)}">
      <input
        class="todo-checkbox goal-checkbox"
        type="checkbox"
        data-toggle-goal-id="${escapeHtml(goal.id)}"
        aria-label="Mark ${escapeHtml(goal.content)} complete"
        ${checked}
      />
      <button class="goal-open-button" type="button" data-open-goal-id="${escapeHtml(goal.id)}">
        <span class="goal-text">${escapeHtml(goal.content)}</span>
      </button>
    </div>
  `;
}

function openItemDialog(item = null, defaults = {}) {
  const isEditing = Boolean(item);
  els.dialogMode.textContent = isEditing ? "Edit item" : "New item";
  els.dialogTitle.textContent = isEditing ? "Edit Timeline Item" : "Add Timeline Item";
  els.itemId.value = item?.id || "";
  els.itemType.value = item?.type || defaults.type || "todo";
  els.itemDate.value = item ? item.date || "" : defaults.date === null ? "" : defaults.date || todayKey;
  els.itemCompleted.checked = Boolean(item?.completed);
  els.itemName.value = item ? getItemName(item) : "";
  els.itemNote.value = item?.type === "todo" ? getTodoNote(item) : "";
  els.itemLink.value = item ? getItemLink(item) : "";
  els.itemTag.value = item ? getItemTag(item) : "";
  els.itemContent.value = item && item.type !== "todo" ? getItemContent(item) : "";
  els.deleteItemButton.classList.toggle("hidden", !isEditing);
  syncItemFieldsVisibility();
  showDialog(els.itemDialog);
  els.itemName.focus();
}

function closeItemDialog() {
  els.itemDialog.close();
}

function saveItemFromDialog(event) {
  event.preventDefault();
  const type = els.itemType.value;
  const name = els.itemName.value.trim();
  const note = els.itemNote.value.trim();
  const link = els.itemLink.value.trim();
  const tag = normalizeTag(els.itemTag.value);
  const content = els.itemContent.value.trim();

  if (!name) {
    els.itemName.focus();
    return;
  }

  const now = new Date().toISOString();
  const id = els.itemId.value;
  const existing = items.find((item) => item.id === id);
  const nextItem = {
    id: existing?.id || createId("item"),
    type,
    content: type === "todo" ? composeTodoContent(name, note) : content,
    name,
    note: type === "todo" ? note : "",
    link,
    tag,
    date: els.itemDate.value || null,
    completed: type === "todo" ? els.itemCompleted.checked : false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existing) {
    items = items.map((item) => (item.id === existing.id ? nextItem : item));
  } else {
    items = [...items, nextItem];
  }

  closeItemDialog();
  render();
}

function deleteOpenItem() {
  const id = els.itemId.value;
  if (!id) {
    return;
  }

  const item = items.find((entry) => entry.id === id);
  if (!item) {
    closeItemDialog();
    return;
  }

  if (!window.confirm("Delete this single item?")) {
    return;
  }

  items = items.filter((entry) => entry.id !== id);
  closeItemDialog();
  render();
}

function syncItemFieldsVisibility() {
  const isTodo = els.itemType.value === "todo";
  els.completionField.classList.toggle("hidden", !isTodo);
  els.todoNameField.classList.remove("hidden");
  els.todoNoteField.classList.toggle("hidden", !isTodo);
  els.todoLinkField.classList.remove("hidden");
  els.itemContentField.classList.toggle("hidden", isTodo);
  els.itemName.placeholder = `${capitalizeItemType(els.itemType.value)} name`;
  els.itemContent.placeholder =
    els.itemType.value === "milestone" ? "Milestone content..." : "Note content...";
  if (!isTodo) {
    els.itemCompleted.checked = false;
  }
}

function handleItemClick(event) {
  const toggle = event.target.closest("[data-toggle-todo-id]");
  if (toggle) {
    toggleTodoCompleted(toggle.dataset.toggleTodoId, toggle.checked);
    return;
  }

  const openButton = event.target.closest("[data-open-item-id]");
  if (!openButton) {
    return;
  }
  const item = items.find((entry) => entry.id === openButton.dataset.openItemId);
  if (item) {
    openItemDialog(item);
  }
}

function handleTaskListClick(event) {
  handleItemClick(event);
}

function openGoalDialog(month, goal = null) {
  const isEditing = Boolean(goal);
  els.goalDialogMode.textContent = isEditing ? "Edit goal" : "New goal";
  els.goalDialogTitle.textContent = `${monthNames[month - 1]} Goal`;
  els.goalId.value = goal?.id || "";
  els.goalMonth.value = String(month);
  els.goalMonthLabel.value = `${monthNames[month - 1]} ${currentYear}`;
  els.goalCompleted.checked = Boolean(goal?.completed);
  els.goalContent.value = goal?.content || "";
  els.deleteGoalButton.classList.toggle("hidden", !isEditing);
  els.goalCompletionField.classList.toggle("hidden", !isEditing);
  showDialog(els.goalDialog);
  els.goalContent.focus();
}

function closeGoalDialog() {
  els.goalDialog.close();
}

function saveGoalFromDialog(event) {
  event.preventDefault();
  const content = els.goalContent.value.trim();
  if (!content) {
    els.goalContent.focus();
    return;
  }

  const now = new Date().toISOString();
  const id = els.goalId.value;
  const month = Number(els.goalMonth.value);
  const existing = goals.find((goal) => goal.id === id);
  const nextGoal = {
    id: existing?.id || createId("goal"),
    year: currentYear,
    month,
    content,
    completed: existing ? els.goalCompleted.checked : false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existing) {
    goals = goals.map((goal) => (goal.id === existing.id ? nextGoal : goal));
  } else {
    goals = [...goals, nextGoal];
  }

  closeGoalDialog();
  render();
}

function deleteOpenGoal() {
  const id = els.goalId.value;
  if (!id) {
    return;
  }

  const goal = goals.find((entry) => entry.id === id);
  if (!goal) {
    closeGoalDialog();
    return;
  }

  if (!window.confirm("Delete this single goal?")) {
    return;
  }

  goals = goals.filter((entry) => entry.id !== id);
  closeGoalDialog();
  render();
}

function handleGoalClick(event) {
  const toggle = event.target.closest("[data-toggle-goal-id]");
  if (toggle) {
    return;
  }

  const addButton = event.target.closest("[data-add-goal-month]");
  if (addButton) {
    openGoalDialog(Number(addButton.dataset.addGoalMonth));
    return;
  }

  const goalButton = event.target.closest("[data-open-goal-id]");
  if (goalButton) {
    const goal = goals.find((entry) => entry.id === goalButton.dataset.openGoalId);
    if (goal) {
      openGoalDialog(goal.month, goal);
    }
  }
}

function handleGoalChange(event) {
  const toggle = event.target.closest("[data-toggle-goal-id]");
  if (!toggle) {
    return;
  }
  toggleGoalCompleted(toggle.dataset.toggleGoalId, toggle.checked);
}

function toggleGoalCompleted(id, completed) {
  const now = new Date().toISOString();
  goals = goals.map((goal) => {
    if (goal.id !== id) {
      return goal;
    }
    return {
      ...goal,
      completed,
      updatedAt: now
    };
  });
  render();
}

function closeDialogOnBackdrop(event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
}

function showDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function sortTimelineItems(a, b) {
  if (a.date && b.date && a.date !== b.date) {
    return b.date.localeCompare(a.date);
  }
  if (a.date && !b.date) {
    return -1;
  }
  if (!a.date && b.date) {
    return 1;
  }
  const typeDifference = getTimelineTypeRank(a.type) - getTimelineTypeRank(b.type);
  if (typeDifference !== 0) {
    return typeDifference;
  }
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

function getTimelineTypeRank(type) {
  if (type === "milestone") {
    return 0;
  }
  if (type === "todo") {
    return 1;
  }
  if (type === "note") {
    return 2;
  }
  return 3;
}

function sortIncompleteFirstThenCreated(a, b) {
  if (Boolean(a.completed) !== Boolean(b.completed)) {
    return Number(a.completed) - Number(b.completed);
  }
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

function sortFutureTodos(a, b) {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  return sortIncompleteFirstThenCreated(a, b);
}

function countIncomplete(collection) {
  return collection.filter((item) => !item.completed).length;
}

function capitalizeItemType(type) {
  if (type === "todo") {
    return "Todo";
  }
  if (type === "milestone") {
    return "Milestone";
  }
  return "Note";
}

function firstLine(value) {
  return value.split(/\r?\n/)[0] || value;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatFullDate(date) {
  return `${weekdayNames[getMondayOffset(date)]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTimelineDate(dateKey) {
  const date = parseDateKey(dateKey);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${weekdayNames[getMondayOffset(date)]}`;
}

function getMonthKey(dateKey) {
  return dateKey.slice(0, 7);
}

function formatMonthDivider(dateKey) {
  const date = parseDateKey(dateKey);
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCompactDate(dateKey) {
  const date = parseDateKey(dateKey);
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function getWeekdayTag(dateKey) {
  const date = parseDateKey(dateKey);
  return weekdayNames[getMondayOffset(date)];
}

function getMondayOffset(date) {
  return (date.getDay() + 6) % 7;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getIsoWeek(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const daysSinceYearStart = Math.floor((utcDate - yearStart) / 86400000) + 1;
  return Math.ceil(daysSinceYearStart / 7);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
