var express = require("express");
var router = express.Router();
var manager = require("../lib/manager");
const logger = require("../lib/logger");
let accounts = require("../lib/accounts");
let options = require("../lib/options");

let targets_view_role = options.get("periscope", "public_can_view") ? null : "user";
let targets_submit_role = options.get("periscope", "public_can_submit") ? null : "user";

router.get("/", accounts.require_auth(targets_view_role), function(req, res, next) {
  /*
  expected:
  none
  optional:
  query { page, pagesize }
  */
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;

  manager.TargetList(req.session.user, pagesize=pagesize, page=page)
  .then((rows) => {
    if (rows.data.length) {
      res.send(rows);
    } else {
      res.status(404);
      res.send({message: "no targets found for these parameters"});
    }
    
  }).catch((err) => {
    logger.error(null, {message: err.message});
    res.status(400);
    res.send(err);
  });
});

router.get("/:target_id", accounts.require_auth(targets_view_role), function(req, res, next) {
  /*
  expected:
  params { id }
  optional:
  query { page, pagesize }
  */
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;

  manager.TargetVisits(parseInt(req.params.target_id), req.session.user, pagesize=pagesize, page=page)
  .then((rows) => {
    if (rows.data.length) {
      res.send(rows);
    } else {
      res.status(404);
      res.send({message: "no targets found for these parameters"});
    }
  }).catch((err) => {
    logger.error(null, {message: err.message});
    res.status(400);
    res.send(err);
  });
});

router.post("/add", accounts.require_auth(targets_submit_role), function(req, res, next) {
  /*
  expected:
  body { url }
  optional:
  body { device (null, or device name as string, or device options as object) }
  */
  let ua = req.headers['user-agent'] || "";
  let username = null;
  let user_id = null;
  if (req.session.user) {username = req.session.user.username; user_id = req.session.user.user_id}
  let private = req.body.private ? req.body.private : false;

  manager.TargetAdd(req.body.url, req.body.device, user_id, private)
  .then((visit) => {
    logger.info(null, {
      message: "target added", 
      src_ip: req.ip, 
      target: req.body.url, 
      device: req.query.devname, 
      ua: ua, 
      action: "/targets/add",
      username: username,
      user_id: user_id
    });
    res.send({
      visit
    });
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      src_ip: req.ip, 
      target: req.body.url, 
      device: req.query.devname, 
      ua: ua, 
      action: "/targets/add",
      username: username,
      user_id: user_id
    });
    res.status(400);
    res.send(err.message);
  });
});

router.post("/:target_id/new-visit", accounts.require_auth(targets_submit_role), function(req, res, next) {
  /*
  expected:
  params { id }
  optional:
  body { device (null, or device name as string, or device options as object) }
  */
  let ua = req.headers['user-agent'] || "";
  let username = null;
  let user_id = null;
  if (req.session.user) {username = req.session.user.username; user_id = req.session.user.user_id}
  let private = req.body.private ? req.body.private : false;

  manager.VisitCreateNew(parseInt(req.params.target_id), req.body.device, user_id, private)
  .then((visit) => {
    if (visit) {
      logger.info(null, {
        message: "new visit created for target",
        src_ip: req.ip, 
        target_id: req.params.target_id, 
        device: req.body.device, 
        ua: ua, 
        action: `/targets/${req.params.target_id}/new-visit`,
        username: username,
        user_id: user_id
      });
      res.send({
        visit
      });
    } else {
      logger.error(null, {
        message: "no targets found for specified target_id",
        src_ip: req.ip, 
        target_id: req.params.target_id, 
        device: req.body.device, 
        ua: ua, 
        action: `/targets/${req.params.target_id}/new-visit`,
        username: username,
        user_id: user_id
      });
      res.status(404);
      res.send({ 
        message: `No targets matching id`,
        request_id: req.params.target_id
      });
    }
  }).catch((err) => {
    logger.error(null, {
      message: err.message,
      src_ip: req.ip, 
      target_id: req.params.target_id, 
      device: req.body.device, 
      ua: ua, 
      action: `/targets/${req.params.target_id}/new-visit`,
      username: username,
      user_id: user_id
    });
    res.status(400);
    res.send(err);
  });
});

module.exports = router;