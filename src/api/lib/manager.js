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
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
}

let response_add_data = function(request_time, request, response, result, errorlog) {
  let request_url = request.url();
  let request_method = request.method();
  let request_headers = [];
  let request_post_data = '';
  let response_headers = [];
  let response_size = null;
  let response_body = null;
  let response_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
  let response_code = null;

  try {
    request_headers = request.headers();
  } catch (err) {
    LogMessage(errorlog, `Unable to add request headers: ${err.message}`);

    console.error("Unable to add request headers");
    console.error(err.message);
  }

  try {
    request_post_data = (typeof request.postData() === 'undefined') ? null : request.postData();
  } catch (err) {
    LogMessage(errorlog, `Unable to add POST data: ${err.message}`);
    console.error("Unable to add POST data");
    console.error(err.message);
  }

  try {
    response_code = response.statusCode;
  } catch (err) {
    LogMessage(errorlog, `Unable to add response code: ${err.message}`);
    console.error("Unable to add response code");
    console.error(err.message);
  }

  try {
    response_headers = response.headers;
  } catch (err) {
    LogMessage(errorlog, `Unable to add response headers: ${err.message}`);
    console.error("Unable to add response headers");
    console.error(err.message);
  }

  try {
    response_size = (typeof response_headers["content-length"] === 'undefined') ? null : response_headers["content-length"];
  } catch (err) {
    LogMessage(errorlog, `Unable to add response size: ${err.message}`);
    console.error("Unable to add response size");
    console.error(err.message);
  }

  try {
    response_body = response.body;
  } catch (err) {
    LogMessage(errorlog, `Unable to add response body: ${err.message}`);
    console.error("Unable to add response body");
    console.error(err.message);
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
}

let VisitTarget = async function(visit) {
  const browser = await stager.getPuppet();
  const page = await browser.newPage();

  try {
    // simulate the options chosen (defaults to a desktop-like defined by periscopeDefaultDevice)
    page.emulate(visit.settings);

    const result = [];
    const dfpm_detections = [];
    let dfpm_info_count = 0;
    await page.setRequestInterception(true);


    page.on("request", request => {
      // capture information about requests and responses
      const request_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

      request_client({
        uri: request.url(),
        resolveWithFullResponse: true,
        simple: false,
        rejectUnauthorized: false,
        strictSSL: false,
        insecure: true,
        
      }).then(response => {
        response_add_data(request_time, request, response, result, visit.errorlog);

        request.continue();
      }).catch(error => {
        LogMessage(visit.errorlog, `Error in request client: ${error.message}`);
        console.error("Hit catch for request client");
        console.error(error.message);

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

        try {
          result_obj.request_post_data = (typeof request.postData() === 'undefined') ? null : request.postData();
        } catch (err) {
          LogMessage(visit.errorlog, `Unable to add POST data: ${err.message}`);
          console.error("Unable to add POST data");
          console.error(err.message);
        }

        try {
          result_obj.response_code = response.statusCode;
        } catch (err) {
          LogMessage(visit.errorlog, `Unable to add response code: ${err.message}`);
          console.error("Unable to add response code");
          console.error(err.message);
        }

        try {
          result_obj.response_headers = response.headers;
        } catch (err) {
          LogMessage(visit.errorlog, `Unable to add response headers: ${err.message}`);
          console.error("Unable to add response headers");
          console.error(err.message);
        }

        try {
          result_obj.response_size = (typeof response_headers["content-length"] === 'undefined') ? null : response_headers["content-length"];
        } catch (err) {
          LogMessage(visit.errorlog, `Unable to add response size: ${err.message}`);
          console.error("Unable to add response size");
          console.error(err.message);
        }

        try {
          result_obj.response_body = response.body;
        } catch (err) {
          LogMessage(visit.errorlog, `Unable to add response body: ${err.message}`);
          console.error("Unable to add response body");
          console.error(err.message);
        }

        result_obj.response_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

        LogMessage(visit.errorlog, `Aborting request for ${request.url()}`)
        console.error("Aborting request");
        request.abort();

        result.push(result_obj);
      });
    });

    page.on('console', msg => {
      if (msg._type == "log") {
        // some messages are not DFPM detections - don't want to break if we get any
        // but still output to error log in case of something useful
        try {
          let evt = JSON.parse(msg._text);
          if (evt.level == "warning" || evt.level == "danger") {
            // capture events that DFPM flags as suspicious
            dfpm_detections.push(
              {
                visit_id: visit.visit_id,
                method: evt.method,
                dfpm_path: evt.path,
                dfpm_level: evt.level,
                dfpm_category: evt.catevory,
                dfpm_url: evt.url,
                dfpm_raw: evt
              }
            );
          } else if (evt.level == "info") {
            dfpm_info_count += 1;
          }
        } catch (err) {
          LogMessage(visit.errorlog, `Error in page.on('console'): ${err.message}`);
          console.error("Error in page.on('console')");
          console.error(msg._text);
          console.error(err.message);
        }
      }
    });

    const response = await page.goto(
      visit.query, 
      {
        waitUntil: "networkidle0",
        referrer: "https://www.bing.com"
      }
    );

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
      console.log(`${archive.pointer()} total bytes written to archive for visit ${visit.visit_id}`);
    });

    archive.on("error", function(err) {
      LogMessage(visit.errorlog, `Error archiving files: ${err.message}`);
      throw err;
    });

    archive.pipe(outfiles);

    result.forEach((r, idx) => {
      // tag file IDs into the output
      r.file_id = idx;

      if (r.response_body === undefined || r.response_body === null) {
        r.response_body = '';
      }
      archive.append(r.response_body, {name: `${idx}`});
    });

    archive.finalize();

    let imagedir = images_folder(moment(visit.time));

    let screenshot_file_path = path.join(imagedir, `${visit.visit_id}.png`);
    let screenshot_window_path = path.join(imagedir, `${visit.visit_id}_thumb.png`);
    let screenshot_uri_path = path.join(images_uri(moment(visit.time)), `${visit.visit_id}.png`);

    // generate window view and convert it to thumbnail
    await page.screenshot({path: screenshot_window_path});
    gm(screenshot_window_path)
    .resize(null, 250)
    .write(screenshot_window_path, function(err) {
      if (err) {
        LogMessage(visit.errorlog, `Failed to write thumbnail for ${visit.visit_id}: ${err.message}`);
        console.error(`Failed to write thumbnail for ${visit.visit_id}: ${err.message}`);
      }
    });

    // generate screenshot of entire page
    await page.screenshot({path: screenshot_file_path, fullPage: true});

    // allow time before exiting browser process for fingerprint detection to generate results
    await dfpm.sleep(10*1000);
    await page.close();

    await db.mark_complete(visit.visit_id);
    console.log(`DFPM logged ${dfpm_info_count} info level events for visit ${visit.visit_id}`);

    return [result, dfpm_detections, screenshot_uri_path];
  } catch (err) {
    // make sure the browser is always closed even if stuff breaks - otherwise leaves hung puppeteer threads indefinitely
    await page.close();
    throw(err);
  }
}

let LogMessage = async function(logfile, message) {
  let ts = moment().format("YYYY-MM-DD HH:mm:ss");
  message = `${ts} - ${message}`;
  fs.appendFile(logfile, message + "\n", function (e) {
  });
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
    console.log(`Images for visit ${visit.visit_id} being stored in ${images_dir}`);

    if (!fs.existsSync(images_dir)) {
      fs.mkdirSync(images_dir);
    }

    await db.set_actioned_time(visit.visit_id, action_time);
    console.log(`Visit ${visit.visit_id} actioned at ${action_time}`);
    VisitTarget(visit)
    .then(([requests, dfpm_detections, screenshot_uri_path]) => {
      db.add_requests(requests, visit.visit_id)
      .then(([req_inserts, resp_inserts]) => {
        console.log(`Inserted ${req_inserts} requests and ${resp_inserts} responses for visit ${visit.visit_id}`);
        console.log(`Setting visit ${visit.visit_id} screenshot path value to ${screenshot_uri_path}`);
        db.set_screenshot_path(screenshot_uri_path, visit.visit_id)
        .catch((err) => {
          console.error(`Error setting screenshot path: ${err.message}`);
        });
      });
      db.add_dfpm(dfpm_detections);
    }).catch((err) => {
      LogMessage(visit.errorlog, err.message);
      console.error(`Encountered error processing visit ${visit.visit_id}; wrote to log`);
      console.error(err.message);
    });

    return action_time;
  } catch(err) {
    console.error("Error in function Visit");
    console.error(err.message);
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
  return await db.get_visit(visit_id)
  .then((visit) => {
    if (visit) {
      visit = visit[0];
    } else {
      throw `No visit found with id ${visit_id}`;
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
    requests: {}
  };

  // iterate through all the requests; in each iteration, create an object containing both
  // request headers and their related responses, linked by the request_id
  reqs.forEach((req_header) => {
    if (req_header.request_id in data.requests) {
      // if we have already initialised the object for this request, just add the header to it
      // headers are stored as an array because HTTP allows for repeat/duplicate headers
      data.requests[req_header.request_id].request_headers.push({[req_header.header_name]: req_header.header_value});
    } else {
      data.requests[req_header.request_id] = {
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
  });

  responses.forEach((resp_header) => {
    // now that requests strucutre is created, responses can be added in to it
    if (data.requests[resp_header.request_id].response_time === null) {
      data.requests[resp_header.request_id].response_time = resp_header.response_time;
      data.requests[resp_header.request_id].file_id = typeof(resp_header.file_id) == "undefined" ? null : resp_header.file_id;
      data.requests[resp_header.request_id].response_size = resp_header.response_size;
      data.requests[resp_header.request_id].response_code = resp_header.response_code;
    }
    
    // again, repeat headers are a possibility
    if (resp_header.header_name) {
      data.requests[resp_header.request_id].response_headers.push({[resp_header.header_name]: resp_header.header_value});  
    }
  });

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
          console.error(`Problem extracting object ${file_id} from archive ${zippath}`);
          console.error(err.message);
          reject(err.message);
        } else {    
          let details = {
            path: path.join(tmpvisitdir, `${file_id}`),
            name: `${visit.visit_id}_${file_id}`
          }

          fulfill(details);
        }
      });
    });
  },
  FilesArchive: async function(visit_id) {
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
        let errorlog = path.join(d_dir, "error.log");
        let errors = null; 
        
        if (fs.existsSync(errorlog)) {
          errors = fs.readFileSync(errorlog, 'utf-8').split('\n');
        }

        fulfill({visit, errors});
      });
    });

    /*
    let [requests, responses, dfpm_detections] = await db.get_visit_results(visit_id);
    let results = stitch_results(requests, responses);
    let visit = await db.get_visit(visit_id);
    let d_dir = data_dir(date_folder(moment(visit.time_actioned)), visit.visit_id);
    let errorlog = path.join(d_dir, "error.log");
    let errors = fs.readFileSync(errorlog);
    */

    let [resultdata, visitdata] = await Promise.all([resultp, visitp]);

    return { visit: visitdata.visit, results: resultdata.results, fingerprinting: resultdata.dfpm_detections, errors: visitdata.errors }
  },
  RequestSearch: async function(searchstring, perPage=20, currentPage=1) {
    // needs improvement. lots of improvement.
    return db.search_requests_and_responses(searchstring, perPage, currentPage);
  },
  TargetAdd: async function(submitted_url, devname) {
    let parsed = url.parse(submitted_url);
    if (parsed.protocol && ["http:", "https:", "data:"].indexOf(parsed.protocol) < 0) {
        throw "Invalid protocol";
    }

    let submittime = moment();
    let target = await db.add_target(submitted_url, submittime);
    
    if (!target) {
      throw "Creation of target entry failed";
    } else {
      target = target[0];
    }

    let visit = await VisitCreate(target.target_id, devname);

    if (!visit) {
      throw "Creation of visit entry failed";
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
    return await db.list_target_visits(target_id, perPage=pagesize);
  }
}
