# What To Do Next?

A local responsive schedule tool. Open `index.html` in a browser to use it.

## What it includes

- Thread Timeline for `todo`, `note`, and `milestone` items.
- Today To Do, Next To Do, and Inbox lists.
- Add buttons inside the Thread, Today, Next, Inbox, and monthly goal areas.
- Thread Timeline can be filtered to milestones only.
- Thread Timeline adds a light month divider when adjacent date groups cross into a different month.
- Next to do shows at most 5 upcoming records while its count still covers all remaining upcoming todos.
- Current-month calendar with Monday as the first day of the week and ISO week numbers.
- Year overview for monthly goals, grouped from Jan to Dec.
- Supabase cloud sync with local browser backup through `localStorage`.
- Export and import JSON backups for timeline records and monthly goals.
- A calm translucent sea-blue and mint visual style with soft coral accents.

## Data behavior

- Records are not written into `index.html`, `styles.css`, or `app.js`.
- Records are cached in the browser's `localStorage` and synced to Supabase table `schedule_desk_state`.
- If Supabase is unavailable, the tool still works locally and retries cloud saving on later edits.
- Export creates a standalone JSON backup file. Import reads a JSON backup and replaces the records in the current browser storage after confirmation.
- Backup files are named `schedule-desk-records-YYYY-MM-DD.json`.
- Completed todos and goals are shown in gray with a strikethrough.
- Todo records have a name, optional note, and optional link. Lists show the name, with small icons when note or link details exist.
- Notes and milestones have a name, content, and optional link.
- Milestones render on the Thread Timeline as blue diamond nodes without a white card.
- Within each Thread Timeline date, milestones show above todos, and notes show below todos.
- Todo checkboxes can be clicked directly from each view.
- Today, Next, and Inbox todo rows are lightweight rows without card boxes or date subtitles.
- Monthly goal checkboxes can also be clicked directly, and the goal text is shown as a lightweight row without a card box.
- Completed todos in Today To do move below unfinished todos.
- Notes show their name in the timeline, with content available in details.
- Monthly goals are separate from the Thread Timeline.

## Files

- `index.html`: page structure.
- `styles.css`: desktop layout and visual design.
- `app.js`: storage, rendering, and editing logic.
- `README.md`: this guide.

No build step is required. Supabase stores the shared cloud record.
