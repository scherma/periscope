const puppeteer = require("puppeteer");
const dfpm = require("./DFPM/dfpm.js");
const logger = require("./logger");

let puppeteerPromise;

function getPuppet() {
    // this is my browser. there are many like it, but this one is mine.
    if (puppeteerPromise) {
        logger.debug(null, {message: "Puppeteer exists, providing.", action: "getPuppet"});
        return puppeteerPromise;
    }


    puppeteerPromise = puppeteer.launch(
        {
            args: [
                "--ignoreHTTPSErrors", 
                "--ignore-certificate-errors", 
                "--remote-debugging-port=9222",
                "--proxy-server='direct://'",
                "--proxy-bypass-list=*"
            ]
        }
    )
    .then((browser) => {
        logger.debug(null, {message: "Spinning up DFPM", action: "getPuppet"});
        dfpm.flipTheSwitch("127.0.0.1", 9222, true, false).then(() => {
            // allow time for it to load
            dfpm.sleep(5*1000).then(() => {});
           
            logger.debug(null, {message: "DFPM: We get signal.", action: "getPuppet"});
        });

        return browser;
    });

    return puppeteerPromise;
}

module.exports = {
    getPuppet: getPuppet
}