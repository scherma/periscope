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

const LOGLEVELNAMES = {
  1: "DEBUG",
  2: "INFO",
  3: "WARN",
  4: "ERROR",
  5: "FATAL"
};

const BASELOG = "/usr/local/unsafehex/periscope/data/logs/core.log";
  
let CURRENTLOGLEVEL = options.loglevel ? options.loglevel : LOGLEVELS.INFO;

let LogMessage = async function(logfile, message, loglevel) {
  // only write if logfile is not null
  if (loglevel >= CURRENTLOGLEVEL) {
    if (loglevel >= LOGLEVELS.ERROR) {
      console.error(message);
    } else {
      console.log(message);
    }
    let ts = moment().format("YYYY-MM-DD HH:mm:ss");
    message = `${ts} - ${LOGLEVELNAMES[loglevel]} - ${message}`;
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
  debug: async function(logfile, message) {
    LogMessage(logfile, message, LOGLEVELS.DEBUG);
  },
  info: async function(logfile, message) {
    LogMessage(logfile, message, LOGLEVELS.INFO);
  },
  warn: async function(logfile, message) {
    LogMessage(logfile, message, LOGLEVELS.WARN);
  },
  error: async function(logfile, message) {
    LogMessage(logfile, message, LOGLEVELS.ERROR);
  },
  fatal: async function(logfile, message) {
    LogMessage(logfile, message, LOGLEVELS.FATAL);
  },
  LOGLEVELS: LOGLEVELS,
  LOGLEVELNAMES: LOGLEVELNAMES
}