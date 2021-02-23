var express = require("express");
var router = express.Router();
var manager = require("../lib/manager");
const fs = require("fs");
const logger = require("../lib/logger");
const path = require("path");

// no index router - Vue is used

router.get("/targets", function(req, res, next) {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;

  manager.TargetList(pagesize=pagesize, page=page)
  .then((rows) => {
    res.send(rows);
  }).catch((err) => {
    console.log(err.message);
    res.status = 400;
    res.send(err);
  });
});

router.get("/targets/:id", function(req, res, next) {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;

  manager.TargetVisits(parseInt(req.params.id), pagesize=pagesize, page=page)
  .then((rows) => {
    res.send(rows);
  }).catch((err) => {
    console.log(err.message);
    res.status = 400;
    res.send(err);
  });
});

router.post("/targets/add", function(req, res, next) {
  manager.TargetAdd(req.body.url, req.query.devname)
  .then((visit) => {
    res.send({
      visit
    });
  }).catch((err) => {
    console.log(err.message);
    res.status = 400;
    res.send(err);
  });
});

router.all("/targets/:id/new-visit", function(req, res, next) {
  manager.VisitCreateNew(parseInt(req.params.id), req.query.devname)
  .then((visit) => {
    if (visit) {
      res.send({
        visit
      });
    } else {
      res.status(404);
      res.send({ 
        message: `No targets matching id`,
        request_id: req.params.id
      });
    }
  }).catch((err) => {
    logger.error(null, err.message);
    res.status(400);
    res.send(err);
  });
});

router.all("/visits", function(req, res, next) {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;

  manager.VisitList(pagesize, page)
  .then((rows) => {
    res.send(rows);
  }).catch((err) => {
    logger.error(null, err.message);
    res.status = 400;
    res.send(err);
  });
});

router.get("/visits/:visit_id/file/:fileno", function(req, res, next) {
  manager.ExtractSavedFile(parseInt(req.params.visit_id), parseInt(req.params.fileno))
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
      } else {
        fs.unlink(filedata.path, function(err) {
          if (err) {
            logger.error(null, err.toString());
          } else {
            logger.info(null, `Temp file ${filedata.path} deleted`);
          }
        });
      }
    });
  });
});

router.get("/visits/:visit_id/allfiles", function(req, res, next) {
  manager.FilesArchive(parseInt(req.params.visit_id))
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

router.get("/visits/:id", function(req, res, next) {
  manager.VisitShow(parseInt(req.params.id))
  .then((visit) => {
    if (visit) {
      res.send(visit);
    } else {
      res.status(404);
      res.send({ 
        message: `No visits matching id`,
        request_id: req.params.id
      });
    }
  }).catch((err) => {
    console.log(err.message);
    res.status(400);
    res.send(err);
  });
});

router.get("/visits/:id/screenshot", function(req, res, next) {
  manager.VisitBase(parseInt(req.params.id))
  .then((visit) => {
    if (visit) {
      res.redirect(visit.screenshot_path);
    } else {
      res.status(404);
      res.send({ 
        message: `No visits matching id`,
        request_id: req.params.id
      });
    }
  }).catch((err) => {
    logger.error(null, err.message);
    res.status(400);
    res.send(err);
  });
});

router.get("/visits/:id/thumbnail", function(req, res, next) {
  manager.VisitBase(parseInt(req.params.id))
  .then((visit) => {
    if (visit) {
      const regex = /\.png/gi;
      let thumbpath = visit.screenshot_path.replace(regex, "_thumb.png");
      res.redirect(thumbpath);
    } else {
      res.status(404);
      res.send({ 
        message: `No visits matching id`,
        request_id: req.params.id
      });
    }
  }).catch((err) => {
    res.redirect("/images/placeholder.svg");
  });
});

router.get("/deviceoptions", function(req, res, next) {
  if (typeof(req.query.devname) == "undefined" || req.query.devname == "") {
    let opts = manager.DeviceOptions();
    logger.info(null, opts);
    res.send(opts);
  } else {
    let settings = manager.DeviceSettings(req.query.devname);
    logger.info(null, settings);
    res.send(settings);
  }
});

router.get("/search", function (req, res, next) {
  let page = typeof(parseInt(req.query.page)) == "number" ? parseInt(req.query.page) : 1;
  let pagesize = typeof(parseInt(req.query.pagesize)) == "number" ? parseInt(req.query.pagesize) : 20;
  manager.RequestSearch(req.query.q, perPage=pagesize, currentPage=page)
  .then((results) => {
    res.send(results);
  })
  .catch((err) => {
    logger.error(null, err.message);
    res.status(400);
    res.send(err);
  });
});

module.exports = router;
