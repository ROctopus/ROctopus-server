module.exports = {
  genID: function() {
    // This function generates a unique job identifier based on the current time
    // get current time in microseconds
    var st = process.hrtime().toString().replace(",", "");
    // add random component
    var st2 = st + "-" + Math.random().toString().replace("0.", "").substr(0, 5);
    // base64 encode
    bu = new Buffer(st2, "binary");
    return bu.toString("base64");
  }
}
