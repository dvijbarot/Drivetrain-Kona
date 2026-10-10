"""Photo exterior, cutaway registration, local-photo privacy and responsive QA.
Run against a production preview with KONA_TEST_URL. Public builds additionally
assert that no manufacturer image requests occur. Uses the installed Chromium.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('KONA_TEST_URL', 'http://127.0.0.1:4173/')
OUT = Path('/tmp/kona-qa'); OUT.mkdir(exist_ok=True)
PUBLIC = os.environ.get('KONA_PUBLIC_TEST') == '1'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width':1600,'height':1100})
    errors, requests = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    page.goto(BASE, wait_until='networkidle')
    def pause():
        button = page.get_by_role('button', name='Pause animation', exact=True)
        if button.is_visible(): button.click(force=True)
    def image_ready():
        page.locator('.exterior-photo').evaluate('(el)=>el.decode()')
    def body(mode):
        page.get_by_role('button', name='Body '+mode, exact=True).click(force=True)
    pause(); image_ready()
    assert page.locator('.photo-exterior').get_attribute('data-source') == ('commons' if PUBLIC else 'hyundai')
    assert page.locator('.photo-exterior').is_visible()
    page.screenshot(path=str(OUT/('photo-public-desktop.png' if PUBLIC else 'photo-exterior-desktop.png')))
    if not PUBLIC:
        initial = page.locator('.exterior-photo').get_attribute('src')
        page.get_by_role('button', name='Next exterior angle', exact=True).click()
        assert page.locator('.exterior-photo').get_attribute('src') != initial
        page.get_by_label('Exterior angle', exact=True).select_option('28'); image_ready()
        assert '-028?' in page.locator('.exterior-photo').get_attribute('src')
        page.get_by_label('Exterior angle', exact=True).select_option('7'); image_ready()
        stage = page.locator('.photo-stage'); rect = stage.bounding_box()
        x,y=rect['x']+rect['width']/2,rect['y']+rect['height']/2
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+70,y,steps=5);page.mouse.up()
        assert '-007?' not in page.locator('.exterior-photo').get_attribute('src')
        stage.focus(); before=page.locator('.exterior-photo').get_attribute('src');page.keyboard.press('ArrowRight')
        assert page.locator('.exterior-photo').get_attribute('src') != before
    print('Exterior image and navigation checked', flush=True)

    body('ghost'); image_ready()
    if not PUBLIC:
        page.wait_for_function("document.querySelector('canvas').dataset.cameraSettled==='true' && document.querySelector('.registered-photo')?.dataset.registered==='true'", timeout=60000)
        # Matrix-based registration must produce a sensible, finite onscreen size.
        geometry=page.locator('.registered-photo').evaluate('(el)=>({width:parseFloat(el.style.width),left:parseFloat(el.style.left),top:parseFloat(el.style.top)})')
        assert 150 < geometry['width'] < 1600, geometry
        opacity=page.get_by_label('Photo shell visibility', exact=True)
        opacity.focus(); old=int(opacity.input_value());page.keyboard.press('ArrowRight')
        assert int(opacity.input_value()) == old+1
    else:
        assert page.locator('.photo-reference-only').is_visible()
    page.wait_for_timeout(1000)
    page.screenshot(path=str(OUT/('photo-public-cutaway.png' if PUBLIC else 'photo-xray-desktop.png')))
    body('hidden');assert not page.locator('.photo-exterior').is_visible()
    assert page.locator('canvas').is_visible()
    print('Cutaway, registration and free 3D view checked', flush=True)

    # A selected personal photograph stays local and survives assembly navigation.
    body('solid')
    page.get_by_label('Vehicle photo file', exact=True).set_input_files(Path(__file__).resolve().parents[1]/'public/photos/kona-sx2-reference.jpg')
    image_ready()
    assert page.locator('.photo-exterior').get_attribute('data-source') == 'personal'
    assert page.locator('.exterior-photo').get_attribute('src').startswith('blob:')
    page.get_by_role('button', name='Converter', exact=True).click(force=True);pause()
    assert not page.locator('.photo-exterior').is_visible()
    assert page.locator('.part-heading h2').inner_text() == 'Torque converter'
    page.get_by_role('button', name='01 Full drivetrain', exact=True).click(force=True);pause()
    body('solid');image_ready()
    assert page.locator('.photo-exterior').get_attribute('data-source') == 'personal'
    page.get_by_role('button', name='Restore reference photo', exact=True).click();image_ready()
    page.locator('.component-row').filter(has_text='Kona exterior reference').click(force=True)
    page.get_by_role('button',name='Isolate',exact=True).click(force=True)
    assert page.locator('.photo-exterior').is_visible(), 'Exterior isolation must retain the photo'
    page.get_by_role('button',name='Hide',exact=True).click(force=True)
    assert not page.locator('.photo-exterior').is_visible()
    page.get_by_role('button',name='Show',exact=True).click(force=True)
    assert page.locator('.photo-exterior').is_visible()
    page.get_by_role('button',name='Show all',exact=True).click(force=True)
    page.locator('.photo-inspect').get_by_role('button',name='IVT',exact=True).click(force=True)
    assert page.locator('.part-heading h2').inner_text() == 'Primary / input pulley'
    assert not page.locator('.photo-exterior').is_visible()
    page.get_by_role('button',name='01 Full drivetrain',exact=True).click(force=True);pause()
    print('Local photo privacy, isolation and component inspection checked', flush=True)

    for width,height,name in [(834,1112,'ipad'),(390,844,'phone')]:
        page.set_viewport_size({'width':width,'height':height})
        body('solid');image_ready()
        page.screenshot(path=str(OUT/('photo-'+('public-' if PUBLIC else '')+name+'.png')),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), name+' horizontal overflow'
        assert page.get_by_role('button',name='Reveal drivetrain',exact=True).is_visible()
        page.get_by_role('button',name='Reveal drivetrain',exact=True).click(force=True)
        assert page.get_by_role('button',name='Body ghost',exact=True).get_attribute('class')=='active'
    print('iPad and phone layouts checked', flush=True)
    page.set_viewport_size({'width':1600,'height':1100})
    page.get_by_label('Reveal engine bay',exact=True).check(force=True)
    page.wait_for_function("document.querySelector('canvas').dataset.cameraPreset==='Engine bay' && document.querySelector('canvas').dataset.cameraSettled==='true'",timeout=60000)
    assert not page.locator('.photo-exterior').is_visible()
    assert page.locator('canvas').is_visible()
    assert not any('/kona-sx2-body' in url for url in requests), 'Legacy body must not be rendered or loaded'
    if PUBLIC: assert not any('s7d1.scene7.com' in url for url in requests), 'Public build requested OEM artwork'
    assert not errors, errors
    browser.close()
    (OUT/('photo-public-results.json' if PUBLIC else 'photo-results.json')).write_text(json.dumps({'status':'passed','runtime_errors':errors,'public':PUBLIC,'viewports':['desktop','ipad','phone'],'legacy_body_loaded':False,'checks':['photo navigation','cutaway registration','local photo','assembly inspection','responsive controls','engine bay']},indent=2))
    print('PASS — photo exterior and mechanical integration',flush=True)
