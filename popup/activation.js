window.onload = () => {
  const button = document.querySelector('button');
  const input = document.querySelector('input');
  input.setAttribute('size',input.getAttribute('placeholder').length);
  const msgArea = document.querySelector('#msg');

  const setMsg = (msgType, msg) => {
    msgArea.classList.remove('msg-area-info', 'msg-area-error', 'msg-area-success');
    msgArea.classList.add({
      'info': 'msg-area-info',
      'error': 'msg-area-error',
      'success': 'msg-area-success',
    }[msgType]);
    msgArea.innerText = msg;
  };

  chrome.storage.local.get(['secret', 'count'], (res) => {
    if (res.secret && res.count) {
      // if SECRET and COUNT already exist in localstorage,
      // we've already activated the device, so don't show
      // the instructions/input box again
      setMsg('info', 'AutofillDuo is already setup!. To uninstall: first uninstall this extension, then remove the Duo device labeled "Pixel 3a" in your device management page.');
      return;
    } else {
      // show instructions
      document.querySelector('#pre-activation').style.display = 'block';
    }

    button.addEventListener('click', (e) => {
      // utilize the not-public API to reverse-engineer the
      // process of activating a new device
      const link = input.value
      const matchesFormat = link.match(new RegExp("^https://m-(?<hostcode>\\w+).duosecurity.com/activate/(?<key>\\w+)$"));
      if (matchesFormat === null) {
        setMsg('error', "wrong format... check the format again :]")
        return;
      }
      const hostcode = matchesFormat.groups.hostcode;
      const key = matchesFormat.groups.key;

      const postUrl = `https://api-${hostcode}.duosecurity.com/push/v2/activation/${key}?customer_protocol=1`

      setMsg('info', "working on it... (don't click away)")
      fetch(postUrl, {
        method: 'POST',
        headers:{
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'jailbroken': 'false',
          'architecture': 'arm64',
          'region': 'US',
          'app_id': 'com.duosecurity.duomobile',
          'full_disk_encryption': 'true',
          'passcode_status': 'true',
          'platform': 'Android',
          'app_version': '3.49.0',
          'app_build_number': '323001',
          'version': '11',
          'manufacturer': 'unknown',
          'language': 'en',
          'model': 'Pixel 3a',
          'security_patch_level': '2021-02-01'
        })
      })
        .then((resp) => resp.json())
        .then((data) => {
          setMsg('success', "the deed is done, finish activation on Duo")
          const hotpSecret = data['response']['hotp_secret'];

          // populate localStorage
          // TODO check for firefox compatibility
          chrome.storage.local.set({ secret: hotpSecret, count: 0 }, () => {});

        }).catch((e) => {
          setMsg('error', e)
        });
    });
  });


}
