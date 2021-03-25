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
  if (loglevel >= CURRENTLOGLEVEL) {
    let ts = moment().format("YYYY-MM-DD HH:mm:ss.SSSZ");
    message.level = LOGLEVELNAMES[loglevel];
  
    // format the message
    let msgobject = {time: ts, ...message};
    let message_str = JSON.stringify(msgobject);

    // print to console
    if (loglevel >= LOGLEVELS.ERROR) {
      console.error(message_str);
    } else {
      console.log(message_str);
    }

    // only write if logfile is not null
    if (logfile) {
      fs.appendFile(logfile, message_str + "\n", function (e) {
      });
    }
    fs.appendFile(BASELOG, message_str + "\n", function (e) {
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