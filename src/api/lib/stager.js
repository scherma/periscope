const puppeteer = require("puppeteer");
const dfpm = require("./DFPM/dfpm.js");
const logger = require("./logger");

let puppeteerPromise;

function getPuppet() {
    // this is my browser. there are many like it, but this one is mine.
    if (puppeteerPromise) {
        logger.debug(null, "Puppeteer exists, providing.");
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
        logger.debug(null, "Spinning up DFPM");
        dfpm.flipTheSwitch("127.0.0.1", 9222, true, false).then(() => {
            // allow time for it to load
            dfpm.sleep(5*1000).then(() => {});
           
            logger.debug(null, "DFPM: We get signal.");
        });

        return browser;
    });

    return puppeteerPromise;
}

module.exports = {
    getPuppet: getPuppet
}