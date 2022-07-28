// https://stackoverflow.com/a/61511955
function waitForElm(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// wait until "Verify" button exists; when this happens,
// #passcode-input <input> field should already exist already
Promise.any([
  // account for the (seemingly) two different Duo UIs
  waitForElm('.verify-button'),
  waitForElm('#password')
]).then((b) => {
  // input element for code
  const inputElem = document.querySelector('.passcode-input');

  // procure HOTP code
  chrome.storage.local.get(['secret', 'count'], (res) => {
    if (!res.secret) {
      // account not set up yet
      return;
    }

    const hotp = new jsOTP.hotp();
    const code = hotp.getOtp(res.secret, res.count);
    chrome.storage.local.set({ 'count': res.count + 1 }, () => {});

    // insert the HOTP code
    inputElem.value = code;

    // important - you can look in the DOM for the [event] tag next to certain
    // HTML tags, expand that and see what events should be triggered. in this
    // case, for example, the event is needed to un-disable the "Verify" button
    // which begins greyed out
    inputElem.dispatchEvent(new Event('input', { bubbles: true }));

    // click "Verify" (sign in!)
    b.click();
  });

  // click "Verify"
})