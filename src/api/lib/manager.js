const url = require("url");
const request_client = require("request-promise-native");
const db = require("./database");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const gm = require("gm");
const { exec } = require("child_process");
const stager = require("./stager");
const dfpm = require("./DFPM/dfpm.js");
const logger = require("./logger");
const { isNull } = require("util");
const prettyBytes = require("pretty-bytes");
const websockets = require('../routes/websocket');
const puppeteer = require('puppeteer');

// allows certificate errors to be automatically be accepted
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const periscopeDefaultDevice = {
  viewport: {
    width: 1903, 
    height: 1064, 
    deviceScaleFactor: 1, 
    isLandscape: true,
    isMobile: false,
    hasTouch: false
  },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36 Edg/88.0.705.74"
}

let response_add_data = function(request_time, request, response, result, errorlog) {
  logger.debug(errorlog, {message: `Entered response_add_data() for ${request.url()}`, action: "response_add_data", status: "started"});
  let request_url = request.url();
  let request_method = request.method();
  let request_headers = [];
  let request_post_data = '';
  let response_headers = [];
  let response_size = null;
  let response_body = null;
  let response_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
  let response_code = null;

  console.log(Object.keys(response));

  try {
    request_headers = request.headers();
  } catch (err) {
    logger.error(errorlog, {message: `Unable to add request headers: ${err.message}`, action: "response_add_data"});
  }

  try {
    request_post_data = (typeof request.postData() === 'undefined') ? null : request.postData();
  } catch (err) {
    logger.error(errorlog, {message: `Unable to add POST data: ${err.message}`, action: "response_add_data"});
  }

  if (typeof response !== 'undefined') {
    try {
      if (response && response.statusCode) {response_code = response.statusCode;}
    } catch (err) {
      logger.error(errorlog, {message: `Unable to add response code: ${err.message}`, action: "response_add_data"});
    }
  
    try {
      if (response && response.headers) {response_headers = response.headers;}
    } catch (err) {
      logger.error(errorlog, {message: `Unable to add response headers: ${err.message}`, action: "response_add_data"});
    }
  
    try {
      if (response_headers) {response_size = (typeof response_headers["content-length"] === 'undefined') ? null : response_headers["content-length"];}
    } catch (err) {
      logger.error(errorlog, {message: `Unable to add response size: ${err.message}`, action: "response_add_data"});
    }
  
    try {
      if (response && response.body) {response_body = response.body;}
    } catch (err) {
      logger.error(errorlog, {message: `Unable to add response body: ${err.message}`, action: "response_add_data"});
    }  
  }
  
  response_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

  result.push({
    request_url,
    request_method,
    request_headers,
    request_post_data,
    request_time,
    response_code,
    response_headers,
    response_size,
    response_body,
    response_time,
    file_id: null
  });
  logger.debug(errorlog, {message: `Completed response_add_data() for ${request.url()}`, action: "response_add_data", status: "completed"});
}

let VisitTarget = async function(visit) {
  logger.debug(visit.errorlog, {message: "Creating browser and page instances", action: "VisitTarget", status: "started"});
  const browser = await stager.getPuppet();
  const page = await browser.newPage();

  await db.set_status(visit.visit_id, "Page initialized");

  try {
    // simulate the options chosen (defaults to a desktop-like defined by periscopeDefaultDevice)
    page.emulate(visit.settings);
    logger.debug(visit.errorlog, {message: `Settings emulated: ${JSON.stringify(visit.settings)}`, action: "VisitTarget"});

    const result = [];
    const dfpm_detections = [];
    let dfpm_info_count = 0;
    await page.setRequestInterception(true);
    logger.debug(visit.errorlog, {message: `Request interception set`, action: "VisitTarget"});


    page.on("request", request => {
      // capture information about requests and responses
      const request_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
      logger.debug(visit.errorlog, {message: `Entered page.on('request') for ${request.url()}`, action: "VisitTarget", sub_action: "page.on request"});

      request_client({
        uri: request.url(),
        resolveWithFullResponse: true,
        simple: false,
        rejectUnauthorized: false,
        strictSSL: false,
        insecure: true,
      }).then(response => {
        logger.debug(visit.errorlog, {message: `Entered request_client() for page ${request.url()}`, action: "VisitTarget", sub_action: "page.on request"});

        response_add_data(request_time, request, response, result, visit.errorlog);

        
        logger.debug(visit.errorlog, {message: `Continuing request for ${request.url()}`, action: "VisitTarget", sub_action: "page.on request"});
        request.continue();
        logger.debug(visit.errorlog, {message: `Continued request for ${request.url()}`, action: "VisitTarget", sub_action: "page.on request"});
      }).catch(error => {
        

        let result_obj = {
          request_url: request.url(),
          request_method: request.method(),
          request_time: request_time,
          request_post_data: '',
          request_headers: [],
          response_code: null,
          response_headers: [],
          response_size: null,
          response_body: null,
          response_time: null,
          file_id: null
        }

        if (result_obj.request_url.startsWith("data:")) {
          result_obj.response_time = result_obj.request_time;
        } else {
          logger.error(visit.errorlog, {message: `Error in request client: ${error.message}`, action: "VisitTarget", sub_action: "page.on request"});
          
          result_obj.response_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

          try {
            result_obj.request_post_data = (typeof request.postData() === 'undefined') ? null : request.postData();
          } catch (err) {
            logger.error(visit.errorlog, {message: `Unable to add POST data: ${err.message}`, action: "VisitTarget", sub_action: "page.on request"});
          }

          logger.error(visit.errorlog, {message: `Aborting request for ${request.url()}`, action: "VisitTarget", sub_action: "page.on request"});
          request.abort();
        }

        logger.debug(visit.errorlog, {message: `Pushing object to results`, action: "VisitTarget", sub_action: "page.on request"});
        result.push(result_obj);
      });
    });

    page.on('console', msg => {
      if (msg._type == "log") {
        // some messages are not DFPM detections - don't want to break if we get any
        // but still output to error log in case of something useful
        try {
          logger.debug(visit.errorlog, {message: `Parsing message JSON: ${msg._text}`, action: "VisitTarget", sub_action: "page.on console"});
          let evt = JSON.parse(msg._text);
          if (evt.level == "warning" || evt.level == "danger") {
            // capture events that DFPM flags as suspicious
            dfpm_detections.push(
              {
                visit_id: visit.visit_id,
                method: evt.method,
                dfpm_path: evt.path,
                dfpm_level: evt.level,
                dfpm_category: evt.category,
                dfpm_url: evt.url,
                dfpm_raw: evt
              }
            );
            websockets.alertWebsocketRoom(`visit/${visit.visit_id}`, 'dfpm_alert', { category: evt.category, level: evt.level });
          } else if (evt.level == "info") {
            logger.info(visit.errorlog, {message: `${evt.category} ${evt.method} seen in ${evt.url}`, action: "VisitTarget", sub_action: "page.on console"});
            dfpm_info_count += 1;
          }
        } catch (err) {
          logger.error(visit.errorlog, {message: err, action: "VisitTarget", sub_action: "page.on console"});
          logger.info(visit.errorlog, {message: `Non-JSON message from console: ${msg._text}`, action: "VisitTarget", sub_action: "page.on console"});
        }
      }
    });

    logger.info(visit.errorlog, {message: `Going to page`, query: visit.query, action: "VisitTarget"});
    await db.set_status(visit.visit_id, "Loading page");
    const response = await page.goto(
      visit.query, 
      {
        waitUntil: "networkidle0",
        referrer: "https://www.bing.com",
        timeout: visit.timeout ? visit.timeout : 0
      }
    );

    logger.info(visit.errorlog, {message: `Letting DFPM gather data, waiting a few secs...`, action: "VisitTarget"});
    await dfpm.sleep(10*1000);

    await db.set_status(visit.visit_id, "Writing screenshots");

    let imagedir = images_folder(moment(visit.time));

    let screenshot_file_path = path.join(imagedir, `${visit.visit_id}.png`);
    let screenshot_window_path = path.join(imagedir, `${visit.visit_id}_thumb.png`);
    let screenshot_uri_path = path.join(images_uri(moment(visit.time)), `${visit.visit_id}.png`);

    // generate window view and convert it to thumbnail
    try {
      logger.debug(visit.errorlog, {message: `Generating windowed screenshot to ${screenshot_window_path}`, action: "VisitTarget"});
      await page.screenshot({path: screenshot_window_path});

      gm(screenshot_window_path)
      .resize(null, 250)
      .write(screenshot_window_path, function(err) {
        if (err) {
          logger.error(visit.errorlog, {message: `Failed to resize thumbnail for ${visit.visit_id}: ${err.message}`, action: "VisitTarget"});
        }
      });
    } catch (err) {
      logger.error(visit.errorlog, {message: `Error capturing windowed screenshot for ${visit.visit_id}: ${err.message}`, action: "VisitTarget"});
    }

    // generate screenshot of entire page
    try {
      logger.debug(visit.errorlog, {message: `Generating screenshot to ${screenshot_file_path}`, action: "VisitTarget"});
      await page.screenshot({path: screenshot_file_path, fullPage: true});  
    } catch (err) {
      logger.error(visit.errorlog, {message: `Error capturing full page screenshot for ${visit.visit_id}: ${err.message}`, action: "VisitTarget"});
    }

    await db.set_status(visit.visit_id, "Writing files");

    let d_path = date_folder(moment(visit.time));
    let d_dir = data_dir(d_path, visit.visit_id);

    let outfiles = fs.createWriteStream(path.join(d_dir, "files.tar.gz"));
    var archive = archiver("tar", {
      gzip: true,
      gzipOptions: {
        level: 6
      }
    });

    outfiles.on("close", function() {
      let archive_msg = `${archive.pointer()} total bytes written to archive for visit ${visit.visit_id}`;
      logger.info(visit.errorlog, {message: archive_msg, action: "VisitTarget", sub_action: "outfiles.on close"});
    });

    archive.on("error", function(err) {
      logger.error(visit.errorlog, {message: `Error archiving files: ${err.message}`, action: "VisitTarget", sub_action: "archive.on error"});
      throw err;
    });

    archive.pipe(outfiles);

    result.forEach((r, idx) => {
      // tag file IDs into the output
      r.file_id = idx;

      if (r.response_body === undefined || r.response_body === null) {
        r.response_body = '';
      }
      
      logger.debug(visit.errorlog, {message: `Appending file ${idx} with size ${r.length} to archive`, action: "VisitTarget", sub_action: "archive.append"});
      archive.append(r.response_body, {name: `${idx}`});
    });

    logger.debug(visit.errorlog, {message: `Finalizing archive`, action: "VisitTarget"});
    archive.finalize();

    // allow time before exiting browser process for fingerprint detection to generate results
    logger.debug(visit.errorlog, {message: `Closing page`, action: "VisitTarget"});
    await page.close();
    logger.debug(visit.errorlog, {message: `Page closed`, action: "VisitTarget"});

    logger.debug(visit.errorlog, {message: `Marking completed in DB`, action: "VisitTarget"});
    await db.mark_complete(visit.visit_id);
    logger.info(visit.errorlog, {message: `DFPM logged ${dfpm_info_count} info level events for visit ${visit.visit_id}`, action: "VisitTarget"});

    return [result, dfpm_detections, screenshot_uri_path];
  } catch (err) {
    logger.fatal(visit.errorlog, {message: `Fatal! Error in VisitTarget() could not be handled: ${err}`, action: "VisitTarget"});
    // make sure the browser is always closed even if stuff breaks - otherwise leaves hung puppeteer threads indefinitely
    await page.close();
    throw(err);
  }
}

let Visit = async function(visit) {
  try {
    let action_time = moment();

    let date_path = date_folder(action_time);
    
    if (!fs.existsSync(date_path)) {
      fs.mkdirSync(date_path);
    }

    let d_dir = data_dir(date_path, visit.visit_id);
    visit.errorlog = path.join(d_dir, "error.log");

    if (!fs.existsSync(d_dir)) {
      fs.mkdirSync(d_dir);
    }

    let images_dir = images_folder(moment(action_time));
    logger.info(visit.errorlog, {message: `Images for visit ${visit.visit_id} being stored in ${images_dir}`, action: "Visit"});

    if (!fs.existsSync(images_dir)) {
      fs.mkdirSync(images_dir);
    }

    await db.set_actioned_time(visit.visit_id, action_time);
    logger.info(visit.errorlog, {message: `Visit ${visit.visit_id} actioned at ${action_time}`, action: "Visit"});

    VisitTarget(visit)
    .then(([requests, dfpm_detections, screenshot_uri_path]) => {
      logger.debug(visit.errorlog, {message: `Adding requests to DB`, action: "Visit", sub_action: "VisitTarget.then"});
      db.set_status(visit.visit_id, `Writing requests to DB`).then(() => {});

      db.add_requests(requests, visit.visit_id)
      .then(([req_inserts, resp_inserts]) => {
        let insert_stats = `Added ${req_inserts} request headers and ${resp_inserts} response headers in ${requests.length} requests for visit ${visit.visit_id}`;
        logger.info(visit.errorlog, {message: insert_stats, action: "Visit", sub_action: "db.add_requests.then"});

        let set_screenshot_path = `Setting visit ${visit.visit_id} screenshot path value to ${screenshot_uri_path}`;
        logger.info(visit.errorlog, {message: set_screenshot_path, action: "Visit", sub_action: "db.add_requests.then"});

        db.set_screenshot_path(screenshot_uri_path, visit.visit_id)
        .catch((err) => {
          logger.error(visit.errorlog, {message: `Error setting screenshot path: ${err.message}`, action: "Visit", sub_action: "db.set_screenshot_path.catch"});
        });
      });

      logger.debug(visit.errorlog, {message: "Adding DFPM detections to DB", action: "Visit", sub_action: "VisitTarget.then"});

      Promise.all([
        db.set_status(visit.visit_id, `Writing DFPM to DB`),
        db.add_dfpm(dfpm_detections)
      ]).then(() => {  
        db.set_status(visit.visit_id, "complete").then(() => {
          websockets.alertWebsocketRoom(`visit/${visit.visit_id}`, 'status', 'complete');
        });
      });
    }).catch((err) => {
      logger.error(visit.errorlog, {message: err.message, action: "Visit", sub_action: "VisitTarget.then"});
      logger.error(visit.errorlog, {message: `Encountered error processing visit ${visit.visit_id}; wrote to log`, action: "Visit", sub_action: "VisitTarget.then"});
      db.set_status(visit.visit_id, `failed`).then(() => {
        websockets.alertWebsocketRoom(`visit/${visit.visit_id}`, 'status', 'failed');
      });
    });

    return action_time;
  } catch(err) {
    logger.fatal(visit.errorlog, {message: `Fatal error in function Visit: ${err.message}`, action: "Visit"});
    db.set_status(visit.visit_id, `failed`).then(() => {
      websockets.alertWebsocketRoom(`visit/${visit.visit_id}`, 'status', 'failed');
    });
    throw(err);
  }
}

let VisitCreate = async function(target_id, devname) {    
  // load Puppeteer device template based on device name
  let settings = GetDeviceSettings(devname);

  let submittime = moment();

  let visit = await db.add_visit(target_id, submittime, settings);

  return visit;
}

let VisitRun = async function(visit_id) {
  logger.debug(null, {message: "VisitRun called", action: "VisitRun"});
  return await db.get_visit(visit_id)
  .then((visit) => {
    if (visit) {
      logger.debug(null, {message: `Got one! ${visit_id}`, action: "VisitRun"});
      visit = visit[0];
    } else {
      let novisit = `No visit found with id ${visit_id}`;
      logger.error(null, {message: novisit, action: "VisitRun"});
      throw novisit;
    }
    if (visit.time_actioned == null) {
      return Visit(visit)
      .then((action_time) => {
        visit.time_actioned = action_time;
        return visit;
      });
    } else {
      return visit;
    }
  });
}

let GetDeviceSettings = function(devname) {
  if (devname == "default" || devname == null || typeof(devname) == "undefined") {
    return periscopeDefaultDevice;
  } else if (typeof(devname) == "string") {
    return puppeteer.devices[devname];
  } else {
    throw({message: "not a valid device"});
  }
}

let date_folder = function(m) {
  let df = m.format("YYYYMMDD");
  let date_path = `/usr/local/unsafehex/periscope/data/${df}`;
  return date_path;
}

let images_folder = function(m) {
  let df = m.format("YYYYMMDD");
  let images_path = `/usr/local/unsafehex/periscope/api/public/images/${df}`;
  return images_path;
}

let images_uri = function(m) {
  let df = m.format("YYYYMMDD");
  let image_uri = `/images/${df}`;
  return image_uri;
}

let data_dir = function(date_path, visit_id) {
  return path.join(date_path, `${visit_id}`);
}

let stitch_results = function(reqs, responses) {
  // combine the database rows for requests with corresponding responses

  let data = {
    requests: {},
    requests_sorted: [],
    summary: {
      total_response_data: 0,
      total_load_time: null
    }
  };

  let loadstart = null;
  let loadend = null;

  // iterate through all the requests; in each iteration, create an object containing both
  // request headers and their related responses, linked by the request_id
  reqs.forEach((req_header) => {
    if (req_header.request_id in data.requests) {
      // if we have already initialised the object for this request, just add the header to it
      // headers are stored as an array because HTTP allows for repeat/duplicate headers
      data.requests[req_header.request_id].request_headers.push({[req_header.header_name]: req_header.header_value});
    } else {
      data.requests[req_header.request_id] = {
        request_id: req_header.request_id,
        request_time: req_header.request_time,
        request_url: req_header.request_url,
        request_method: req_header.request_method,
        request_post_data: req_header.request_post_data,
        request_headers: [{[req_header.header_name]: req_header.header_value}],
        file_id: null,
        response_time: null,
        response_size: null,
        response_code: null,
        response_headers: []
      };
    }

    if (moment(req_header.request_time) < loadstart || !loadstart) {
      loadstart = moment(req_header.request_time);
    }
  });

  responses.forEach((resp_header) => {
    // now that requests strucutre is created, responses can be added in to it
    if (data.requests[resp_header.request_id].response_time === null) {
      data.requests[resp_header.request_id].response_time = resp_header.response_time;
      data.requests[resp_header.request_id].file_id = typeof(resp_header.file_id) == "undefined" ? null : resp_header.file_id;
      data.requests[resp_header.request_id].response_size = resp_header.response_size;
      data.requests[resp_header.request_id].response_code = resp_header.response_code;

      data.summary.total_response_data = data.summary.total_response_data + resp_header.response_data_length;
    }
    
    // again, repeat headers are a possibility
    if (resp_header.header_name) {
      data.requests[resp_header.request_id].response_headers.push({[resp_header.header_name]: resp_header.header_value});  
    }

    if (moment(resp_header.response_time) > loadend || !loadend) {
      loadend = moment(resp_header.response_time);
    }
  });

  let request_ids = Object.keys(data.requests);

  let request_ids_sorted = request_ids.sort((a, b) => (data.requests[a].request_time > data.requests[b].request_time) ? 1 : -1);

  request_ids_sorted.forEach((id) => {
    data.requests_sorted.push(data.requests[id]);
  });

  data.summary.total_response_data = prettyBytes(data.summary.total_response_data);

  data.summary.total_load_time = (loadend-loadstart)/1000;

  return data;
}

let build_search_results = function([requests, responses]) {
  let results = [];
  requests.forEach((request) => {
    request.type = "request";
    results.push(request);
  });

  responses.forEach((response) => {
    response.type = "response"; 
    results.push(response);
  });

  return results;
}

module.exports = {
  DeviceOptions: function() {
    // puppeteer.devices is an object with device names as keys, and the settings as their values
    // we only need the keys to present to users as options
    let keys = Object.keys(puppeteer.devices);
    keys.push("default");
    return keys;
  },
  DeviceSettings: function(devname) {
    return GetDeviceSettings(devname);
  },
  ExtractSavedFile: async function(visit_id, file_id) {
    logger.debug(null, {message: "ExtractSavedFile called", action: "ExtractSavedFile"});
    // unarchive a specific requested file so that it can be downloaded; we need to load the info from the visit_id 
    // in order to locate the folder results have been stored in (folder is based on date of visit occurrence)
    let visits = await db.get_visit(visit_id);
    let visit = visits[0];
    return new Promise((fulfill, reject) => {
      let d_dir = data_dir(date_folder(moment(visit.time_actioned)), visit.visit_id);
      let zippath = path.join(d_dir, "files.tar.gz");
      let tmpdir = "/tmp/periscope";
      let tmpvisitdir = `/tmp/periscope/${visit_id}`;
        
      // use a folder in /tmp - file should be cleaned up after download but this will make sure it doesn't persist forever
      if (!fs.existsSync(tmpdir)) {
        fs.mkdirSync(tmpdir);
      }

      // make a directory specific to this visit - unlikely that two users would be downloading the same file ID from different
      // visits simultaneously but better safe than sorry
      if (!fs.existsSync(tmpvisitdir)) {
        fs.mkdirSync(tmpvisitdir);
      }

      exec(`tar zxf ${zippath} -C ${tmpvisitdir} ${file_id}`, (err, stdout, stderr) => {
        if (err) {
          let errmsg = `Problem extracting object ${file_id} from archive ${zippath}`;
          logger.error(null, {message: errmsg, action: "ExtractSavedFile exec tar"});
          logger.error(null, {message: err.message, action: "ExtractSavedFile exec tar"});
          reject(err.message);
        } else {  
          let fpath = path.join(tmpvisitdir, `${file_id}`);  
          let details = {
            path: fpath,
            name: `${visit.visit_id}_${file_id}`
          }
          
          let detailstr = JSON.stringify(details);
          
          logger.info(null, {message: `Returning extracted file info: ${detailstr}`, action: "ExtractSavedFile exec tar", path: fpath});
          fulfill(details);
        }
      });
    });
  },
  FilesArchive: async function(visit_id) {
    logger.debug(null, {message: "FilesArchive called", action: "FilesArchive"});
    // get path for archive for a visit; we need to load the info from the visit_id 
    // in order to locate the folder results have been stored in (folder is based on date of visit occurrence)
    let visits = await db.get_visit(visit_id);
    let visit = visits[0];
    return new Promise((fulfill, reject) => {
      let d_dir = data_dir(date_folder(moment(visit.time_actioned)), visit.visit_id);
      let zippath = path.join(d_dir, "files.tar.gz");
      fulfill({path: zippath, name: `visit_${visit.visit_id}_files.tar.gz`});
    });
  },
  VisitCreateNew: async function (target_id, devname) {
    logger.debug(null, {message: "VisitCreateNew called", action: "VisitCreateNew"});
    // for an exisitng target, visit again (by default this uses the original device settings)
    return VisitCreate(target_id, devname)
    .then((visit) => {
      visit = VisitRun(visit[0].visit_id)
      return visit;
    });
  },
  VisitList: async function(pagesize=20, page=1) {
    return await db.list_visits(perPage=pagesize, currentPage=page);
  },
  VisitRun: VisitRun,
  VisitBase: async function(visit_id) {
    let visits = await db.get_visit(visit_id);
    return visits[0];
  },
  VisitShow: async function(visit_id) {
    let resultp = new Promise((fulfill) => {
      db.get_visit_results(visit_id)
      .then(([requests, responses, dfpm_detections]) => {
        let results = stitch_results(requests, responses);
        fulfill({results, dfpm_detections});
      });
    });

    let visitp = new Promise((fulfill) => {
      db.get_visit(visit_id)
      .then((visitrows) => {
        let visit = visitrows[0];
        let d_dir = data_dir(date_folder(moment(visit.time_actioned)), visit.visit_id);
        let logpath = path.join(d_dir, "error.log");
        let logdata = null; 
        
        if (fs.existsSync(logpath)) {
          logdata = fs.readFileSync(logpath, 'utf-8').split('\n');
        }

        fulfill({visit, logdata});
      });
    });

    let [resultdata, visitdata] = await Promise.all([resultp, visitp]);

    return { visit: visitdata.visit, results: resultdata.results, fingerprinting: resultdata.dfpm_detections, logdata: visitdata.logdata }
  },
  RequestSearch: async function(searchstring, perPage=20, currentPage=1) {
    // needs improvement. lots of improvement.
    /*
    let rqs = db.search_requests(searchstring, perPage, currentPage);
    let rsps = db.search_responses(searchstring, perPage, currentPage);

    Promise.all([rqs, rsps])
    .then(([a, b]) => {

    });
    
    return db.search_requests_and_responses(searchstring, perPage, currentPage);
    */
    return db.search_trgm_indexes(searchstring, perPage, currentPage);
  },
  TargetAdd: async function(submitted_url, devname) {
    logger.debug(null, {message: "TargetAdd called", action: "TargetAdd"});
    let parsed = new URL(submitted_url);
    logger.info(parsed);
    if (parsed.protocol && ["http:", "https:", "data:"].indexOf(parsed.protocol) < 0) {
      logger.error(null, {message: `Invalid protocol supplied in URL "${submitted_url}"`, action: "TargetAdd"});
      throw {message: "Invalid protocol"};
    } else if (!parsed.protocol) {
      // reject if no protocol
      logger.error(null, {message: `No protocol supplied in URL "${submitted_url}"`, action: "TargetAdd"});
      throw {message: "Protocol is missing"};
    }

    let submittime = moment();
    let target = await db.add_target(submitted_url, submittime);
    
    if (!target) {
      throw {message: "Creation of target entry failed"};
    } else {
      target = target[0];
    }

    logger.debug(null, {message: `Creating visit from target ${target.target_id}`, action: "TargetAdd"});
    let visit = await VisitCreate(target.target_id, devname);

    if (!visit) {
      throw {message: "Creation of visit entry failed"};
    } else {
      visit = visit[0];
      visit = VisitRun(visit.visit_id);
    }

    return visit;
  },
  TargetList: async function(pagesize=20, page=1) {
    return await db.list_targets(perPage=pagesize, currentPage=page);
  },
  TargetVisits: async function(target_id, pagesize=20, page=1) {
    return await db.list_target_visits(target_id, perPage=pagesize, page=page);
  }
}
