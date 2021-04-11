let options_data = require("./options_data");
let fs = require('fs');

let setopts = function(section, item, value) {
	let options_data_old = Object(options_data);
	options_data[section][item] = value;
	try {
		fs.renameSync("/usr/local/unsafehex/periscope/api/lib/options_data.json", "/usr/local/unsafehex/periscope/api/lib/options_data.json.bak");
		fs.writeFileSync("/usr/local/unsafehex/periscope/api/lib/options_data.json", JSON.stringify(options_data, null, 2));
		let out = {message: "options file updated", action: "options.set", status: "success"};
		return out;
	} catch (err) {
		let out = {message: `error writing options file: ${err.message}; aborting`, action: "options.set", status:"fail"};
		options_data = options_data_old;
		fs.writeFileSync("/usr/local/unsafehex/periscope/api/lib/options_data.json", JSON.stringify(options_data_old));
		throw(out);
	}
}

let getopts = function(section, item) {
	if (item!=null) {
		return options_data[section][item];
	} else {
		return options_data[section];
	}
	
}

module.exports = {
	options: options_data,
	set: setopts,
	get: getopts
};