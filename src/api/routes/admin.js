var express = require("express");
var router = express.Router();
const logger = require("../lib/logger");
let admin = require("../lib/admin");
let accounts = require("../lib/accounts");

let admin_role = "admin";

router.get("/", accounts.require_auth(admin_role), function(req, res, next) {
  res.send(admin.base_config());
});

router.get("/users", accounts.require_auth(admin_role), function(req, res, next) {
  let perPage = parseInt(req.query.pagesize) ? req.query.pagesize : 20;
  let page = parseInt(req.query.page) ? req.query.page : 1;
  let order = req.query.order ? req.query.order : "user_id";
  admin.list_users(perPage, page, order)
  .then((users) => {
    res.send(users);
  })
});

router.post("/lock/:user_id", accounts.require_auth(admin_role), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";

  if (req.params.user_id == req.session.user.user_id) {
    res.status(400);
    res.send({message: "you cannot lock your own account"});
  } else {
    admin.lock_user(req.params.user_id, req.body.reason)
    .then((result) => {
      logger.info(null, {
        message: "an account was locked out", 
        action: "/admin/lock/:user_id", 
        src_user_id: req.session.user.user_id,
        src_username: req.session.user.username,
        user_id: req.params.user_id,
        reason: req.body.reason,
        src_ip: req.ip, 
        ua: ua, 
        result: "success"
      });
  
      res.sendStatus(200);
    }).catch((err) => {
      logger.error(null, {
        message: err.message, 
        action: "/admin/lock/:user_id", 
        src_user_id: req.session.user.user_id, 
        src_username: req.session.user.username,
        user_id: req.params.user_id,
        reason: req.body.reason,
        src_ip: req.ip, 
        ua: ua
      });
  
      res.status(400);
      res.send({message: err.message});
    });
  }
});

router.all("/unlock/:user_id", accounts.require_auth(admin_role), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";
  admin.unlock_user(req.params.user_id)
  .then((result) => {
    logger.info(null, {
      message: "an account was unlocked", 
      action: "/admin/lock/:user_id", 
      src_user_id: req.session.user.user_id,
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua, 
      result: "success"
    });

    res.sendStatus(200);
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      action: "/admin/lock/:user_id", 
      src_user_id: req.session.user.user_id, 
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua
    });

    res.status(400);
    res.send({message: err.message});
  });
});

router.post("/roles/:user_id", accounts.require_auth(admin_role), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";
  admin.set_user_roles(req.params.user_id, req.body.roles)
  .then((result) => {
    logger.info(null, {
      message: "roles were set for an account", 
      action: "/admin/roles/:user_id", 
      src_user_id: req.session.user.user_id,
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      roles: req.body.roles,
      src_ip: req.ip, 
      ua: ua, 
      result: "success"
    });

    res.sendStatus(200);
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      action: "/admin/roles/:user_id", 
      src_user_id: req.session.user.user_id, 
      src_username: req.session.user.username,
      roles: req.body.roles,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua
    });

    res.status(400);
    res.send({message: err.message});
  });
});

router.post("/must-change-password/:user_id", accounts.require_auth(admin_role), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";
  accounts.set_must_change_password(req.params.user_id)
  .then((result) => {
    if (result) {
      logger.info(null, {
        message: "must_change_password was set for an account", 
        action: "/admin/must-change-password/:user_id", 
        src_user_id: req.session.user.user_id,
        src_username: req.session.user.username,
        user_id: req.params.user_id,
        src_ip: req.ip, 
        ua: ua, 
        result: "success"
      });
  
      res.sendStatus(200);
    } else {
      logger.error(null, {
        message: "must_change_password could not be set", 
        action: "/admin/must-change-password/:user_id", 
        src_user_id: req.session.user.user_id, 
        src_username: req.session.user.username,
        user_id: req.params.user_id,
        src_ip: req.ip, 
        ua: ua,
        result: "fail"
      });
  
      res.status(400);
      res.send({message: "must_change_password could not be set - did you specify the wrong user_id value?"});
    }
  })
});

router.post("/options", accounts.require_auth(admin_role), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";
  admin.set_periscope_options(req.body.option, req.body.setting)
  .then((result) => {
    logger.info(null, {
      message: `${req.body.option} was set to ${req.body.setting}`, 
      action: "/admin/options", 
      src_user_id: req.session.user.user_id,
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua, 
      result: "success"
    });

    res.sendStatus(200);
  }).catch((error) => {
    logger.error(null, {
      message: error.message, 
      action: "/admin/options", 
      src_user_id: req.session.user.user_id, 
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua,
      result: "fail",
      reason: error.reason
    });

    res.status(400);
    res.send({message: error.message});
  });
});

router.post("/create-signup-token", accounts.require_auth(admin_role), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";
  accounts.issue_account_create(req.body.email)
  .then((result) => {
    logger.info(null, {
      message: `Account creation link was set to ${req.body.email}`, 
      action: "/admin/options", 
      src_user_id: req.session.user.user_id,
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua, 
      result: "success"
    });

    res.sendStatus(200);
  }).catch((error) => {
    logger.error(null, {
      message: error.message,
      action: "/admin/create-signup-token",
      src_user_id: req.session.user.user_id, 
      src_username: req.session.user.username,
      user_id: req.params.user_id,
      src_ip: req.ip, 
      ua: ua,
      result: "fail",
    });

    res.status(400);
    res.send({message: error.message});
  });
});

module.exports = router;