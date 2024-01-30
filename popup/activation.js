window.onload = () => {
  const button = document.querySelector('button');
  const input = document.querySelector('input');
  input.setAttribute('size', input.getAttribute('placeholder').length);
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

    button.addEventListener('click', async (e) => {
      // utilize the not-public API to reverse-engineer the
      // process of activating a new device
      const link = input.value
      const matchesFormat = link.match(new RegExp("^https://m-(?<hostcode>\\w+).duosecurity.com/(activate|android)/(?<key>\\w+)$"));
      if (matchesFormat === null) {
        setMsg('error', "wrong format... check the format again :]")
        return;
      }
      const hostcode = matchesFormat.groups.hostcode;
      const key = matchesFormat.groups.key;

      // ref: https://stackoverflow.com/a/55188241
      const getPublicKey = async () => {
        const options = {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: { name: 'SHA-512' },
        };

        const keys = await window.crypto.subtle.generateKey(
          options,
          false, // non-exportable (public key still exportable)
          ['sign', 'verify'],
        );

        const publicKey = await window.crypto.subtle.exportKey('spki', keys.publicKey);

        let body = window.btoa(String.fromCharCode(...new Uint8Array(publicKey)));
        body = body.match(/.{1,64}/g).join('\n');

        return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
      };

      const postUrl = `https://api-${hostcode}.duosecurity.com/push/v2/activation/${key}?customer_protocol=1`

      setMsg('info', "working on it... (don't click away)")
      const resp = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'pkpush': 'rsa-sha512',
          'pubkey': await getPublicKey(),
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

      if (!resp.ok) {
        alert(JSON.stringify(data));
        setMsg('error', e);
        return;
      }

      const data = await resp.json();
      alert(JSON.stringify(data))
      setMsg('success', "the deed is done, finish activation on Duo")
      const hotpSecret = data['response']['hotp_secret'];

      // populate localStorage
      chrome.storage.local.set({ secret: hotpSecret, count: 0 }, () => { });
    });
  });
}
