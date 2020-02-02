var express = require("express");
var router = express.Router();
var manager = require("../lib/manager");
const fs = require("fs");

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

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
  let complete = req.query.complete ? req.query.complete : null;

  manager.TargetVisits(parseInt(req.params.id), pagesize=pagesize, page=page, complete=complete)
  .then((rows) => {
    res.send(rows);
  }).catch((err) => {
    console.log(err.message);
    res.status = 400;
    res.send(err);
  });
});

router.post("/targets/add", function(req, res, next) {
  manager.TargetAdd(req.body.url)
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
  manager.VisitCreate(parseInt(req.params.id), base_only=true)
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
    console.log(err.message);
    res.status(400);
    res.send(err);
  });
});

router.all("/visits", function(req, res, next) {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let pagesize = req.query.pagesize ? parseInt(req.query.pagesize) : 20;
  let completed = req.query.completed ? ["true", "t", "1"].includes(req.query.completed) : false;
  manager.VisitList(pagesize=pagesize, page=page, completed=completed)
  .then((rows) => {
    res.send(rows);
  }).catch((err) => {
    console.log(err.message);
    res.status = 400;
    res.send(err);
  });
});

router.all("/visits/:id/run", function(req, res, next) {
  manager.VisitRun(parseInt(req.params.id))
  .then((visit) => {
    res.send({
      visit
    });
  })
});

router.get("/visits/:visit_id/file/:fileno", function(req, res, next) {
  manager.ExtractSavedFile(parseInt(req.params.visit_id), parseInt(req.params.fileno))
  .then((filedata) => {
    res.download(filedata.path, filedata.name, function(err) {
      if (err) {
        throw err;
      } else {
        fs.unlink(filedata.path, function(err) {
          if (err) {
            console.error(err.toString());
          } else {
            console.log(`Temp file ${filedata.path} deleted`);
          }
        });
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
  manager.VisitShow(parseInt(req.params.id))
  .then((visit) => {
    if (visit) {
      res.redirect(visit.visit.screenshot_path);
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

router.get("/search", function (req, res, next) {
  manager.RequestSearch(req.query.q)
  .then(([requests, responses]) => {
    let results = {
      requests: requests,
      responses, responses
    }
    res.send(results);
  })
  .catch((err) => {
    console.log(err.message);
    res.status(400);
    res.send(err);
  });
});

module.exports = router;
