const puppeteer = require("puppeteer");
const dfpm = require("./DFPM/dfpm.js");

let puppeteerPromise;

function getPuppet() {
    // this is my browser. there are many like it, but this one is mine.
    if (puppeteerPromise) {
        return puppeteerPromise;
    }

    puppeteerPromise = puppeteer.launch({args: ["--ignoreHTTPSErrors", "--remote-debugging-port=9222"]})
    .then((browser) => {            
        dfpm.flipTheSwitch("127.0.0.1", 9222, true, false).then(() => {    
            // allow time for it to load
            dfpm.sleep(5*1000).then(() => {});
            console.log("switch flipped");
        });

        return browser;
    });

    return puppeteerPromise;
}

module.exports = {
    getPuppet: getPuppet
}