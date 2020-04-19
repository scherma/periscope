const url = require("url");
const puppeteer = require("puppeteer");
const request_client = require("request-promise-native");
const db = require("./database");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const gm = require("gm");
const { exec } = require("child_process");
const dfpm = require("./DFPM/dfpm.js");

let VisitTarget = async function(visit) {
  const browser = await puppeteer.launch({args: ["--ignoreHTTPSErrors", "--remote-debugging-port=9222"]});
  const page = await browser.newPage();

  // inject fingerprint detection code
  await dfpm.flipTheSwitch("127.0.0.1", 9222, true, false);
  // allow time for it to load
  await dfpm.sleep(5*1000);

  // simulate a desktop display and browser
  page.setViewport({width: 1903, height: 1064, deviceScaleFactor: 1, isLandscape: true});
  page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");

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
    }).then(response => {
      const request_url = request.url();
      const request_headers = request.headers();
      const request_post_data = (typeof request.postData() === 'undefined') ? null : request.postData();
      const response_headers = response.headers;
      const response_size = (typeof response_headers["content-length"] === 'undefined') ? null : response_headers["content-length"];
      const response_body = response.body;
      const response_time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");

      result.push({
        request_url,
        request_headers,
        request_post_data,
        request_time,
        response_headers,
        response_size,
        response_body,
        response_time,
        file_id: null
      });

      request.continue();
    }).catch(error => {
      console.error(error.message);
      request.abort();
      result.push({
        request_url: request.url(),
        request_time: request_time,
        request_post_data: '',
        request_headers: null,
        response_headers: null,
        response_size: null,
        response_body: null,
        response_time: null,
        file_id: null
      });
    });
  });

  page.on('console', msg => {
    if (msg._type == "log") {
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

      }
    }
  });

  page.on('message', msg => {
    if (msg._type == "log") {
      console.log(msg._text);
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
        console.error(err);
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
      console.error(`Failed to write thumbnail for ${visit.visit_id}: ${err.message}`);
    }
  });
  
  // generate screenshot of entire page
  await page.screenshot({path: screenshot_file_path, fullPage: true});

  // allow time before exiting browser process for fingerprint detection to generate results
  await dfpm.sleep(10*1000);
  await browser.close();

  await db.mark_complete(visit.visit_id);
  console.log(`DFPM logged ${dfpm_info_count} info level events for visit ${visit.visit_id}`);

  return [result, dfpm_detections, screenshot_uri_path];
}


let Visit = async function(visit) {
  try {
    let action_time = moment();

    let date_path = date_folder(action_time);
    
    if (!fs.existsSync(date_path)) {
      fs.mkdirSync(date_path);
    }

    let d_dir = data_dir(date_path, visit.visit_id);

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
      let errorlog = path.join(d_dir, "error.log");
      fs.appendFile(errorlog, err.message + "\n", function (e) {
        console.error(`Encountered error processing visit ${visit.visit_id}; wrote to log`);
        console.error(err.message);
      });
    });

    return action_time;
  } catch(err) {
    console.error(err.message);
    throw(err);
  }
}

let VisitCreate = async function(target_id) {    
  let submittime = moment();

  let visit = await db.add_visit(target_id, submittime);

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

  reqs.forEach((req_header) => {
    if (req_header.request_id in data.requests) {
      // if we have already initialised the object for this request, just add the header to it
      // headers are stored as an array because HTTP allows for repeat/duplicate headers
      data.requests[req_header.request_id].request_headers.push({[req_header.header_name]: req_header.header_value});
    } else {

      data.requests[req_header.request_id] = {
        request_time: req_header.request_time,
        request_url: req_header.request_url,
        request_post_data: req_header.request_post_data,
        request_headers: [{[req_header.header_name]: req_header.header_value}],
        file_id: null,
        response_time: null,
        response_size: null,
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
    }
    
    if (resp_header.header_name) {
      data.requests[resp_header.request_id].response_headers.push({[resp_header.header_name]: resp_header.header_value});  
    }
  });

  return data;
}

module.exports = {
  ExtractSavedFile: async function(visit_id, file_id) {
    // unarchive a specific requested file so that it can be downloaded
    let visits = await db.get_visit(visit_id);
    let visit = visits[0];
    return new Promise((fulfill, reject) => {
      let d_dir = data_dir(date_folder(moment(visit.time_actioned)), visit.visit_id);
      let zippath = path.join(d_dir, "files.tar.gz");
      let tmpdir = "/tmp/periscope";
        
      if (!fs.existsSync(tmpdir)) {
        fs.mkdirSync(tmpdir);
      }
      exec(`tar zxf ${zippath} -C ${tmpdir} ${file_id}`, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          throw err;
        } else {    
          let details = {
            path: path.join(tmpdir, `${file_id}`),
            name: `${visit.visit_id}_${file_id}`
          }

          fulfill(details);
        }
      });
    });
  },
  FilesArchive: async function(visit_id) {
    // get path for archive for a visit
    let visits = await db.get_visit(visit_id);
    let visit = visits[0];
    return new Promise((fulfill, reject) => {
      let d_dir = data_dir(date_folder(moment(visit.time_actioned)), visit.visit_id);
      let zippath = path.join(d_dir, "files.tar.gz");
      fulfill({path: zippath, name: `visit_${visit.visit_id}_files.tar.gz`});
    });
  },
  VisitCreateNew: async function (target_id) {
    // for an exisitng target, visit again
    return VisitCreate(target_id)
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
    let [requests, responses, dfpm_detections] = await db.get_visit_results(visit_id);
    let results = stitch_results(requests, responses);
    let visits = await db.get_visit(visit_id);
    return { visit: visits[0], results: results, fingerprinting: dfpm_detections }
  },
  RequestSearch: async function(searchstring) {
    // needs improvement. lots of improvement.
    return Promise.all([db.search_requests(searchstring), db.search_responses(searchstring)]);
  },
  TargetAdd: async function(submitted_url) {
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

    let visit = await VisitCreate(target.target_id);

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
