const puppeteer = require("puppeteer");
const dfpm = require("./DFPM/dfpm.js");
const logger = require("./logger");

let puppeteerPromise;

function getPuppet() {
    // this is my browser. there are many like it, but this one is mine.
    if (puppeteerPromise) {
        logger.LogMessage(logger.BASELOG, "Puppeteer exists, providing.", logger.LOGLEVELS.DEBUG);
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
            ], 
            dumpio: true
        }
    )
    .then((browser) => {
        logger.LogMessage(logger.BASELOG, "Spinning up DFPM", logger.LOGLEVELS.DEBUG);
        dfpm.flipTheSwitch("127.0.0.1", 9222, true, false).then(() => {    
            // allow time for it to load
            dfpm.sleep(5*1000).then(() => {});
           
            console.log("switch flipped");
            logger.LogMessage(logger.BASELOG, "DFPM: We get signal.", logger.LOGLEVELS.DEBUG);
        });

        return browser;
    });

    return puppeteerPromise;
}

module.exports = {
    getPuppet: getPuppet
}