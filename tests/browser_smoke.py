"""Behavioral browser checks. Run against npm run dev or a private static server.
Requires the execution environment's Python Playwright and Chromium."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("KONA_TEST_URL", "http://127.0.0.1:5173/")
OUT = Path("/tmp/kona-qa")
OUT.mkdir(exist_ok=True)

def set_range(page, name, value):
    page.get_by_role("slider", name=name, exact=True).evaluate(
        """(el,value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }""", str(value))

def check(condition, message):
    if not condition:
        raise AssertionError(message)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"])
    page = browser.new_page(viewport={"width":1440,"height":1000})
    errors, failed_requests = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("requestfailed", lambda r: failed_requests.append(r.url))
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.locator(".asset-loading").wait_for(state="hidden",timeout=60000)
    check(page.locator("canvas").count()==1, "3D canvas starts")
    page.screenshot(path=str(OUT/"desktop.png"))
    print("Desktop 3D started", flush=True)

    # Keep software-WebGL interaction checks responsive; visual captures cover High.
    page.get_by_role("button",name="Settings",exact=True).click()
    page.get_by_label("Graphics quality",exact=True).select_option("Low")
    page.get_by_role("button",name="Close dialog",exact=True).click()
    page.locator(".asset-loading").wait_for(state="hidden",timeout=60000)

    for chapter in range(30):
        page.get_by_role("button",name="Chapters",exact=True).click()
        page.locator(".chapter").nth(chapter).click(force=True)
        page.get_by_role("button",name="Pause animation",exact=True).click(force=True)
        page.wait_for_timeout(100)
        check(page.locator(".chapter.active").count()==1, "One active lesson")
        check(page.locator(".lesson-text p").inner_text().strip(), "Lesson has narration")
    set_range(page,"Animation timeline",29.9)
    page.get_by_role("button",name="Next frame",exact=True).click()
    check(page.locator(".time-label").inner_text().startswith("29.9"),"Frame stepping works")
    page.get_by_role("button",name="Replay",exact=True).click()
    print("All 30 chapters and timeline checked", flush=True)

    def inspect_text(selector):
        page.get_by_role("button",name="Inspect",exact=True).click()
        text = page.locator(selector).inner_text()
        page.get_by_role("button",name="Close inspector",exact=True).click()
        return text

    page.get_by_role("button",name="Simulator",exact=True).click()
    page.get_by_role("button",name="Red light",exact=True).click()
    check("0" in page.locator(".instruments>div").nth(1).inner_text(),"Turbine stalls at red light")
    check("Stall / launch" in inspect_text(".state-card"),"Stall explanation shown")
    page.get_by_role("button",name="Cruise",exact=True).click()
    check("Lock-up engaged" in inspect_text(".state-card"),"Cruise locks converter")
    page.get_by_role("button",name="Front slip",exact=True).click()
    check("Elevated" in inspect_text(".awd-card"),"Low grip raises rear demand")
    page.get_by_role("button",name="Cornering",exact=True).click()
    page.locator(".bench-details summary").click()
    check("Front L / R:" in page.locator(".bench-details").inner_text(),"Wheel readouts available")
    set_range(page,"Throttle",80)
    set_range(page,"Brake",30)
    set_range(page,"Road speed",60)
    set_range(page,"Steering",-50)
    set_range(page,"Pulley ratio",1.2)
    check("1.20" in page.locator(".instruments>div").nth(3).inner_text(),"Ratio slider updates live model")
    page.get_by_label("Manual + / −",exact=True).check()
    page.get_by_role("button",name="Request higher virtual ratio",exact=True).click()
    check("M" in page.locator(".manual-steps").inner_text(),"Manual virtual ratio request works")
    page.get_by_role("button",name="P",exact=True).click()
    check("Range disconnected" in inspect_text(".state-card"),"Park disconnects powered path")
    page.get_by_role("button",name="N",exact=True).click()
    check("Range disconnected" in inspect_text(".state-card"),"Neutral disconnects powered path")
    page.get_by_role("button",name="Reverse",exact=True).click()
    check(page.locator(".gear-selector button.active").inner_text()=="R","Reverse scenario sets range")
    print("Simulator scenarios, inputs and manual control checked", flush=True)

    page.get_by_role("button",name="Explore",exact=True).click()
    page.get_by_role("button",name="Pause animation",exact=True).click()
    for focus in ["02 Engine","03 Torque converter","04 IVT","05 HTRAC AWD"]:
        page.get_by_role("button",name=focus,exact=True).click()
        for view in ["Exterior","Transparent","Exploded","Cutaway"]:
            page.get_by_role("button",name=view,exact=True).click()
            page.wait_for_timeout(120)
    page.get_by_role("button",name="03 Torque converter",exact=True).click()
    page.get_by_role("button",name="Fluid flow",exact=True).click()
    page.wait_for_timeout(1400)
    page.screenshot(path=str(OUT/"fluid.png"))
    page.get_by_role("button",name="Exploded",exact=True).click()
    page.wait_for_timeout(1400)
    page.screenshot(path=str(OUT/"exploded.png"))
    page.get_by_role("button",name="Components",exact=True).click()
    page.locator(".component-row").filter(has_text="Turbine").click()
    page.get_by_role("button",name="Technical",exact=True).click()
    check("speed ratio" in page.locator(".part-explanation").inner_text().lower(),"Technical explanation works")
    page.get_by_role("button",name="Isolate",exact=True).click()
    check(page.locator(".isolate-banner").is_visible(),"Isolation is visibly indicated")
    page.get_by_role("button",name="Hide",exact=True).click()
    page.get_by_role("button",name="Show",exact=True).click()
    page.locator(".inspector").get_by_role("button",name="Restore assembly",exact=True).click()
    page.get_by_role("button",name="Close inspector",exact=True).click()
    page.get_by_role("button",name="Reset camera",exact=True).click()
    page.get_by_role("button",name="Toggle component labels",exact=True).click()
    page.get_by_role("button",name="Toggle component labels",exact=True).click()
    page.get_by_role("button",name="Choose camera angle",exact=True).click()
    page.get_by_role("button",name="Component visibility",exact=True).click()
    page.get_by_role("textbox",name="Search components",exact=True).fill("stator")
    check(page.locator(".visibility-list>div").count()==1,"Visibility search works")
    page.get_by_role("button",name="Close dialog",exact=True).click()
    print("Views, inspection, isolation, restore and camera checked", flush=True)

    page.get_by_role("button",name="Compare",exact=True).click()
    check(page.locator(".compare-card").count()==3,"Three comparison mechanisms")
    page.get_by_role("button",name="Sources and model accuracy",exact=True).click()
    check(page.locator(".source-list>a").count()>=7,"Primary source links available")
    page.get_by_role("button",name="Close dialog",exact=True).click()
    page.get_by_role("button",name="Settings",exact=True).click()
    page.get_by_role("combobox",name="Graphics quality",exact=True).select_option("Low")
    page.get_by_role("button",name="Close dialog",exact=True).click()
    page.get_by_role("button",name="Power flow",exact=True).click()
    page.get_by_role("combobox",name="Animation speed",exact=True).select_option("0.05")
    set_range(page,"Animation timeline",15)
    page.screenshot(path=str(OUT/"power.png"))
    check(not errors, f"No runtime errors: {errors[:5]}")
    check(not failed_requests, f"No missing runtime assets: {failed_requests}")
    print("Sources, settings, comparison and slow power flow checked", flush=True)

    for name,width,height in [("ipad",834,1112),("phone",390,844)]:
        mobile=browser.new_page(viewport={"width":width,"height":height},has_touch=True,is_mobile=True)
        mobile.on("pageerror",lambda e:errors.append(str(e)))
        mobile.goto(BASE,wait_until="networkidle");mobile.wait_for_timeout(1200)
        check(mobile.evaluate("document.body.scrollWidth <= window.innerWidth"),name+" has no horizontal overflow")
        check(mobile.get_by_role("button",name="Chapters",exact=True).is_visible(),name+" has lesson drawer")
        mobile.get_by_role("button",name="Chapters",exact=True).click()
        mobile.locator(".chapter").nth(3).click()
        check(not mobile.locator(".sidebar").is_visible(),name+" lesson selection closes drawer")
        mobile.get_by_role("button",name="Inspect",exact=True).click()
        check(mobile.locator(".inspector").is_visible(),name+" inspector is usable")
        mobile.get_by_role("button",name="Close inspector",exact=True).click()
        mobile.get_by_role("button",name="Simulator",exact=True).click()
        mobile.get_by_role("button",name="Cruise",exact=True).click()
        mobile.get_by_role("button",name="Inspect",exact=True).click()
        check("Lock-up engaged" in mobile.locator(".state-card").inner_text(),name+" simulator reacts")
        mobile.get_by_role("button",name="Close inspector",exact=True).click()
        mobile.screenshot(path=str(OUT/(name+".png")),full_page=True)
        print(name+" touch layout checked",flush=True)
        mobile.close()
    check(not errors,f"No runtime errors in all layouts: {errors[:5]}")
    browser.close()
    (OUT/"results.json").write_text(json.dumps({"status":"passed","runtime_errors":errors,"failed_requests":failed_requests,"viewports":["1440×1000","834×1112","390×844"],"chapters":30},indent=2))
    print("PASS — complete browser suite",flush=True)
