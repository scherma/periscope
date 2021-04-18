var express = require("express");
var router = express.Router();
var manager = require("../lib/manager");
const fs = require("fs");
const logger = require("../lib/logger");
let accounts = require("../lib/accounts");
let options = require("../lib/options");

let search_role = options.get("periscope", "public_can_view") ? null : "user";
let devices_role = options.get("periscope", "public_can_view") ? null : "user";
// no index router - Vue is used

router.post("/login", function(req, res, next) {
  /*
  expected: 
  body { userid (email or username), password }
  */
  let ua = req.headers['user-agent'] || "";
  accounts.auth_user(req.body.userid, req.body.password, req.ip)
  .then((success) => {
    req.session.user = {
      user_id: success.account.user_id,
      username: success.account.username,
      roles: success.account.roles
    }

    logger.debug(null, {message: "session set", action: "/login", data: req.session.user, src_ip: req.ip, ua: ua});

    logger.info(null, {
      message: "login success", 
      action: "/login", 
      id: req.body.useridstr, 
      user_id: req.session.user.user_id,
      username: req.session.user.username,
      src_ip: req.ip, 
      ua: ua, 
      result: "success"
    });
    res.send({message: success.message})
  }).catch((failure) => {
    if (failure.reason && failure.reason == "must_change_password") {
      logger.info(null, {message: "User must change password - a token was issued", action: "/login", src_ip: req.ip, ua: ua})

      res.status(401);
      res.send({
        message: "must_change_password",
        email: failure.email,
        token: failure.token
      });
    } else {
      logger.error(null, {message: "login failed", action: "/login", id: req.body.useridstr, src_ip: req.ip, ua: ua, result: "fail", reason: failure.reason});
      res.status(401);
      res.send({message: failure.message});
    }
  });
});

router.all("/logout", function(req, res, next) {
  let ua = req.headers['user-agent'] || "";
  if (req.session.user && req.cookies.user_sid) {
    logger.info(null, {
      message: "logout", 
      action: "/logout", 
      user_id: req.session.user.user_id, 
      username: req.session.user.username,
      src_ip: req.ip,
      ua: ua
    });
    res.clearCookie('user_sid');
    res.send({message: "ok"});
  } else {
    res.sendStatus(400);
  }
});

router.get("/self", function (req, res, next) {
  if (req.session.user && req.cookies.user_sid) {
    res.send({
      user: req.session.user.username, 
      roles: req.session.user.roles, 
      createUserAvailable: options.get("periscope", "public_signup_allowed"),
      permissions: {
        can_view: true,
        can_submit: true,
        create_user: options.get("periscope", "public_signup_allowed")
      }
    });
  } else {
    res.send({
      createUserAvailable: options.get("periscope", "public_signup_allowed"),
      permissions: {
        can_view: options.get("periscope", "public_can_view"),
        can_submit: options.get("periscope", "public_can_submit"),
        create_user: options.get("periscope", "public_signup_allowed")
      }
    });
  }
});

router.get("/deviceoptions", accounts.require_auth(devices_role), function(req, res, next) {
  /*
  expected:
  none
  optional:
  query { devname }
  */
  try {
    if (typeof(req.query.devname) == "undefined" || req.query.devname == "") {
      let opts = manager.DeviceOptions();
      res.send(opts);
    } else {
      let settings = manager.DeviceSettings(req.query.devname);
      res.send(settings);
    }
  } catch (err) {
    res.status(400);
    res.send({message: err.message});
  }
});

router.get("/search", accounts.require_auth(search_role), function (req, res, next) {
  /*
  expected:
  query { q }
  optional:
  query { page, pagesize }
  */
  let page = typeof(parseInt(req.query.page)) == "number" ? parseInt(req.query.page) : 1;
  let pagesize = typeof(parseInt(req.query.pagesize)) == "number" ? parseInt(req.query.pagesize) : 20;
  manager.RequestSearch(req.query.q, req.session.user, perPage=pagesize, currentPage=page)
  .then((results) => {
    res.send(results);
  })
  .catch((err) => {
    logger.error(null, {message: err.message, action: "search"});
    res.status(400);
    res.send(err);
  });
});

router.all("/makecoffee", function (req, res, next) {
  /*
  expected:
  tea
  */
  res.status(418);
  res.send({message: "invalid beverage specified", height: "short", width: "stout"});
});

module.exports = router;
