var options = require("./options");
const moment = require("moment");
const fs = require("fs");

const LOGLEVELS = {
  FATAL: 5,
  ERROR: 4,
  WARN: 3,
  INFO: 2,
  DEBUG: 1
};

const BASELOG = "/usr/local/unsafehex/periscope/data/logs/core.log";
  
let CURRENTLOGLEVEL = options.loglevel ? options.loglevel : LOGLEVELS.ERROR;

let LogMessage = async function(logfile, message, loglevel) {
  // only write if logfile is not null
  if (logfile && loglevel >= CURRENTLOGLEVEL) {
    if (loglevel >= LOGLEVELS.ERROR) {
      console.error(message);
    }
    let ts = moment().format("YYYY-MM-DD HH:mm:ss");
    message = `${ts} - ${message}`;
    if (logfile) {
      fs.appendFile(logfile, message + "\n", function (e) {
      });
    }
    fs.appendFile(BASELOG, message + "\n", function (e) {
    });
  }
}

module.exports = {
  LogMessage: LogMessage,
  LOGLEVELS: LOGLEVELS
}