var express = require("express");
var router = express.Router();
var manager = require("../lib/manager");
const fs = require("fs");
const logger = require("../lib/logger");
const path = require("path");
let accounts = require("../lib/accounts");
let options = require("../lib/options");

let visits_view_role = options.get("periscope", "public_can_view") ? null : "user";

router.all("/", accounts.require_auth(visits_view_role), function(req, res, next) {
  /*
  expected:
  none
  optional:
  query { page, pagesize }
  */
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;

  manager.VisitList(req.session.user, pagesize, page)
  .then((rows) => {
    if (rows.data.length) {
      res.send(rows);
    } else {
      res.status(404);
      res.send({message: "no visits found for these parameters"});
    }
  }).catch((err) => {
    logger.error(null, {message: err.message});
    res.status = 400;
    res.send(err);
  });
});

router.get("/:visit_id/file/:fileno", accounts.require_auth(visits_view_role), function(req, res, next) {
  /*
  expected:
  params { visit_id, fileno }
  */
  manager.ExtractSavedFile(parseInt(req.params.visit_id), parseInt(req.params.fileno), req.session.user)
  .then((filedata) => {
    res.download(filedata.path, filedata.name, function(err) {
      if (err) {
        let out_err = {
          code: err.code,
          syscall: err.syscall,
          file: path.basename(err.path)
        }
        if (err.code == "ENOENT") {
          res.status(404);
          res.send(out_err);
        } else {
          logger.error(null, {message: err});
          res.status(500);
          res.send(out_err);
        }
      } else {
        fs.unlink(filedata.path, function(err) {
          if (err) {
            logger.error(null, {message: err.toString()});
          } else {
            logger.info(null, {message: `Temp file ${filedata.path} deleted`});
          }
        });
      }
    });
  });
});

router.get("/:visit_id/allfiles", accounts.require_auth(visits_view_role), function(req, res, next) {
  /*
  expected:
  params { visit_id }
  */
  manager.FilesArchive(parseInt(req.params.visit_id), req.session.user)
  .then((filedata) => {
    res.download(filedata.path, filedata.name, function(err) {
      if (err) {
        let out_err = {
          code: err.code,
          syscall: err.syscall,
          file: path.basename(err.path)
        }
        if (err.code == "ENOENT") {
          res.status(404);
          res.send(out_err);
        } else {
          logger.error(null, err);
          res.status(500);
          res.send(out_err);
        }
      }
    });
  });
});

router.get("/:visit_id", accounts.require_auth(visits_view_role), function(req, res, next) {
  /*
  expected:
  params { id }
  */
  manager.VisitShow(parseInt(req.params.visit_id), req.session.user)
  .then((visit) => {
    if (visit) {
      res.send(visit);
    } else {
      res.status(404);
      res.send({ 
        message: `No visits matching id`,
        request_id: req.params.visit_id
      });
    }
  }).catch((err) => {
    logger.error(null, {message: err.message, action: "get visit"});
    res.status(400);
    res.send(err);
  });
});

router.get("/:visit_id/screenshot", accounts.require_auth(visits_view_role), function(req, res, next) {
  /*
  expected:
  params { id }
  */
   manager.VisitBase(parseInt(req.params.visit_id), req.session.user)
  .then((visit) => {
    if (visit && visit.screenshot) {
      res.sendFile(visit.screenshot);
    } else {
      res.redirect("/images/placeholder.svg");
    }
  }).catch((err) => {
    res.redirect("/images/placeholder.svg");
  });
});

router.get("/:visit_id/thumbnail", accounts.require_auth(visits_view_role), function(req, res, next) {
  /*
  expected:
  params { id }
  */
  manager.VisitBase(parseInt(req.params.visit_id), req.session.user)
  .then((visit) => {
    if (visit && visit.thumb) {
      res.sendFile(visit.thumb);
    } else {
      res.redirect("/images/placeholder.svg");
    }
  }).catch((err) => {
    res.redirect("/images/placeholder.svg");
  });
});

module.exports = router;