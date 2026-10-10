"""Focused visual QA for the installed vehicle and detailed graphics revision.
Run after the production build, with KONA_TEST_URL pointing to its preview."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("KONA_TEST_URL", "http://127.0.0.1:4173/")
OUT = Path("/tmp/kona-qa")
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"])
    page = browser.new_page(viewport={"width":1440,"height":1000})
    errors, missing = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("response", lambda r: missing.append(r.url) if r.status >= 400 else None)
    page.goto(BASE, wait_until="networkidle")
    page.get_by_role("button",name="Pause animation",exact=True).click(force=True)
    page.locator(".asset-loading").wait_for(state="hidden",timeout=60000)
    page.get_by_role("button",name="Explore",exact=True).click(force=True)
    page.get_by_role("button",name="Pause animation",exact=True).click(force=True)

    for mode in ["hidden","ghost","solid"]:
        button=page.get_by_role("button",name="Body "+mode,exact=True)
        button.click(force=True)
        assert "active" in button.get_attribute("class")
    page.get_by_label("Chassis",exact=True).uncheck(force=True)
    page.get_by_label("Chassis",exact=True).check(force=True)
    page.get_by_label("Floor pan",exact=True).check(force=True)
    page.get_by_label("Floor pan",exact=True).uncheck(force=True)
    page.get_by_label("Reveal engine bay",exact=True).check(force=True)
    print("Vehicle layers and hood controls checked",flush=True)

    page.get_by_role("button",name="Settings",exact=True).click(force=True)
    page.get_by_label("Graphics quality",exact=True).select_option("High")
    page.get_by_role("button",name="Close dialog",exact=True).click(force=True)
    page.wait_for_timeout(300)
    page.locator(".asset-loading").wait_for(state="hidden",timeout=60000)

    def camera(preset):
        page.get_by_label("Camera preset",exact=True).select_option(preset)
        page.locator(f'canvas[data-camera-preset="{preset}"][data-camera-settled="true"]').wait_for(timeout=60000)
        page.wait_for_timeout(1200)

    for preset,filename in [("Wheel detail","wheel-high"),("Underside","underbody-high"),("Engine bay","enginebay-high")]:
        camera(preset)
        page.screenshot(path=str(OUT/(filename+".png")))
        assert page.get_by_label("Reveal engine bay",exact=True).is_checked()
        print("High graphics: "+preset,flush=True)

    camera("Wheel detail")
    page.locator(".component-row").filter(has_text="Primary / input pulley").click(force=True)
    assert page.get_by_label("Camera preset",exact=True).input_value()=="Perspective"
    assert page.get_by_role("button",name="04 IVT",exact=True).get_attribute("class")=="active"
    page.get_by_role("button",name="Simulator",exact=True).click(force=True)
    page.get_by_role("button",name="Red light",exact=True).click(force=True)
    page.get_by_role("button",name="Pause animation",exact=True).click(force=True)
    assert page.get_by_label("Camera preset",exact=True).input_value()=="Perspective"
    assert not errors, errors
    assert not missing, missing
    browser.close()
    (OUT/"vehicle-results.json").write_text(json.dumps({"status":"passed","runtime_errors":errors,"missing_assets":missing,"graphics":"High","cameras":["Wheel detail","Underside","Engine bay"]},indent=2))
    print("PASS — vehicle views and graphics",flush=True)
