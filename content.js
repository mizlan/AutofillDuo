// a function that generates a Promise given a CSS selector
// that fulfills when the selector points to an existing element
//
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

// wait until a button exists; this is either the "Verify"
// button on the Universal Prompt, or the "Enter a passcode"
// button on the Traditional Prompt. for more information, see:
// https://help.duo.com/s/article/7118?language=en_US
Promise.any([
  // * Universal Prompt
  waitForElm('.verify-button'),

  // * Traditional Prompt
  waitForElm('#passcode')
]).then((button) => {

  // if Traditional Prompt, must click the button first:
  // it says "Enter a passcode" and then we can access input box
  //
  // NOTE: it seems this isn't actually necessary, the input element
  // exists, it's just hidden prior to clicking this button
  if (button.id == 'passcode') {
    button.click();
  }

  // the input element for the passcode happens to have share the same
  // classname for both Traditional/Universal prompts: 'passcode-input'
  waitForElm('.passcode-input').then((inputElem) => {
    plugInfo(inputElem, button);
  });
})

// given HTML elements for the input box and the verification button,
// generate a passcode, type it in, and click the button to gain access
// fails silently, in the case when the program has not been set up yet
function plugInfo(input, button) {

  // procure HOTP code
  chrome.storage.local.get(['secret', 'count'], (res) => {

    if (!res.secret) {
      // account not set up yet, so don't autofill anything
      return;
    }

    // generate code and update COUNT for future generations
    const hotp = new jsOTP.hotp();
    const code = hotp.getOtp(res.secret, res.count);
    chrome.storage.local.set({ 'count': res.count + 1 }, () => {});

    // insert the HOTP code
    input.value = code;

    // important - you can look in the DOM for the [event] tag next to certain
    // HTML tags, expand that and see what events should be triggered. in this
    // case, for example, the event is needed to un-disable the "Verify" button
    // which begins greyed out
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // click "Verify" (sign in!)
    button.click();
  });
}
