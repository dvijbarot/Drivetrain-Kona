"""Browser regression for the photo exterior, view restoration and RPM guide."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('KONA_TEST_URL','http://127.0.0.1:4175/Drivetrain-Kona/')
OUT=Path('/tmp/kona-qa');OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
        args=['--ignore-certificate-errors','--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];failed=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('requestfailed',lambda r:failed.append(r.url))
    page.on('request',lambda r:requests.append(r.url))
    page.goto(BASE,wait_until='networkidle')
    page.locator('.asset-loading').wait_for(state='hidden',timeout=60000)
    page.wait_for_function("document.querySelector('canvas')?.dataset.cameraSettled==='true'",timeout=60000)
    pause=page.get_by_role('button',name='Pause animation',exact=True)
    if pause.is_visible():pause.click()
    assert page.get_by_role('button',name='Body solid',exact=True).get_attribute('class')=='active'
    assert page.get_by_role('button',name='Exterior',exact=True).get_attribute('class')=='active'
    assert any('s7d1.scene7.com' in url for url in requests)
    assert page.locator('.photo-exterior').is_visible()
    assert page.locator('.photo-exterior').get_attribute('data-source') == 'hyundai'
    page.screenshot(path=str(OUT/'shell-solid.png'))

    stage=page.locator('.photo-stage');box=stage.bounding_box()
    before=page.locator('.exterior-photo').get_attribute('src')
    page.mouse.move(box['x']+box['width']*.55,box['y']+box['height']*.55)
    page.mouse.down();page.mouse.move(box['x']+box['width']*.70,box['y']+box['height']*.55,steps=10);page.mouse.up()
    assert page.locator('.exterior-photo').get_attribute('src') != before
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT/'shell-orbited.png'))

    page.get_by_role('button',name='Body ghost',exact=True).click()
    assert page.get_by_role('button',name='Transparent',exact=True).is_visible()
    assert page.get_by_role('button',name='Body ghost',exact=True).get_attribute('class')=='active'
    page.screenshot(path=str(OUT/'shell-xray.png'))
    page.get_by_role('button',name='04 IVT',exact=True).click()
    page.get_by_role('button',name='01 Full drivetrain',exact=True).click()
    page.wait_for_function("document.querySelector('canvas')?.dataset.cameraSettled==='true'",timeout=60000)
    assert page.get_by_role('button',name='Body solid',exact=True).get_attribute('class')=='active'
    assert page.get_by_role('button',name='Exterior',exact=True).get_attribute('class')=='active'

    page.get_by_role('button',name='Simulator',exact=True).click()
    page.get_by_role('button',name='Cruise',exact=True).click()
    guide=page.locator('.rpm-coach')
    page.wait_for_function("document.querySelector('.rpm-coach')?.textContent.includes('Highway cruise')")
    assert 'Highway cruise' in guide.inner_text()
    page.get_by_role('button',name='Hard launch',exact=True).click()
    page.wait_for_function("document.querySelector('.rpm-coach')?.textContent.includes('Strong acceleration')")
    assert 'Strong acceleration' in guide.inner_text()
    page.get_by_role('button',name='Red light',exact=True).click()
    page.wait_for_function("document.querySelector('.rpm-coach')?.textContent.includes('Stopped in Drive')")
    assert 'Stopped in Drive' in guide.inner_text()
    page.screenshot(path=str(OUT/'rpm-guide.png'),full_page=True)

    assert not errors,errors
    # Adjacent spin frames are intentionally cancelled when the view advances.
    unexpected_failed=[url for url in failed if 's7d1.scene7.com/is/image/hyundai/' not in url]
    assert not unexpected_failed,unexpected_failed
    browser.close()
    result={'status':'passed','runtime_errors':errors,'failed_requests':failed,
            'checks':['Hyundai photo sequence','photo rotation','x-ray overlay','exterior restoration','live RPM guidance']}
    (OUT/'shell-guidance-results.json').write_text(json.dumps(result,indent=2))
    print('PASS — photo exterior, view restoration and RPM guidance',flush=True)
