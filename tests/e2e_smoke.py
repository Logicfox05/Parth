"""
End-to-end smoke test driven by Playwright (Python), against the production
build served on http://localhost:8842. Exercises the core walkthroughs
described in TESTING.md: signup/login gate, Dashboard load, Calendar -> Day
-> Record -> Save/Submit/Verify, Fly Catcher, GAP, Training, Demo Mode
generation, persistence across reload, and print.

Run: npm run test:e2e
(Drives scripts/run-e2e.ts, which builds, starts backend/index.ts on :8842
-- serving dist/ AND the auth API from one process -- waits for it to be
ready, runs this script, then shuts the server down again.)
"""
import re
import sys
import time
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:8842"
FAILURES = []
# A fresh, random account per run: signup enforces unique emails, and the
# app now gates every page behind login (see src/main.tsx / AuthProvider).
TEST_EMAIL = f"e2e-{int(time.time() * 1000)}@example.com"
TEST_PASSWORD = "PlaywrightQA123"


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        FAILURES.append(label)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        console_errors = []
        page.on("pageerror", lambda e: console_errors.append(str(e)))
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        # ---- 1. Signup gate, then Dashboard loads ----
        page.goto(f"{BASE}/index.html")
        page.wait_for_timeout(400)
        check("Login screen renders (app gates on auth)", "Log In" in page.content())

        page.click("text=Sign up")
        page.wait_for_timeout(150)
        page.fill("#signup-name", "Playwright QA")
        page.fill("#signup-email", TEST_EMAIL)
        page.fill("#signup-password", TEST_PASSWORD)
        page.fill("#signup-confirm", TEST_PASSWORD)
        page.click("button:has-text('Create Account')")
        page.wait_for_timeout(500)

        # ---- 1b. The assistant's login briefing ----
        # On first arrival the assistant pops up with what it has already
        # prepared (every Live record due today or earlier is pre-filled at
        # bootstrap -- see engine/assistantPrepare.ts). It is a blocking
        # overlay, so dismiss it before driving the rest of the app.
        page.wait_for_timeout(300)
        check("Assistant briefing popup greets the user on login", "Good morning" in page.content() or "Good afternoon" in page.content() or "Good evening" in page.content())
        check("Briefing lists records the assistant filled in", "ready for your OK" in page.content())
        got_it = page.locator("button:has-text('Got it')")
        if got_it.count():
            got_it.first.click()
            page.wait_for_timeout(200)

        check("Dashboard heading renders after signup", "Digital Controlled Record System" in page.content())
        check("Top bar shows the signed-up user", "Playwright QA" in page.content())
        check("Dashboard shows the assistant's briefing card", "Open briefing" in page.content())
        # The pre-signup /api/auth/me session check is an expected 401 (no
        # session yet) and Chromium logs failed fetches to console as
        # "errors" regardless of the app handling them gracefully -- ignore
        # that one known-benign entry, but still fail on anything else.
        unexpected_errors = [e for e in console_errors if "auth/me" not in e and "401" not in e]
        check("No unexpected console errors on initial load", len(unexpected_errors) == 0)

        # ---- 2. Calendar -> Day View ----
        page.click("text=Record Calendar")
        page.wait_for_timeout(200)
        check("Calendar grid renders", page.locator(".calendar-grid").count() > 0)

        today_cell = page.locator(".calendar-cell.today")
        check("Today cell present", today_cell.count() == 1)

        # ---- 2b. Regression: browsing the Calendar to a month long before
        # this system existed must NOT manufacture a backlog of "Due"
        # records for it (engine/recordGenerator.ts's liveStartDate floor —
        # see engine/backlogCleanup.ts for the one-time cleanup of any such
        # noise a pre-fix session already created). Before this fix, every
        # one of the app's ~10 daily-frequency documents got a blank shell
        # for every day of every month ever viewed here.
        page.goto(f"{BASE}/index.html#/calendar/2019/5")
        page.wait_for_timeout(400)
        page.goto(f"{BASE}/index.html#/calendar/2020/0")
        page.wait_for_timeout(400)
        page.click("text=Dashboard")
        page.wait_for_timeout(300)
        check("No pre-launch backlog banner after browsing old calendar months", page.locator("text=Clean up").count() == 0)

        page.click("text=Record Calendar")
        page.wait_for_timeout(200)
        today_cell = page.locator(".calendar-cell.today")
        today_cell.first.click()
        page.wait_for_timeout(300)
        check("Day view opens", "Records Due" in page.content())

        # ---- 3. Open Daily Pest Monitoring record, fill, save, submit ----
        opened_record = False
        rows = page.locator(".doc-table tbody tr")
        n = rows.count()
        for i in range(n):
            row_text = rows.nth(i).inner_text()
            if "Daily Pest Control Monitoring" in row_text:
                rows.nth(i).locator("button", has_text="Open").click()
                opened_record = True
                break
        check("Opened a Daily Pest Monitoring record from Day View", opened_record)
        page.wait_for_timeout(300)

        if opened_record:
            check("Record page shows checkpoint table", page.locator(".doc-table").count() > 0)
            check("Daily record was pre-filled by the assistant", "Your assistant has filled this in" in page.content())
            # Fill all checkpoint selects
            selects = page.locator("table select.input")
            count = selects.count()
            for i in range(count):
                sel = selects.nth(i)
                options = sel.locator("option").all_inner_texts()
                # pick a non-empty, "good" option (OK or No) deterministically
                target = "OK" if "OK" in options else ("No" if "No" in options else options[-1])
                sel.select_option(label=target)
            number_inputs = page.locator("table input[type=number]")
            for i in range(number_inputs.count()):
                number_inputs.nth(i).fill("12")
            time_input = page.locator("input[type=time]")
            if time_input.count():
                time_input.first.fill("09:15")
            checker_input = page.locator("input[placeholder='Name of checker']")
            if checker_input.count():
                checker_input.first.fill("Playwright QA")

            page.click("button:has-text('Submit')")
            page.wait_for_timeout(300)
            check("Record submitted (status Pending Verification)", "Pending Verification" in page.content())

            verify_btn = page.locator("button:has-text('Verify')")
            if verify_btn.count():
                verify_btn.first.click()
                page.wait_for_timeout(300)
                check("Record verified", "Verified" in page.content())

        # ---- 3b. A lamination log sheet (generic log-sheet kind), prepared by the assistant ----
        page.click("text=Record Calendar")
        page.wait_for_timeout(200)
        page.locator(".calendar-cell.today").first.click()
        page.wait_for_timeout(300)
        rows = page.locator(".doc-table tbody tr")
        opened_log = False
        for i in range(rows.count()):
            if "Lamination Adhesive Viscosity Record" in rows.nth(i).inner_text():
                rows.nth(i).locator("button", has_text="Open").click()
                opened_log = True
                break
        check("Opened the F-QC-30 viscosity log sheet from Day View", opened_log)
        page.wait_for_timeout(300)
        if opened_log:
            check("Log sheet shows the F-QC-30 header", "F-QC-30" in page.content())
            check("Log sheet was pre-filled with 24 hourly rows", page.locator("table.log-sheet tbody tr").count() == 24)
            check("Prepared banner explains what was filled", "hourly readings" in page.content())
            page.click("button:has-text('Submit')")
            page.wait_for_timeout(300)
            check("Log sheet submitted (status Pending Verification)", "Pending Verification" in page.content())

        # ---- 4. Persistence across reload ----
        page.reload()
        page.wait_for_timeout(400)
        check("Status persists after reload", "Verified" in page.content() or "Pending Verification" in page.content())

        # ---- 5. Dashboard reflects update ----
        page.click("text=Dashboard")
        page.wait_for_timeout(300)
        check("Dashboard shows stat tiles", page.locator(".stat-tile").count() >= 4)

        # ---- 6. Demo Mode: generate + isolation from live ----
        # Switch to Demo mode via the top-bar pill (not just the sidebar nav
        # link, which only navigates without switching mode), then visit
        # Dashboard and Reports -- which both auto-generate records for the
        # viewed month -- BEFORE explicitly generating. This reproduces the
        # exact ordering that once let those pages' own "ensure records
        # exist" effect silently pre-fill every date in the month with
        # blank shells ahead of time, defeating the generator entirely
        # (fixed in engine/recordGenerator.ts + the Dashboard/Calendar/
        # DayView/Reports call sites -- they must always pass isDemo:false).
        page.click(".pill-tab:has-text('Demo Mode')")
        page.wait_for_timeout(200)
        page.click("text=Dashboard")
        page.wait_for_timeout(200)
        page.click("text=Reports")
        page.wait_for_timeout(200)

        page.click("text=Demo Mode")
        page.wait_for_timeout(200)
        # Entering Demo Mode + visiting the Dashboard now fills the year so
        # far with realistic demo data itself (see DashboardPage), so the
        # explicit button is idempotent for the current month. What must
        # hold is that demo data exists and is REAL data (statuses, filled
        # values), not the blank "Due" shells the old bug produced.
        stored = re.search(r"(\d+) demo record\(s\) currently stored", page.content())
        check("Demo data was generated on entering Demo Mode (not pre-empted by Live shells)", bool(stored) and int(stored.group(1)) > 0)
        page.click("button:has-text('Generate Demo Records')")
        page.wait_for_timeout(600)
        match = re.search(r"Created (\d+) new demo record", page.content())
        check("Explicit demo generation is idempotent and reports a count", bool(match))

        page.click("text=Record Calendar")
        page.wait_for_timeout(300)
        check("Demo mode banner visible", "DEMO MODE" in page.content())
        check("Demo calendar shows completed (filled) records, not blank shells", "Completed" in page.content())

        # ---- 6b. Rodent catch pattern, in the company's own report layout ----
        # The demo year's Daily Pest Control Monitoring Records follow the
        # generated seasonal catch pattern (tools/rodent_pattern.py), so the
        # Rodent Trend report must show the reported history rows AND a
        # non-zero digital total with per-location detail.
        page.click("text=Reports")
        page.wait_for_timeout(300)
        page.click(".pill-tab:has-text('Rodent Trend')")
        page.wait_for_timeout(400)
        # inner_text honours the table-header text-transform (uppercase), so
        # compare case-insensitively.
        rodent_report = page.locator(".app-content").inner_text().lower()
        check("Rodent report uses the company's layout (Source / Unit / Target Pest / Year / Total)", "trapped on glue boards in roda-boxes" in rodent_report and "target pest" in rodent_report)
        check("Rodent report shows the reported 2025 history (2 rodents, May & June)", "2025" in rodent_report and "(as reported)" in rodent_report)
        digital_total = re.search(r"\((\d+) in total across (\d+) days?", rodent_report)
        check("Digital rodent total over the demo year is non-zero (pattern applied)", digital_total is not None and int(digital_total.group(1)) > 0)
        check("Rodent report breaks catches down by location", "where they were found" in rodent_report and ("canteen" in rodent_report or "rm inward" in rodent_report or "store" in rodent_report))

        # switch back to live and confirm demo doesn't leak
        page.click("text=Live Mode")
        page.wait_for_timeout(300)
        check("Live mode banner visible after switch", "LIVE MODE" in page.content())

        # ---- 7. CAPA module: Internal / External chooser, then Internal list ----
        page.goto(f"{BASE}/index.html#/gap")
        page.wait_for_timeout(400)
        capa_home = page.locator(".app-content").inner_text()
        check("CAPA home offers exactly the two options, Internal and External", "Internal" in capa_home and "External" in capa_home and "Open Internal" in capa_home and "Open External" in capa_home)
        page.click("a:has-text('Internal — Inspection Findings')")
        page.wait_for_timeout(300)
        check("CAPA Internal list shows seeded Dec-2023 inspection", "Gujarat Print Pack Publications" in page.content())

        # ---- 7b. CAPA External: the assistant walks a new complaint through A→E, then approval ----
        page.click("a:has-text('External — Customer Complaints')")
        page.wait_for_timeout(300)
        check("CAPA External list shows the F/MKT/05 checklist", "F/MKT/05" in page.content())
        page.click("button:has-text('New Complaint')")
        page.wait_for_timeout(900)  # widget auto-opens + greeting + first question
        check("New complaint auto-starts the assistant walk-through", page.locator(".chat-msg.bot", has_text="Let's do Complaint").count() == 1)
        check("Assistant asks for the customer first", page.locator(".chat-msg.bot", has_text="Which customer").count() == 1)

        def chat_type(text):
            page.fill("textarea.input", text)
            page.keyboard.press("Enter")
            page.wait_for_timeout(250)

        def chat_chip(label_regex):
            chips = page.locator(".chat-chip", has_text=re.compile(label_regex))
            chips.last.click()
            page.wait_for_timeout(250)

        chat_type("Gulab Oil And Food")
        chat_type("CC-2026-001")
        chat_chip(r"^Skip$")          # job name (optional)
        chat_chip(r"^Skip$")          # job code
        chat_chip(r"^Skip$")          # PO no.
        chat_chip(r"^Today$")         # complaint received date
        check("Header details captured on the form", page.locator("input[value='Gulab Oil And Food']").count() == 1 and page.locator("input[value='CC-2026-001']").count() == 1)

        check("Assistant announces Section A", page.locator(".chat-msg.bot", has_text="Section A").count() >= 1)
        chat_chip(r"^Let's go$")
        for _ in range(5):
            chat_chip(r"^Done today$")
        check("Section B is announced after A's five activities", page.locator(".chat-msg.bot", has_text="Section B").count() >= 1)
        for section in ["C", "D", "E"]:
            chat_chip(r"^All \d+ done today$")
            check(f"Section {section} is announced next", page.locator(".chat-msg.bot", has_text=f"Section {section}").count() >= 1)
        chat_chip(r"^All \d+ done today$")   # Section E
        check("After E the assistant asks for approval", page.locator(".chat-msg.bot", has_text="Shall I submit it for approval now").count() == 1)
        # 31, not 32: the printed form's Sr. No. runs 1-32 but skips 6.
        check("Form shows all 31 activities done", "31 / 31" in page.locator(".app-content").inner_text())

        chat_chip(r"^Submit for approval$")
        check("Assistant confirms submission", page.locator(".chat-msg.bot", has_text="Submitted").count() == 1)
        check("Checklist status is Pending Verification (awaiting approval)", "Pending Verification" in page.locator(".app-content").inner_text())
        check("Prepared By was stamped with the logged-in user", page.locator("input[value='Playwright QA']").count() >= 1)

        chat_chip(r"^Review & approve$")
        check("Assistant offers to approve", page.locator(".chat-chip", has_text=re.compile(r"^Approve$")).count() == 1)
        chat_chip(r"^Approve$")
        check("Assistant confirms approval", page.locator(".chat-msg.bot", has_text="signed off as Approved By with your name").count() == 1)
        check("Checklist status is Verified (approved)", "Verified" in page.locator(".app-content").inner_text())
        page.click("button[aria-label='Close assistant']")
        page.wait_for_timeout(150)

        # ---- 8. Training module ----
        page.click("text=Training Records")
        page.wait_for_timeout(300)
        check("Training list shows seeded record", "Yogesh Rathod" in page.content() or "Gurudev" in page.content())
        check("Training list shows the Dec-2025 awareness programme", "Awareness" in page.content())

        # ---- 8b. Statements of Compliance ----
        page.click("text=Statements of Compliance")
        page.wait_for_timeout(300)
        check("SOC list shows both statements", "F/QC- 09" in page.content() and "F/QC- 38" in page.content())
        page.click("text=Pressure Labels")
        page.wait_for_timeout(300)
        check("SOC detail renders the declaration", "Shail Patel" in page.content() and "94/62/EC" in page.content())

        # ---- 9. Chemical Master ----
        page.click("text=Chemical Master")
        page.wait_for_timeout(300)
        check("Chemical master shows pesticide chart", "Rodent Control Service" in page.content())

        # ---- 10. SOP reference ----
        page.click("text=SOP Reference")
        page.wait_for_timeout(300)
        check("SOP reference shows Lizard quarterly frequency", "Quarterly" in page.content())

        # ---- 11. Reports ----
        page.click("text=Reports")
        page.wait_for_timeout(300)
        check("Reports page renders tabs", "Monthly Records Report" in page.content())
        page.click(".pill-tab:has-text('Lamination QC')")
        page.wait_for_timeout(300)
        check("Lamination QC report renders", "Avg viscosity" in page.content())

        # ---- 12. Document Library ----
        page.click("text=Document Library")
        page.wait_for_timeout(300)
        check("Document Library lists all 22 documents", page.locator(".doc-table tbody tr").count() == 22)
        check("Document Library shows the lamination module", "Lamination — Quality Control" in page.content())
        check("Document Library shows the QC inspection module", "Quality Control — Inspection Records" in page.content())
        check("Document Library groups both CAPA documents under the CAPA module", page.locator(".app-content h3:has-text('CAPA (Corrective')").count() == 1)

        # ---- 12a. Sidebar module accordion + module-filtered library deep link ----
        header = page.locator(".nav-module-header:has-text('Pest Control')")
        check("Sidebar has a collapsible Pest Control module header", header.count() == 1)
        check("Sidebar has a CAPA module with Internal and External links", page.locator("a:has-text('Internal — Inspection Findings')").count() == 1 and page.locator("a:has-text('External — Customer Complaints')").count() == 1)
        check("Pest Control module starts expanded (Training link visible)", page.locator("a:has-text('Training Records')").count() == 1)
        header.click()
        page.wait_for_timeout(150)
        check("Collapsing the module header hides its links", page.locator("a:has-text('Training Records')").count() == 0)
        page.click("a:has-text('Internal — Inspection Findings')")
        page.wait_for_timeout(200)
        check("A collapsed module stays collapsed after navigating elsewhere", page.locator("a:has-text('Training Records')").count() == 0)
        header.click()
        page.wait_for_timeout(150)
        check("Expanding it again restores the links", page.locator("a:has-text('Training Records')").count() == 1)

        page.click("a:has-text('Lamination QC Documents')")
        page.wait_for_timeout(300)
        check("Module link deep-links Document Library filtered to that module", "#/library/lamination-quality-control" in page.url)
        # Scoped to the main content area, not page.content() as a whole --
        # the sidebar itself always lists every module's name regardless of
        # which page is open, so checking the whole page would always fail.
        check("Filtered library shows only that module's documents", "Lamination — Production" not in page.locator(".app-content").inner_text())

        # ---- 12b. A fixed-parameter inspection record (F/QC/37), prepared by the assistant ----
        page.click("text=Record Calendar")
        page.wait_for_timeout(200)
        page.locator(".calendar-cell.today").first.click()
        page.wait_for_timeout(300)
        rows = page.locator(".doc-table tbody tr")
        opened_insp = False
        for i in range(rows.count()):
            if "Pouching Process" in rows.nth(i).inner_text():
                rows.nth(i).locator("button", has_text="Open").click()
                opened_insp = True
                break
        check("Opened the F/QC/37 pouching inspection from Day View", opened_insp)
        page.wait_for_timeout(300)
        if opened_insp:
            check("Inspection shows the 11 printed test parameters", page.locator("table.log-sheet tbody tr").count() == 11)
            check("Inspection observations were pre-filled from the specimen", "Standy + Zipper" in page.content())
            check("Lot status pre-set to Accepted and inspector signed", "Accepted" in page.content() and "Inspected By" in page.content())
            page.click("button:has-text('Submit')")
            page.wait_for_timeout(300)
            check("Inspection record submitted", "Pending Verification" in page.content())

        # ---- 13. Search ----
        page.click("text=Search")
        page.wait_for_timeout(200)
        page.fill("input[placeholder*='PC-04']", "PC-01")
        page.wait_for_timeout(300)
        check("Search returns results for PC-01", page.locator(".doc-table tbody tr").count() >= 1)
        page.fill("input[placeholder*='PC-04']", "Gaurav Singh")
        page.wait_for_timeout(300)
        check("Search finds the lamination operator on the prepared log sheets", page.locator(".doc-table tbody tr").count() >= 1)

        browser.close()

        print("\n--- Console errors captured during run ---")
        for e in console_errors[:20]:
            print(" ", e)

        if FAILURES:
            print(f"\n{len(FAILURES)} CHECK(S) FAILED:")
            for f in FAILURES:
                print(" -", f)
            sys.exit(1)
        else:
            print("\nAll checks passed.")


if __name__ == "__main__":
    main()
